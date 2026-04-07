from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TransactionInput(BaseModel):
    user_id:   int
    timestamp: datetime
    amount:    float
    lat:       float
    lon:       float

class PredictionResponse(BaseModel):
    user_id:           int
    fraud_probability: float
    fraud_predicted:   bool
    threshold_used:    float
    risk_level:        str
    top_signals:       List[str]
    status:            str

class TransactionRecord(BaseModel):
    id:                int
    user_id:           int
    timestamp:         datetime
    amount:            float
    fraud_probability: float
    fraud_predicted:   bool
    risk_level:        str
    status:            str
    top_signals:       Optional[str] = None
    reviewed_by:       Optional[str] = None
    reviewed_at:       Optional[datetime] = None
    review_note:       Optional[str] = None

    class Config:
        from_attributes = True

class SimulateRequest(BaseModel):
    n: int = 30           # number of transactions to generate
    fraud_mix: float = 0.12  # target fraud rate in batch

class DecisionRequest(BaseModel):
    decision:    str       # "approve" | "block"
    analyst_id:  str = "admin"
    note:        Optional[str] = None