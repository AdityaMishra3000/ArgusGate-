import joblib
import json
import numpy as np
import pandas as pd
from dotenv import load_dotenv
import os

load_dotenv()

FEATURE_COLS = [
    "amount_log", "amount_zscore", "is_high_amount",
    "velocity_1h", "velocity_24h", "is_burst",
    "dist_from_home_km", "is_far_from_home",
    "travel_speed_kmh", "is_impossible_travel",
    "hour", "is_night", "day_of_week", "is_weekend",
    "hour_deviation",
    "night_x_highamt", "burst_x_highamt", "far_x_speed", "night_x_burst_x_amt",
]

def load_model():
    model_path = os.getenv("MODEL_PATH", "layer1_model.pkl")
    meta_path  = os.getenv("META_PATH",  "layer1_meta.json")

    model = joblib.load(model_path)
    with open(meta_path) as f:
        meta = json.load(f)

    threshold = meta["threshold"]
    print(f"[✓] Model loaded | threshold={threshold:.3f}")
    return model, threshold

model, THRESHOLD = load_model()

def predict(features: dict) -> dict:
    X = pd.DataFrame([features])[FEATURE_COLS]
    prob      = float(model.predict_proba(X)[0][1])
    predicted = prob >= THRESHOLD

    # risk level bucketing
    if prob < 0.4:
        risk_level = "LOW"
    elif prob < 0.75:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # human-readable top signals
    signals = []
    if features["is_far_from_home"]:       signals.append("Transaction far from home location")
    if features["travel_speed_kmh"] > 800: signals.append("Impossible travel speed detected")
    if features["is_burst"]:               signals.append("Unusual burst of transactions")
    if features["is_high_amount"]:         signals.append("Amount significantly above user average")
    if features["is_night"]:               signals.append("Transaction at unusual hour")
    if features["hour_deviation"] > 6:     signals.append("Outside normal transaction hours")
    if features["velocity_1h"] > 3:        signals.append(f"{features['velocity_1h']} transactions in last hour")
    if not signals:                        signals.append("Mild anomaly across multiple signals")

    return {
        "fraud_probability": round(prob, 4),
        "fraud_predicted":   predicted,
        "threshold_used":    THRESHOLD,
        "risk_level":        risk_level,
        "top_signals":       signals[:3],   # top 3 only
    }