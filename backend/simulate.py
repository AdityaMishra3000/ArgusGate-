"""
simulate.py — v3
Fixes:
  1. Legit transactions generated near user's preferred hour (not random 3am)
  2. Hard $5 minimum amount floor
  3. review_floor raised to reduce false positives in demo
  4. Timestamps spread across past 7 days (not 24h) for realism
"""

import json
import math
import random
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from features import engineer_features, haversine_km
from model import predict


# ── Location helpers ──────────────────────────────────────────────────────────

def _nearby(lat, lon, radius_km=40):
    r = radius_km / 111.0
    return lat + random.uniform(-r, r), lon + random.uniform(-r, r)


def _far(lat, lon, min_km=2000):
    for _ in range(50):
        nlat = random.uniform(20.0, 55.0)
        nlon = random.uniform(-100.0, 30.0)
        if haversine_km(lat, lon, nlat, nlon) >= min_km:
            return nlat, nlon
    return lat + 20.0, lon + 20.0


def _legit_ts(profile: dict, base_ts: datetime) -> datetime:
    """
    Keep the date from base_ts but set the hour near the user's
    preferred transaction hour (±2h jitter). This prevents legit
    transactions from landing at 3 AM and triggering ATO signals.
    """
    pref_hour = int(profile.get("preferred_hour_mu", 13))
    jitter    = random.randint(-2, 2)
    hour      = max(6, min(22, pref_hour + jitter))   # keep between 6am-10pm
    return base_ts.replace(
        hour=hour,
        minute=random.randint(0, 59),
        second=random.randint(0, 59),
    )


# ── Transaction generators ────────────────────────────────────────────────────

def _legit_txn(profile: dict, base_ts: datetime) -> dict:
    lat, lon   = _nearby(profile["home_lat"], profile["home_lon"], radius_km=30)
    min_amount = max(5.0, profile["avg_amount"] * 0.15)   # hard $5 floor
    amount     = max(min_amount, round(
        random.gauss(profile["avg_amount"], profile["std_amount"] * 0.5), 2
    ))   # halved std so legit amounts cluster more realistically
    ts = _legit_ts(profile, base_ts)
    return {"amount": amount, "lat": lat, "lon": lon, "timestamp": ts}


def _fraud_txn(profile: dict, base_ts: datetime, fraud_type: str) -> dict:
    if fraud_type == "velocity":
        lat, lon = _nearby(profile["home_lat"], profile["home_lon"], radius_km=5)
        amount   = round(random.uniform(5, 80), 2)
        ts       = base_ts

    elif fraud_type == "location":
        lat, lon = _far(profile["home_lat"], profile["home_lon"])
        amount   = round(np.random.lognormal(mean=4.5, sigma=0.5), 2)
        ts       = base_ts

    elif fraud_type == "high_value":
        lat, lon = _nearby(profile["home_lat"], profile["home_lon"], radius_km=50)
        amount   = round(profile["avg_amount"] * random.uniform(12, 40), 2)
        ts       = base_ts

    elif fraud_type == "ato":
        lat, lon = _nearby(profile["home_lat"], profile["home_lon"], radius_km=150)
        amount   = round(profile["avg_amount"] * random.uniform(4, 10), 2)
        # ATO = deliberate off-hours activity
        ts = base_ts.replace(
            hour=random.choice([1, 2, 3, 4]),
            minute=random.randint(0, 59),
        )

    else:  # combo
        lat, lon = _far(profile["home_lat"], profile["home_lon"], min_km=1000)
        amount   = round(profile["avg_amount"] * random.uniform(5, 15), 2)
        ts = base_ts.replace(
            hour=random.choice([0, 1, 2, 3]),
            minute=random.randint(0, 59),
        )

    return {"amount": amount, "lat": lat, "lon": lon, "timestamp": ts}


FRAUD_TYPES = ["velocity", "location", "high_value", "ato", "combo"]


# ── Three-tier routing ────────────────────────────────────────────────────────

def _route(prob: float, threshold: float) -> str:
    """
    AUTO_BLOCKED   → prob >= threshold            confident fraud
    PENDING_REVIEW → prob >= threshold - 0.25     ambiguous (~58-82%)
    AUTO_APPROVED  → prob < threshold - 0.25      clearly safe
    """
    review_floor = threshold - 0.25   # ~0.57 with threshold=0.819
    if prob >= threshold:
        return "auto_blocked"
    elif prob >= review_floor:
        return "pending_review"
    else:
        return "auto_approved"


# ── Main simulation ───────────────────────────────────────────────────────────

def run_simulation(n: int, fraud_mix: float, db: Session) -> list[dict]:
    from database import Transaction, UserProfile

    profiles = db.query(UserProfile).all()
    if not profiles:
        raise ValueError("No user profiles in DB.")

    now     = datetime.utcnow()
    results = []

    n_fraud = int(n * fraud_mix)
    n_legit = n - n_fraud

    plan = (
        [("legit", None)] * n_legit +
        [("fraud", random.choice(FRAUD_TYPES)) for _ in range(n_fraud)]
    )
    random.shuffle(plan)

    for i, (kind, fraud_type) in enumerate(plan):
        profile_row = random.choice(profiles)
        profile = {
            "home_lat":          profile_row.home_lat,
            "home_lon":          profile_row.home_lon,
            "avg_amount":        profile_row.avg_amount,
            "std_amount":        profile_row.std_amount,
            "preferred_hour_mu": profile_row.preferred_hour_mu,
        }

        # Spread across past 7 days — gives richer history for velocity features
        # and avoids all transactions landing in the same hour
        days_back      = random.uniform(0, 7)
        hours_back     = random.uniform(0, 23)
        base_ts        = now - timedelta(days=days_back, hours=hours_back)

        raw = (
            _legit_txn(profile, base_ts) if kind == "legit"
            else _fraud_txn(profile, base_ts, fraud_type)
        )

        txn_dict = {
            "user_id":   profile_row.user_id,
            "timestamp": raw["timestamp"],
            "amount":    raw["amount"],
            "lat":       raw["lat"],
            "lon":       raw["lon"],
        }

        try:
            features = engineer_features(txn_dict, profile, db)
            result   = predict(features)
        except Exception as e:
            print(f"[simulate] skipped: {e}")
            continue

        status = _route(result["fraud_probability"], result["threshold_used"])

        record = Transaction(
            user_id           = profile_row.user_id,
            timestamp         = raw["timestamp"],
            amount            = raw["amount"],
            lat               = raw["lat"],
            lon               = raw["lon"],
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
        db.flush()

        results.append({
            "id":                record.id,
            "user_id":           profile_row.user_id,
            "amount":            raw["amount"],
            "timestamp":         raw["timestamp"].isoformat(),
            "fraud_probability": result["fraud_probability"],
            "risk_level":        result["risk_level"],
            "status":            status,
            "top_signals":       result["top_signals"],
            "scenario":          fraud_type or "legit",
        })

    db.commit()
    return results