from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# What the frontend sends to /predict
class TransactionInput(BaseModel):
    user_id:   int
    timestamp: datetime
    amount:    float
    lat:       float
    lon:       float

# What /predict sends back
class PredictionResponse(BaseModel):
    user_id:           int
    fraud_probability: float
    fraud_predicted:   bool
    threshold_used:    float
    risk_level:        str        # "LOW" | "MEDIUM" | "HIGH"
    top_signals:       list[str]  # human-readable reasons

# What /transactions returns (list view)
class TransactionRecord(BaseModel):
    id:                int
    user_id:           int
    timestamp:         datetime
    amount:            float
    fraud_probability: float
    fraud_predicted:   bool
    risk_level:        str

    class Config:
        from_attributes = True