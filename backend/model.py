"""
model.py — Fixed version
- Loads XGBoost model + threshold from layer1_meta.json
- Uses SHAP TreeExplainer for real feature attribution (not fake if-statements)
- Returns human-readable top signals grounded in actual model logic
"""

import json
import os
import numpy as np
import pandas as pd
import shap
import joblib
from dotenv import load_dotenv

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

# Human-readable labels for each feature
FEATURE_LABELS = {
    "amount_log":            "Unusual transaction amount (log scale)",
    "amount_zscore":         "Amount far from user's typical spending",
    "is_high_amount":        "Amount significantly above user average",
    "velocity_1h":           "High number of transactions in last hour",
    "velocity_24h":          "High number of transactions in last 24h",
    "is_burst":              "Burst pattern detected (5+ txns/hour)",
    "dist_from_home_km":     "Transaction far from home region",
    "is_far_from_home":      "Transaction outside home region (>500km)",
    "travel_speed_kmh":      "Physically impossible travel speed",
    "is_impossible_travel":  "Impossible travel between transactions",
    "hour":                  "Transaction at unusual hour",
    "is_night":              "Transaction during night hours",
    "day_of_week":           "Unusual day of week activity",
    "is_weekend":            "Weekend transaction pattern",
    "hour_deviation":        "Activity outside preferred time window",
    "night_x_highamt":       "High amount combined with night activity",
    "burst_x_highamt":       "High amount combined with burst pattern",
    "far_x_speed":           "Geographic anomaly with speed violation",
    "night_x_burst_x_amt":   "Combined night + burst + high amount signal",
}


def _load():
    model_path = os.getenv("MODEL_PATH", "layer1_model.pkl")
    meta_path  = os.getenv("META_PATH",  "layer1_meta.json")

    model = joblib.load(model_path)
    with open(meta_path) as f:
        meta = json.load(f)

    threshold = meta["threshold"]

    # Build SHAP explainer once at startup — expensive to create, cheap to call
    explainer = shap.TreeExplainer(model)

    print(f"[✓] Model loaded | threshold={threshold:.4f}")
    print(f"[✓] SHAP TreeExplainer ready")
    return model, threshold, explainer


model, THRESHOLD, explainer = _load()


def _shap_signals(X_df: pd.DataFrame, n: int = 3) -> list[str]:
    """
    Run SHAP on one transaction and return the top-n features that
    pushed the score UP (positive SHAP = toward fraud).
    These are grounded in the actual model weights — not if-statements.
    """
    shap_values = explainer.shap_values(X_df)

    # shap_values shape: (1, n_features)
    vals   = shap_values[0]
    labels = FEATURE_COLS

    # Pair each feature with its SHAP value, keep only positive contributors
    pairs = sorted(zip(vals, labels), key=lambda x: x[0], reverse=True)
    MEANINGFUL_THRESHOLD = 0.05
    top = [(v, l) for v, l in pairs if v > MEANINGFUL_THRESHOLD][:n]
    if not top:
        return ["Score driven by combined low-level signals"]

    return [FEATURE_LABELS.get(label, label) for _, label in top]


def predict(features: dict) -> dict:
    X = pd.DataFrame([features])[FEATURE_COLS]

    prob      = float(model.predict_proba(X)[0][1])
    predicted = prob >= THRESHOLD

    # Risk tier
    if prob < 0.40:
        risk_level = "LOW"
    elif prob < THRESHOLD:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Real SHAP-based signals
    top_signals = _shap_signals(X, n=3)

    return {
        "fraud_probability": round(prob, 4),
        "fraud_predicted":   predicted,
        "threshold_used":    THRESHOLD,
        "risk_level":        risk_level,
        "top_signals":       top_signals,
    }