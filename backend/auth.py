"""
Authentication and Authorization Module for Open Health Server

Features:
- JWT-based web authentication (HttpOnly cookies)
- API Key-based app authentication
- Password hashing with bcrypt
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base, engine

# Configuration
# Use persistent secret key from file or generate new one
SECRET_KEY_FILE = "/app/db/.secret_key"
if os.path.exists(SECRET_KEY_FILE):
    with open(SECRET_KEY_FILE, 'r') as f:
        SECRET_KEY = f.read().strip()
else:
    SECRET_KEY = secrets.token_urlsafe(32)
    # Save for persistence - ensure directory exists
    try:
        os.makedirs(os.path.dirname(SECRET_KEY_FILE), exist_ok=True)
        with open(SECRET_KEY_FILE, 'w') as f:
            f.write(SECRET_KEY)
    except Exception as e:
        print(f"Warning: Could not save secret key: {e}")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(Base):
    """User model with password authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    language = Column(String(10), default="de")
    units = Column(String(20), default="metric")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")


class APIKey(Base):
    """API Key model for app authentication"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    key_prefix = Column(String(8), index=True)  # First 8 chars for identification
    key_hash = Column(String(255), nullable=False)  # Hashed key
    name = Column(String(100), default="Unnamed Device")  # Device name
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


# Create tables
def init_auth_tables():
    Base.metadata.create_all(bind=engine)


# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


# JWT utilities
def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# API Key utilities
def generate_api_key() -> str:
    """Generate a new API key"""
    prefix = "ohs_live_"
    random_part = secrets.token_urlsafe(32)
    return f"{prefix}{random_part}"


def hash_api_key(api_key: str) -> str:
    """Hash an API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()


def get_key_prefix(api_key: str) -> str:
    """Get the first 8 characters of an API key for identification"""
    return api_key[:8]


def verify_api_key(api_key: str, key_hash: str) -> bool:
    """Verify an API key against its hash"""
    return hash_api_key(api_key) == key_hash


# User management utilities
def create_user(username: str, password: str, email: Optional[str] = None, 
                language: str = "de", units: str = "metric") -> User:
    """Create a new user"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        hashed_password = get_password_hash(password)
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            language=language,
            units=units
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate a user with username and password"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Return user data as dict (session will be closed)
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "language": user.language,
            "units": user.units,
            "is_active": user.is_active
        }
    finally:
        db.close()


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Get a user by ID"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "language": user.language,
                "units": user.units,
                "is_active": user.is_active
            }
        return None
    finally:
        db.close()


def create_api_key(user_id: int, name: str = "Unnamed Device") -> str:
    """Create a new API key for a user"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        # Generate new key
        api_key = generate_api_key()
        key_hash = hash_api_key(api_key)
        key_prefix = get_key_prefix(api_key)
        
        # Store in database
        db_key = APIKey(
            user_id=user_id,
            key_prefix=key_prefix,
            key_hash=key_hash,
            name=name
        )
        db.add(db_key)
        db.commit()
        
        return api_key
    finally:
        db.close()


def validate_api_key(api_key: str) -> Optional[User]:
    """Validate an API key and return the associated user"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        key_hash = hash_api_key(api_key)
        db_key = db.query(APIKey).filter(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True
        ).first()
        
        if not db_key:
            return None
        
        if db_key.is_expired():
            return None
        
        # Update last used
        db_key.last_used_at = datetime.utcnow()
        db.commit()
        
        return db_key.user
    finally:
        db.close()


def revoke_api_key(key_id: int, user_id: int) -> bool:
    """Revoke an API key (only by the owner)"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        key = db.query(APIKey).filter(
            APIKey.id == key_id,
            APIKey.user_id == user_id
        ).first()
        
        if not key:
            return False
        
        key.is_active = False
        db.commit()
        return True
    finally:
        db.close()


def get_user_api_keys(user_id: int) -> List[APIKey]:
    """Get all API keys for a user"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        return db.query(APIKey).filter(
            APIKey.user_id == user_id,
            APIKey.is_active == True
        ).all()
    finally:
        db.close()
