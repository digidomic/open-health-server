#!/usr/bin/env python3
"""Create admin user manually"""
import sys
sys.path.insert(0, '/app')

from database import init_db, SessionLocal
from auth import init_auth_tables, User

# Initialize tables
init_db()
init_auth_tables()

# Create session
db = SessionLocal()

try:
    # Check if admin exists
    admin = db.query(User).filter(User.username == 'admin').first()
    if admin:
        print("Admin user already exists!")
        print(f"Username: {admin.username}")
        print(f"ID: {admin.id}")
    else:
        # Create admin user
        admin = User(
            username='admin',
            email='admin@localhost',
            hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
            language='de',
            units='metric',
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("=" * 60)
        print("ADMIN USER CREATED!")
        print("Username: admin")
        print("Password: admin")
        print("=" * 60)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
