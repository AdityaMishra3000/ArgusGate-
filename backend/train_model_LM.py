"""
Layer 1 — XGBoost Fraud Detection Model
"""

import numpy as np
import pandas as pd
import json
import warnings
warnings.filterwarnings("ignore")

from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    confusion_matrix, precision_recall_curve,
)
import xgboost as xgb
import joblib

np.random.seed(42)

FEATURE_COLS = [
    "amount_log", "amount_zscore", "is_high_amount",
    "velocity_1h", "velocity_24h", "is_burst",
    "dist_from_home_km", "is_far_from_home",
    "travel_speed_kmh", "is_impossible_travel",
    "hour", "is_night", "day_of_week", "is_weekend",
    "hour_deviation",
    "night_x_highamt", "burst_x_highamt", "far_x_speed", "night_x_burst_x_amt",
]
TARGET_COL = "fraud"

XGBOOST_PARAMS = {
    "objective":        "binary:logistic",
    "eval_metric":      ["auc", "aucpr"],
    "tree_method":      "hist",
    "max_depth":        6,
    "learning_rate":    0.05,
    "n_estimators":     600,
    "subsample":        0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 10,
    "gamma":            1.0,
    "reg_alpha":        0.1,
    "reg_lambda":       1.0,
    "random_state":     42,
    "n_jobs":           -1,
    "verbosity":        0,
}

# ── 1. Load & split ──────────────────────────────────────────────────────────
print("\n" + "═"*50)
print("  Layer 1 — XGBoost Training Pipeline")
print("═"*50 + "\n")

print("[→] Loading dataset...")
df = pd.read_csv("transactions.csv", parse_dates=["timestamp"])
df = df.sort_values("timestamp").reset_index(drop=True)
print(f"    {len(df):,} rows | fraud rate: {df[TARGET_COL].mean()*100:.1f}%")

X = df[FEATURE_COLS].copy()
y = df[TARGET_COL].copy()
fraud_type = df["fraud_type"].copy()

n        = len(df)
train_end = int(n * 0.70)
val_end   = int(n * 0.85)

X_train, y_train  = X.iloc[:train_end],      y.iloc[:train_end]
X_val,   y_val    = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
X_test,  y_test   = X.iloc[val_end:],         y.iloc[val_end:]
ft_test           = fraud_type.iloc[val_end:]

print(f"    Train : {len(X_train):,} rows | fraud {y_train.mean()*100:.1f}%")
print(f"    Val   : {len(X_val):,} rows  | fraud {y_val.mean()*100:.1f}%")
print(f"    Test  : {len(X_test):,} rows  | fraud {y_test.mean()*100:.1f}%")

# ── 2. Train ─────────────────────────────────────────────────────────────────
neg = (y_train == 0).sum()
pos = (y_train == 1).sum()
scale_pos_weight = neg / pos
print(f"\n[→] Training XGBoost | scale_pos_weight={scale_pos_weight:.2f}")

model = xgb.XGBClassifier(
    **XGBOOST_PARAMS,
    scale_pos_weight=scale_pos_weight,
    early_stopping_rounds=40,
)
model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
print(f"    Best iteration : {model.best_iteration}")
print(f"    Val AUC        : {model.best_score:.4f}")

# ── 3. Threshold tuning ───────────────────────────────────────────────────────
val_probs = model.predict_proba(X_val)[:, 1]
prec, rec, thresholds = precision_recall_curve(y_val, val_probs)
f1_scores = np.where(
    (prec + rec) == 0, 0,
    2 * prec * rec / (prec + rec)
)
best_idx  = np.argmax(f1_scores[:-1])
threshold = float(thresholds[best_idx])
val_f1    = float(f1_scores[best_idx])
print(f"\n[→] Optimal threshold : {threshold:.3f}  (val F1={val_f1:.4f})")

# ── 4. Evaluate ───────────────────────────────────────────────────────────────
probs = model.predict_proba(X_test)[:, 1]
preds = (probs >= threshold).astype(int)

auc_roc = roc_auc_score(y_test, probs)
auc_pr  = average_precision_score(y_test, probs)
cm      = confusion_matrix(y_test, preds)
tn, fp, fn, tp = cm.ravel()

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
fpr       = fp / (fp + tn) if (fp + tn) > 0 else 0

print("\n" + "═"*50)
print("  TEST SET RESULTS")
print("═"*50)
print(f"  Threshold (F1-optimal) : {threshold:.3f}")
print(f"  AUC-ROC                : {auc_roc:.4f}")
print(f"  AUC-PR (avg precision) : {auc_pr:.4f}")
print(f"  Precision              : {precision:.4f}")
print(f"  Recall                 : {recall:.4f}")
print(f"  F1                     : {f1:.4f}")
print(f"  False Positive Rate    : {fpr:.4f}")
print(f"\n  Confusion Matrix:")
print(f"               Predicted")
print(f"               Legit    Fraud")
print(f"  Actual Legit  {tn:>6,}  {fp:>6,}")
print(f"  Actual Fraud  {fn:>6,}  {tp:>6,}")

print("\n  Per-type recall on test set:")
results_df = pd.DataFrame({
    "y_true": y_test.values, "prob": probs, "fraud_type": ft_test.values
})
for ftype in sorted(results_df[results_df["y_true"]==1]["fraud_type"].unique()):
    mask   = (results_df["fraud_type"] == ftype) & (results_df["y_true"] == 1)
    caught = (results_df.loc[mask, "prob"] >= threshold).sum()
    total  = mask.sum()
    bar    = "█" * int(caught/total * 20)
    print(f"    {ftype:<18} {caught:>4}/{total:<4} ({caught/total*100:.1f}%)  {bar}")

# ── 5. Feature importance ─────────────────────────────────────────────────────
print("\n  Feature Importances (gain):")
raw_importance = model.get_booster().get_score(importance_type="gain")
imp_df = pd.DataFrame(
    [(f, raw_importance.get(f"f{i}", 0.0)) for i, f in enumerate(FEATURE_COLS)],
    columns=["feature", "gain"]
).sort_values("gain", ascending=False).reset_index(drop=True)

max_gain = imp_df["gain"].max()
for _, row in imp_df.iterrows():
    gain = row["gain"]
    bar  = "█" * int(gain / max_gain * 30) if max_gain > 0 else ""
    print(f"    {row['feature']:<25} {bar} {gain:.1f}")

# ── 6. Save ───────────────────────────────────────────────────────────────────
print("\n[→] Saving artifacts...")
joblib.dump(model, "layer1_model.pkl")

test_scores = X_test.copy()
test_scores["fraud_probability"] = probs
test_scores["fraud_predicted"]   = preds
test_scores["fraud_actual"]      = y_test.values
test_scores["fraud_type"]        = ft_test.values
test_scores.to_csv("test_scores.csv", index=False)

meta = {
    "threshold":          threshold,
    "features":           FEATURE_COLS,
    "n_estimators_used":  model.best_iteration,
    "metrics": {
        "auc_roc":   round(auc_roc, 4),
        "auc_pr":    round(auc_pr, 4),
        "precision": round(precision, 4),
        "recall":    round(recall, 4),
        "f1":        round(f1, 4),
        "fpr":       round(fpr, 4),
        "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn),
    }
}
with open("layer1_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

imp_df.to_csv("feature_importance.csv", index=False)

print("\n" + "═"*50)
print("  ✅ layer1_model.pkl")
print("  ✅ test_scores.csv")
print("  ✅ layer1_meta.json")
print("  ✅ feature_importance.csv")
print("═"*50)
print("\n  Layer 1 complete. Ready for Layer 2.\n")
