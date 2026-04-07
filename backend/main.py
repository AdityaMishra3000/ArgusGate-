import json
import os
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db, init_db, Base, engine, Transaction, UserProfile
from schemas import (
    TransactionInput, PredictionResponse, TransactionRecord,
    SimulateRequest, DecisionRequest,
)
from features import engineer_features
from model import predict, explainer, FEATURE_COLS, FEATURE_LABELS
from simulate import run_simulation


app = FastAPI(title="FinShield Layer 1", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()  # creates all tables including UserProfile and Transaction

    db = next(get_db())
    try:
        if db.query(UserProfile).count() == 0:
            profiles_path = os.getenv("PROFILES_PATH", "user_profiles.csv")
            if os.path.exists(profiles_path):
                df = pd.read_csv(profiles_path, index_col="user_id")
                for uid, row in df.iterrows():
                    db.add(UserProfile(
                        user_id              = int(uid),
                        home_lat             = float(row.get("home_lat", 0)),
                        home_lon             = float(row.get("home_lon", 0)),
                        avg_amount           = float(row.get("avg_amount", 75)),
                        std_amount           = float(row.get("std_amount", 30)),
                        preferred_hour_mu    = float(row.get("preferred_hour_mu", 13)),
                        preferred_hour_sigma = float(row.get("preferred_hour_sigma", 2)),
                        avg_daily_txns       = int(row.get("avg_daily_txns", 2)),
                    ))
                db.commit()
                print(f"[✓] Seeded {len(df)} profiles into Postgres")
            else:
                print(f"[!] user_profiles.csv not found at {profiles_path}")
        else:
            count = db.query(UserProfile).count()
            print(f"[✓] User profiles already in DB ({count} rows)")
    finally:
        db.close()


def _get_profile(user_id: int, db: Session) -> dict:
    p = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not p:
        raise HTTPException(404, f"User {user_id} not found")
    return {
        "home_lat":          p.home_lat,
        "home_lon":          p.home_lon,
        "avg_amount":        p.avg_amount,
        "std_amount":        p.std_amount,
        "preferred_hour_mu": p.preferred_hour_mu,
    }


def _risk(prob, threshold):
    return "HIGH" if prob >= threshold else "MEDIUM" if prob >= 0.4 else "LOW"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


@app.post("/predict", response_model=PredictionResponse)
def predict_transaction(txn: TransactionInput, db: Session = Depends(get_db)):
    from simulate import _route
    profile  = _get_profile(txn.user_id, db)
    features = engineer_features(txn.dict(), profile, db)
    result   = predict(features)
    status   = _route(result["fraud_probability"], result["threshold_used"])

    record = Transaction(
        user_id           = txn.user_id,
        timestamp         = txn.timestamp,
        amount            = txn.amount,
        lat               = txn.lat,
        lon               = txn.lon,
        amount_log        = features["amount_log"],
        amount_zscore     = features["amount_zscore"],
        velocity_1h       = features["velocity_1h"],
        dist_from_home_km = features["dist_from_home_km"],
        travel_speed_kmh  = features["travel_speed_kmh"],
        hour              = features["hour"],
        is_night          = bool(features["is_night"]),
        hour_deviation    = features["hour_deviation"],
        fraud_probability = result["fraud_probability"],
        fraud_predicted   = result["fraud_predicted"],
        threshold_used    = result["threshold_used"],
        status            = status,
        top_signals       = json.dumps(result["top_signals"]),
    )
    db.add(record)
    db.commit()

    return PredictionResponse(user_id=txn.user_id, status=status, **result)


@app.post("/simulate")
def simulate(req: SimulateRequest, db: Session = Depends(get_db)):
    n       = max(5, min(req.n, 200))
    results = run_simulation(n, req.fraud_mix, db)
    summary = {
        "total":          len(results),
        "auto_approved":  sum(1 for r in results if r["status"] == "auto_approved"),
        "pending_review": sum(1 for r in results if r["status"] == "pending_review"),
        "auto_blocked":   sum(1 for r in results if r["status"] == "auto_blocked"),
    }
    return {"summary": summary, "transactions": results}


@app.get("/admin/queue")
def get_review_queue(db: Session = Depends(get_db)):
    txns = (
        db.query(Transaction)
        .filter(Transaction.status == "pending_review")
        .order_by(Transaction.fraud_probability.desc())
        .all()
    )
    return [
        {
            "id":                t.id,
            "user_id":           t.user_id,
            "amount":            t.amount,
            "timestamp":         t.timestamp.isoformat() if t.timestamp else None,
            "fraud_probability": t.fraud_probability,
            "risk_level":        _risk(t.fraud_probability, t.threshold_used),
            "top_signals":       json.loads(t.top_signals) if t.top_signals else [],
            "dist_from_home_km": t.dist_from_home_km,
            "velocity_1h":       t.velocity_1h,
            "is_night":          t.is_night,
            "amount_zscore":     t.amount_zscore,
        }
        for t in txns
    ]


@app.patch("/admin/decide/{transaction_id}")
def analyst_decision(
    transaction_id: int,
    req: DecisionRequest,
    db: Session = Depends(get_db),
):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn.status != "pending_review":
        raise HTTPException(400, f"Transaction is already '{txn.status}'")
    if req.decision not in ("approve", "block"):
        raise HTTPException(400, "decision must be 'approve' or 'block'")

    txn.status      = "analyst_approved" if req.decision == "approve" else "analyst_blocked"
    txn.reviewed_by = req.analyst_id
    txn.reviewed_at = datetime.utcnow()
    txn.review_note = req.note
    db.commit()

    return {
        "id":          transaction_id,
        "status":      txn.status,
        "reviewed_by": txn.reviewed_by,
        "reviewed_at": txn.reviewed_at.isoformat(),
    }


@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows   = db.query(Transaction.status, func.count(Transaction.id)).group_by(Transaction.status).all()
    counts = {status: cnt for status, cnt in rows}
    total  = sum(counts.values())
    return {
        "total":            total,
        "auto_approved":    counts.get("auto_approved", 0),
        "pending_review":   counts.get("pending_review", 0),
        "auto_blocked":     counts.get("auto_blocked", 0),
        "analyst_approved": counts.get("analyst_approved", 0),
        "analyst_blocked":  counts.get("analyst_blocked", 0),
    }


@app.get("/transactions")
def get_transactions(limit: int = 50, db: Session = Depends(get_db)):
    txns = (
        db.query(Transaction)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":                t.id,
            "user_id":           t.user_id,
            "timestamp":         t.timestamp.isoformat() if t.timestamp else None,
            "amount":            t.amount,
            "fraud_probability": t.fraud_probability,
            "fraud_predicted":   t.fraud_predicted,
            "risk_level":        _risk(t.fraud_probability, t.threshold_used),
            "status":            t.status,
            "top_signals":       json.loads(t.top_signals) if t.top_signals else [],
        }
        for t in txns
    ]


@app.get("/explain/{transaction_id}")
def explain_transaction(transaction_id: int, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    profile  = _get_profile(txn.user_id, db)
    features = engineer_features({
        "user_id":   txn.user_id,
        "timestamp": txn.timestamp,
        "amount":    txn.amount,
        "lat":       txn.lat,
        "lon":       txn.lon,
    }, profile, db)

    X         = pd.DataFrame([features])[FEATURE_COLS]
    shap_vals = explainer.shap_values(X)[0]

    breakdown = sorted([
        {
            "feature":   f,
            "label":     FEATURE_LABELS.get(f, f),
            "value":     round(float(features[f]), 4),
            "shap":      round(float(s), 4),
            "direction": "fraud" if s > 0 else "safe",
        }
        for f, s in zip(FEATURE_COLS, shap_vals)
    ], key=lambda x: abs(x["shap"]), reverse=True)

    return {
        "transaction_id":    transaction_id,
        "fraud_probability": txn.fraud_probability,
        "risk_level":        _risk(txn.fraud_probability, txn.threshold_used),
        "shap_breakdown":    breakdown,
    }