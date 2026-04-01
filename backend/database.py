from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Transaction(Base):
    __tablename__ = "transactions"

    id                    = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, index=True)
    timestamp             = Column(DateTime)
    amount                = Column(Float)
    lat                   = Column(Float)
    lon                   = Column(Float)

    # engineered features
    amount_log            = Column(Float)
    amount_zscore         = Column(Float)
    velocity_1h           = Column(Integer)
    dist_from_home_km     = Column(Float)
    travel_speed_kmh      = Column(Float)
    hour                  = Column(Integer)
    is_night              = Column(Boolean)
    hour_deviation        = Column(Float)

    # output
    fraud_probability     = Column(Float)
    fraud_predicted       = Column(Boolean)
    threshold_used        = Column(Float)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()