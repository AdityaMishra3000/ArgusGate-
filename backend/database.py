from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id              = Column(Integer, primary_key=True, index=True)
    home_lat             = Column(Float)
    home_lon             = Column(Float)
    avg_amount           = Column(Float)
    std_amount           = Column(Float)
    preferred_hour_mu    = Column(Float)
    preferred_hour_sigma = Column(Float)
    avg_daily_txns       = Column(Integer)


class Transaction(Base):
    __tablename__ = "transactions"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, index=True)
    timestamp         = Column(DateTime)
    amount            = Column(Float)
    lat               = Column(Float)
    lon               = Column(Float)

    # Engineered features
    amount_log        = Column(Float)
    amount_zscore     = Column(Float)
    velocity_1h       = Column(Integer)
    dist_from_home_km = Column(Float)
    travel_speed_kmh  = Column(Float)
    hour              = Column(Integer)
    is_night          = Column(Boolean)
    hour_deviation    = Column(Float)

    # Model output
    fraud_probability = Column(Float)
    fraud_predicted   = Column(Boolean)
    threshold_used    = Column(Float)

    # Decision engine
    status            = Column(String(32), default="auto_approved", index=True)
    top_signals       = Column(Text)
    reviewed_by       = Column(String(64))
    reviewed_at       = Column(DateTime)
    review_note       = Column(Text)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()