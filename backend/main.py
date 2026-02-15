from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
import uvicorn
import os
import json

from database import init_db, get_db, HealthData
from schemas import HealthDataCreate, HealthDataResponse, HealthStats

# Load config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.json')
with open(CONFIG_PATH, 'r') as f:
    CONFIG = json.load(f)

# Build token -> user lookup
USERS = CONFIG.get('users', {})
TOKEN_TO_USER = {user_data['token']: username for username, user_data in USERS.items()}

app = FastAPI(title="Health Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Token validation dependency - returns username
async def verify_token(token: str = Query(...)):
    username = TOKEN_TO_USER.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return username

@app.on_event("startup")
async def startup_event():
    init_db()

@app.post("/api/health", response_model=HealthDataResponse)
def create_health_entry(
    data: HealthDataCreate, 
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    db_entry = HealthData(**data.model_dump(), user_id=username)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/api/health", response_model=List[HealthDataResponse])
def get_all_entries(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    username: str = Depends(verify_token)
):
    query = db.query(HealthData).filter(HealthData.user_id == username)
    
    if start_date:
        query = query.filter(HealthData.datum >= start_date)
    if end_date:
        query = query.filter(HealthData.datum <= end_date)
    
    return query.order_by(desc(HealthData.datum)).offset(skip).limit(limit).all()

@app.get("/api/health/date/{date}", response_model=Optional[HealthDataResponse])
def get_entry_by_date(
    date: str,
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    """Get a single health entry by date"""
    return db.query(HealthData).filter(
        HealthData.user_id == username,
        HealthData.datum == date
    ).first()

@app.get("/api/user/me")
def get_current_user(username: str = Depends(verify_token)):
    """Get current user info"""
    return {"username": username}
def get_latest_entry(
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    return db.query(HealthData).filter(HealthData.user_id == username).order_by(desc(HealthData.datum)).first()

@app.get("/api/health/stats")
def get_stats(
    days: int = 30, 
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    entries = db.query(HealthData).filter(
        HealthData.user_id == username,
        HealthData.datum >= since
    ).all()
    
    if not entries:
        return HealthStats(
            total_entries=0,
            avg_schritte=0, avg_schlaf_stunden=0, avg_schlaf_index=0,
            avg_herzfrequenz_ruhe=0, avg_herzfrequenz_avg=0,
            avg_gewicht=0, avg_aktivitaetsenergie=0, avg_training_minuten=0,
            max_schritte=0, min_schritte=0, trend_schritte="stable", trend_schlaf="stable"
        )
    
    total = len(entries)
    
    avg_schritte = sum(e.schritte for e in entries) / total
    avg_schlaf = sum(e.schlaf_stunden for e in entries) / total
    avg_schlaf_index = sum(e.schlaf_index for e in entries) / total
    avg_hf_ruhe = sum(e.herzfrequenz_ruhe for e in entries) / total
    avg_hf_avg = sum(e.herzfrequenz_avg for e in entries) / total
    avg_gewicht = sum(e.gewicht for e in entries) / total
    avg_energie = sum(e.aktivitaetsenergie for e in entries) / total
    avg_training = sum(e.training_minuten for e in entries) / total
    
    schritte_list = [e.schritte for e in entries]
    max_schritte = max(schritte_list)
    min_schritte = min(schritte_list)
    
    # Trends berechnen (erste Hälfte vs zweite Hälfte)
    mid = total // 2
    if mid > 0:
        first_half = sum(entries[i].schritte for i in range(mid)) / mid
        second_half = sum(entries[i].schritte for i in range(mid, total)) / (total - mid)
        trend_schritte = "up" if second_half > first_half * 1.05 else "down" if second_half < first_half * 0.95 else "stable"
        
        first_half_schlaf = sum(entries[i].schlaf_stunden for i in range(mid)) / mid
        second_half_schlaf = sum(entries[i].schlaf_stunden for i in range(mid, total)) / (total - mid)
        trend_schlaf = "up" if second_half_schlaf > first_half_schlaf * 1.05 else "down" if second_half_schlaf < first_half_schlaf * 0.95 else "stable"
    else:
        trend_schritte = "stable"
        trend_schlaf = "stable"
    
    return HealthStats(
        total_entries=total,
        avg_schritte=round(avg_schritte, 1),
        avg_schlaf_stunden=round(avg_schlaf, 1),
        avg_schlaf_index=round(avg_schlaf_index, 1),
        avg_herzfrequenz_ruhe=round(avg_hf_ruhe, 1),
        avg_herzfrequenz_avg=round(avg_hf_avg, 1),
        avg_gewicht=round(avg_gewicht, 1),
        avg_aktivitaetsenergie=round(avg_energie, 1),
        avg_training_minuten=round(avg_training, 1),
        max_schritte=max_schritte,
        min_schritte=min_schritte,
        trend_schritte=trend_schlaf,
        trend_schlaf=trend_schlaf
    )

@app.get("/api/health/chart/{metric}")
def get_chart_data(
    metric: str, 
    days: int = 30, 
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    entries = db.query(HealthData).filter(
        HealthData.user_id == username,
        HealthData.datum >= since
    ).order_by(HealthData.datum).all()
    
    valid_metrics = ["schritte", "schlaf_stunden", "schlaf_index", "herzfrequenz_ruhe", 
                     "herzfrequenz_avg", "gewicht", "aktivitaetsenergie", "training_minuten"]
    
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric. Use: {', '.join(valid_metrics)}")
    
    return {
        "labels": [e.datum for e in entries],
        "values": [getattr(e, metric) for e in entries]
    }

@app.put("/api/health/{entry_id}", response_model=HealthDataResponse)
def update_entry(
    entry_id: int, 
    data: HealthDataCreate, 
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    entry = db.query(HealthData).filter(
        HealthData.id == entry_id,
        HealthData.user_id == username
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    for key, value in data.model_dump().items():
        setattr(entry, key, value)
    
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/api/health/{entry_id}")
def delete_entry(
    entry_id: int, 
    db: Session = Depends(get_db), 
    username: str = Depends(verify_token)
):
    entry = db.query(HealthData).filter(
        HealthData.id == entry_id,
        HealthData.user_id == username
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
