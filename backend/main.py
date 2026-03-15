from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
import uvicorn
import os
import json

from database import init_db, get_db, HealthData
from schemas import HealthDataCreate, HealthDataResponse, HealthStats
from auth import (
    init_auth_tables, create_user, authenticate_user, create_access_token,
    decode_access_token, create_api_key, validate_api_key, get_user_api_keys,
    revoke_api_key, get_user_by_id, User, verify_password, get_password_hash
)

# Load legacy config (for migration)
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')
LEGACY_USERS = {}
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, 'r') as f:
        config = json.load(f)
        LEGACY_USERS = config.get('users', {})

app = FastAPI(title="Health Tracker API", version="2.0.0")

# CORS: Allow all origins but with credentials support
# For production, restrict this to your actual domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.9.23:8095", "http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler to ensure CORS headers on errors
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    from fastapi.responses import JSONResponse
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    # Add CORS headers manually
    origin = request.headers.get("origin")
    if origin in ["http://192.168.9.23:8095", "http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Cookie settings
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days


# Authentication dependencies
async def get_current_user_web(request: Request, db: Session = Depends(get_db)):
    """Get current user from JWT cookie (web authentication)"""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


async def get_current_user_api(request: Request) -> User:
    """Get current user from API Key (app authentication)"""
    # Try API key from header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        api_key = auth_header[7:]  # Remove "Bearer "
        user = validate_api_key(api_key)
        if user:
            return user

    # Try legacy token from query param (backward compatibility)
    token = request.query_params.get("token")
    if token and token in LEGACY_USERS:
        # TODO: Migrate legacy user to new system
        raise HTTPException(
            status_code=401,
            detail="Legacy tokens deprecated. Please use new login system."
        )

    raise HTTPException(status_code=401, detail="Invalid API key")


# Unified auth - tries web cookie first, then API key
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get current user from cookie or API key"""
    # Try web cookie first
    token = request.cookies.get(COOKIE_NAME)
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user and user.is_active:
                    return user

    # Try API key
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        api_key = auth_header[7:]
        user = validate_api_key(api_key)
        if user:
            return user

    raise HTTPException(status_code=401, detail="Authentication required")


@app.on_event("startup")
async def startup_event():
    init_db()
    init_auth_tables()


# ============ AUTHENTICATION ENDPOINTS ============

@app.get("/api/auth/setup-required")
def check_setup_required(db: Session = Depends(get_db)):
    """Check if initial setup is required (no users exist yet)"""
    user_count = db.query(User).count()
    return {"setup_required": user_count == 0}


@app.post("/api/auth/setup")
def initial_setup(
    username: str = Form(...),
    password: str = Form(...),
    email: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Initial setup - create first admin user (only works if no users exist)"""
    # Check if users already exist
    user_count = db.query(User).count()
    if user_count > 0:
        raise HTTPException(
            status_code=403, 
            detail="Setup already completed. Use login instead."
        )
    
    # Create first user as admin
    try:
        user = User(
            username=username,
            email=email or f"{username}@localhost",
            hashed_password=get_password_hash(password),
            language="de",
            units="metric",
            is_active=True
        )
        db.add(user)
        db.commit()
        
        return {
            "message": "Setup completed successfully",
            "username": user.username
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/register")
def register(
    username: str = Form(...),
    password: str = Form(...),
    email: Optional[str] = Form(None),
    language: str = Form("de"),
    units: str = Form("metric")
):
    """Register a new user"""
    try:
        user = create_user(username, password, email, language, units)
        return {"message": "User created successfully", "username": user.username}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
def login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    remember: bool = Form(True)
):
    """Login and set JWT cookie"""
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(user["id"]), "username": user["username"]}
    )

    # Set cookie
    max_age = COOKIE_MAX_AGE if remember else None
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=max_age
    )

    return {
        "message": "Login successful",
        "username": user["username"],
        "language": user["language"],
        "units": user["units"]
    }


@app.post("/api/auth/logout")
def logout(response: Response):
    """Logout and clear cookie"""
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Logout successful"}


@app.post("/api/auth/change-password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user_web),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}


@app.post("/api/auth/change-username")
def change_username(
    new_username: str = Form(...),
    current_user: User = Depends(get_current_user_web),
    db: Session = Depends(get_db)
):
    """Change username"""
    # Check if username already exists
    existing = db.query(User).filter(User.username == new_username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update username
    current_user.username = new_username
    db.commit()
    
    return {"message": "Username changed successfully", "new_username": new_username}


@app.post("/api/auth/setup")
def setup_account(
    new_username: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user_web),
    db: Session = Depends(get_db)
):
    """Initial account setup - change from default admin/admin"""
    # Update username if different
    if new_username != current_user.username:
        existing = db.query(User).filter(User.username == new_username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = new_username
    
    # Update password
    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return {
        "message": "Account setup completed",
        "new_username": new_username
    }


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user_web)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "language": current_user.language,
        "units": current_user.units
    }


# ============ API KEY MANAGEMENT ============

@app.post("/api/auth/apikeys")
def create_new_api_key(
    name: str = Form("Unnamed Device"),
    current_user: User = Depends(get_current_user_web)
):
    """Create a new API key for app authentication"""
    api_key = create_api_key(current_user.id, name)
    return {
        "message": "API key created",
        "api_key": api_key,  # Show only once!
        "name": name
    }


@app.get("/api/auth/apikeys")
def list_api_keys(current_user: User = Depends(get_current_user_web)):
    """List all API keys for current user"""
    keys = get_user_api_keys(current_user.id)
    return {
        "api_keys": [
            {
                "id": k.id,
                "name": k.name,
                "prefix": k.key_prefix,
                "created_at": k.created_at.isoformat() if k.created_at else None,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None
            }
            for k in keys
        ]
    }


@app.delete("/api/auth/apikeys/{key_id}")
def delete_api_key(key_id: int, current_user: User = Depends(get_current_user_web)):
    """Revoke an API key"""
    success = revoke_api_key(key_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"message": "API key revoked"}


# ============ HEALTH DATA ENDPOINTS ============

@app.post("/api/health", response_model=HealthDataResponse)
def create_or_update_health_entry(
    data: HealthDataCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Check if entry for this date already exists
    existing = db.query(HealthData).filter(
        HealthData.user_id == current_user.username,
        HealthData.datum == data.datum
    ).first()
    
    if existing:
        # Update existing entry
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new entry
        db_entry = HealthData(**data.model_dump(), user_id=current_user.username)
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
    current_user: User = Depends(get_current_user)
):
    query = db.query(HealthData).filter(HealthData.user_id == current_user.username)
    
    if start_date:
        query = query.filter(HealthData.datum >= start_date)
    if end_date:
        query = query.filter(HealthData.datum <= end_date)
    
    return query.order_by(desc(HealthData.datum)).offset(skip).limit(limit).all()

@app.get("/api/health/date/{date}", response_model=Optional[HealthDataResponse])
def get_entry_by_date(
    date: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get a single health entry by date"""
    return db.query(HealthData).filter(
        HealthData.user_id == current_user.username,
        HealthData.datum == date
    ).first()

@app.get("/api/user/config")
def get_user_config(current_user: User = Depends(get_current_user)):
    """Get user configuration (language and units)"""
    return {
        "username": current_user.username,
        "language": current_user.language,
        "units": current_user.units
    }

@app.get("/api/health/latest")
def get_latest_entry(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(HealthData).filter(HealthData.user_id == current_user.username).order_by(desc(HealthData.datum)).first()

@app.get("/api/health/stats")
def get_stats(
    days: int = 30, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
):
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    entries = db.query(HealthData).filter(
        HealthData.user_id == current_user.username,
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
    current_user: User = Depends(get_current_user)
):
    entry = db.query(HealthData).filter(
        HealthData.id == entry_id,
        HealthData.user_id == current_user.username
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
    current_user: User = Depends(get_current_user)
):
    entry = db.query(HealthData).filter(
        HealthData.id == entry_id,
        HealthData.user_id == current_user.username
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}

@app.get("/health")
def health_check():
    """Simple health check endpoint for monitoring"""
    return {"status": "healthy", "service": "health-tracker-api"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
