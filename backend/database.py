from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/db/health.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class HealthData(Base):
    __tablename__ = "health_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="Dominic")  # Multi-user support
    datum = Column(String, index=True)
    schritte = Column(Integer, default=0)
    schlaf_stunden = Column(Float, default=0.0)
    schlaf_index = Column(Float, default=0.0)
    herzfrequenz_ruhe = Column(Integer, default=0)
    herzfrequenz_avg = Column(Integer, default=0)
    gewicht = Column(Float, default=0.0)
    aktivitaetsenergie = Column(Integer, default=0)
    training_minuten = Column(Integer, default=0)
    notizen = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
