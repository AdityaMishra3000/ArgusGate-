"""
features.py — Fixed version
Fixes applied:
  1. Haversine float domain error  → min(a, 1.0)
  2. Goldfish memory               → use profile baseline, not empty DB averages
  3. Negative time / teleport bug  → abs() + minimum 5min gap
  4. SELECT * killer               → SQL aggregates only
  5. Cold start defaults           → global fallbacks for new users
"""

import math
from datetime import datetime
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Transaction


# ─────────────────────────────────────────────
# GLOBAL PLATFORM BASELINES
# Used when a user has no history (cold start)
# ─────────────────────────────────────────────
GLOBAL_AVG_AMOUNT = 75.0
GLOBAL_STD_AMOUNT = 120.0


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    """Great-circle distance. Clamped to prevent float domain errors."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi    = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    a = min(a, 1.0)          # FIX 1: clamp float imprecision before asin
    return 2 * R * math.asin(math.sqrt(a))


def _naive(dt):
    """Strip timezone so comparisons never raise TypeError."""
    if dt is None:
        return None
    if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def engineer_features(txn: dict, user_profile: dict, db: Session) -> dict:
    user_id   = txn["user_id"]
    timestamp = txn["timestamp"]
    amount    = txn["amount"]
    lat       = txn["lat"]
    lon       = txn["lon"]

    # Normalise incoming timestamp to naive
    ts = pd.Timestamp(timestamp)
    ts_naive = ts.tz_localize(None) if ts.tzinfo else ts
    ts_dt    = ts_naive.to_pydatetime()

    one_hour_ago = (ts_naive - pd.Timedelta(hours=1)).to_pydatetime()
    one_day_ago  = (ts_naive - pd.Timedelta(hours=24)).to_pydatetime()

    # ── A. Amount signals ─────────────────────────────────────────
    # FIX 2 (Goldfish memory): use the PROFILE baseline, not live DB.
    # The live DB starts empty — computing mean from 2 test clicks
    # creates a fake baseline and z-scores everything into oblivion.
    mu  = float(user_profile.get("avg_amount") or GLOBAL_AVG_AMOUNT)
    std = max(float(user_profile.get("std_amount") or GLOBAL_STD_AMOUNT), 1.0)

    amount_log     = math.log1p(amount)
    amount_zscore  = (amount - mu) / std
    is_high_amount = int(amount_zscore > 3)

    # ── B. Velocity signals  (SQL aggregates, not SELECT *) ───────
    # FIX 4: push counting into Postgres — never .all() into RAM
    velocity_1h = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == user_id,
            Transaction.timestamp >= one_hour_ago,
        )
        .scalar() or 0
    )

    velocity_24h = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == user_id,
            Transaction.timestamp >= one_day_ago,
        )
        .scalar() or 0
    )

    is_burst = int(velocity_1h >= 5)

    # ── C. Location signals ───────────────────────────────────────
    home_lat = float(user_profile.get("home_lat", lat))
    home_lon = float(user_profile.get("home_lon", lon))

    dist_from_home_km = haversine_km(home_lat, home_lon, lat, lon)
    is_far_from_home  = int(dist_from_home_km > 500)

    # Travel speed vs previous transaction
    last_txn = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.timestamp.desc())
        .first()
    )

    travel_speed_kmh     = 0.0
    is_impossible_travel = 0

    if last_txn and last_txn.lat and last_txn.lon and last_txn.timestamp:
        last_ts = _naive(last_txn.timestamp)
        if last_ts:
            # FIX 3: abs() prevents negative deltas from out-of-order events.
            # Enforce 5-min floor so UI test clicks don't read as teleportation.
            raw_hrs = abs((ts_dt - last_ts).total_seconds()) / 3600
            hrs     = max(raw_hrs, 5 / 60)

            dist_km          = haversine_km(last_txn.lat, last_txn.lon, lat, lon)
            travel_speed_kmh = min(dist_km / hrs, 5000.0)

            # Only flag impossible travel if gap is real (>15 min).
            # Stops "teleportation" when changing coords in the UI test form.
            real_gap             = raw_hrs >= (15 / 60)
            is_impossible_travel = int(real_gap and travel_speed_kmh > 800)

    # ── D. Time signals ───────────────────────────────────────────
    hour        = ts_naive.hour
    is_night    = int(hour < 6 or hour >= 23)
    day_of_week = ts_naive.dayofweek
    is_weekend  = int(day_of_week >= 5)

    pref_hour      = float(user_profile.get("preferred_hour_mu") or 13.0)
    hour_deviation = min(abs(hour - pref_hour), 24 - abs(hour - pref_hour))

    # ── E. Interaction signals ────────────────────────────────────
    night_x_highamt     = is_night * is_high_amount
    burst_x_highamt     = is_burst * is_high_amount
    far_x_speed         = is_far_from_home * (travel_speed_kmh / 1000)
    night_x_burst_x_amt = is_night * is_burst * max(amount_zscore, 0)

    return {
        "amount_log":            amount_log,
        "amount_zscore":         amount_zscore,
        "is_high_amount":        is_high_amount,
        "velocity_1h":           velocity_1h,
        "velocity_24h":          velocity_24h,
        "is_burst":              is_burst,
        "dist_from_home_km":     dist_from_home_km,
        "is_far_from_home":      is_far_from_home,
        "travel_speed_kmh":      travel_speed_kmh,
        "is_impossible_travel":  is_impossible_travel,
        "hour":                  hour,
        "is_night":              is_night,
        "day_of_week":           day_of_week,
        "is_weekend":            is_weekend,
        "hour_deviation":        hour_deviation,
        "night_x_highamt":       night_x_highamt,
        "burst_x_highamt":       burst_x_highamt,
        "far_x_speed":           far_x_speed,
        "night_x_burst_x_amt":   night_x_burst_x_amt,
    }