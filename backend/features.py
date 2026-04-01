import numpy as np
import pandas as pd
import math
from sqlalchemy.orm import Session
from database import Transaction

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi       = math.radians(lat2 - lat1)
    dlambda    = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def engineer_features(txn: dict, user_profile: dict, db: Session) -> dict:
    user_id   = txn["user_id"]
    timestamp = txn["timestamp"]
    amount    = txn["amount"]
    lat       = txn["lat"]
    lon       = txn["lon"]

    # ── Amount signals ────────────────────────────────────────────
    amount_log = math.log1p(amount)

    history = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    past_amounts = [t.amount for t in history] if history else []

    if len(past_amounts) >= 2:
        mu  = np.mean(past_amounts)
        std = max(np.std(past_amounts), 1.0)
        amount_zscore = (amount - mu) / std
    else:
        amount_zscore = 0.0

    is_high_amount = int(amount_zscore > 3)

    # ── Velocity signals ──────────────────────────────────────────
    # Always use naive datetimes for comparison (strip tz if present)
    ts_naive = pd.Timestamp(timestamp).tz_localize(None) if pd.Timestamp(timestamp).tzinfo else pd.Timestamp(timestamp)
    one_hour_ago = (ts_naive - pd.Timedelta(hours=1)).to_pydatetime()
    one_day_ago  = (ts_naive - pd.Timedelta(hours=24)).to_pydatetime()

    def naive(dt):
        """Strip timezone from a datetime so comparisons don't crash."""
        if dt is None:
            return None
        return dt.replace(tzinfo=None) if hasattr(dt, 'tzinfo') else dt

    velocity_1h  = sum(1 for t in history if naive(t.timestamp) and naive(t.timestamp) >= one_hour_ago)
    velocity_24h = sum(1 for t in history if naive(t.timestamp) and naive(t.timestamp) >= one_day_ago)
    is_burst     = int(velocity_1h >= 5)

    # ── Location signals ──────────────────────────────────────────
    home_lat = user_profile["home_lat"]
    home_lon = user_profile["home_lon"]

    dist_from_home_km = haversine_km(home_lat, home_lon, lat, lon)
    is_far_from_home  = int(dist_from_home_km > 500)

    last_txn = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.timestamp.desc())
        .first()
    )
    if last_txn and last_txn.lat and last_txn.lon and last_txn.timestamp:
        dist = haversine_km(last_txn.lat, last_txn.lon, lat, lon)
        last_ts_naive = naive(last_txn.timestamp)
        hrs  = max((ts_naive.to_pydatetime() - last_ts_naive).total_seconds() / 3600, 0.01)
        travel_speed_kmh = min(dist / hrs, 5000)
    else:
        travel_speed_kmh = 0.0

    is_impossible_travel = int(travel_speed_kmh > 800)

    # ── Time signals ──────────────────────────────────────────────
    hour        = ts_naive.hour
    is_night    = int(hour < 6 or hour >= 23)
    day_of_week = ts_naive.dayofweek
    is_weekend  = int(day_of_week >= 5)

    pref_hour      = user_profile.get("preferred_hour_mu", 13)
    hour_deviation = min(abs(hour - pref_hour), 24 - abs(hour - pref_hour))

    # ── Interaction signals ───────────────────────────────────────
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