from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd

from database import get_db, init_db, Transaction
from schemas import TransactionInput, PredictionResponse, TransactionRecord
from features import engineer_features
from model import predict

app = FastAPI(title="FinShield Layer 1", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    # load user profiles into memory once
    import os, json
    global USER_PROFILES
    profiles_path = os.getenv("PROFILES_PATH", "user_profiles.csv")
    df = pd.read_csv(profiles_path, index_col="user_id")
    USER_PROFILES = df.to_dict(orient="index")
    print(f"[✓] Loaded {len(USER_PROFILES)} user profiles")

@app.get("/health")
def health():
    return {"status": "ok", "service": "FinShield Layer 1"}

@app.post("/predict", response_model=PredictionResponse)
def predict_transaction(txn: TransactionInput, db: Session = Depends(get_db)):
    user_id = txn.user_id

    if user_id not in USER_PROFILES:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    profile  = USER_PROFILES[user_id]
    features = engineer_features(txn.dict(), profile, db)
    result   = predict(features)

    # persist to DB
    record = Transaction(
        user_id              = user_id,
        timestamp            = txn.timestamp,
        amount               = txn.amount,
        lat                  = txn.lat,
        lon                  = txn.lon,
        amount_log           = features["amount_log"],
        amount_zscore        = features["amount_zscore"],
        velocity_1h          = features["velocity_1h"],
        dist_from_home_km    = features["dist_from_home_km"],
        travel_speed_kmh     = features["travel_speed_kmh"],
        hour                 = features["hour"],
        is_night             = bool(features["is_night"]),
        hour_deviation       = features["hour_deviation"],
        fraud_probability    = result["fraud_probability"],
        fraud_predicted      = result["fraud_predicted"],
        threshold_used       = result["threshold_used"],
    )
    db.add(record)
    db.commit()

    return PredictionResponse(user_id=user_id, **result)

@app.get("/transactions", response_model=list[TransactionRecord])
def get_transactions(limit: int = 50, db: Session = Depends(get_db)):
    txns = (
        db.query(Transaction)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
        .all()
    )
    # attach risk_level dynamically
    for t in txns:
        if t.fraud_probability < 0.4:     t.risk_level = "LOW"
        elif t.fraud_probability < 0.75:  t.risk_level = "MEDIUM"
        else:                             t.risk_level = "HIGH"
    return txns

@app.get("/transactions/{user_id}", response_model=list[TransactionRecord])
def get_user_transactions(user_id: int, db: Session = Depends(get_db)):
    txns = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.timestamp.desc())
        .all()
    )
    for t in txns:
        if t.fraud_probability < 0.4:     t.risk_level = "LOW"
        elif t.fraud_probability < 0.75:  t.risk_level = "MEDIUM"
        else:                             t.risk_level = "HIGH"
    return txns