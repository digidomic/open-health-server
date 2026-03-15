#!/usr/bin/env python3
"""
Setup script to create initial admin user.
Run this after starting the backend container:
    docker exec ohs-backend python3 /app/setup_admin.py
"""
import sys
sys.path.insert(0, '/app')

from database import init_db, SessionLocal
from auth import init_auth_tables, User

print("Setting up database and admin user...")

# Initialize tables
init_db()
init_auth_tables()

# Create session
db = SessionLocal()

try:
    # Check if any users exist
    user_count = db.query(User).count()
    print(f"Current user count: {user_count}")
    
    if user_count == 0:
        # Create admin user
        admin = User(
            username='admin',
            email='admin@localhost',
            hashed_password='$2b$12$9kAyZj9EYsw2zr4DO4a6w.whbAWh4heVqKofNzdA0S4q6mVuuSquC',
            language='de',
            units='metric',
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("\n" + "=" * 60)
        print("✅ ADMIN USER CREATED SUCCESSFULLY!")
        print("=" * 60)
        print("Username: admin")
        print("Password: admin")
        print("\nPlease change the password after first login!")
        print("=" * 60 + "\n")
    else:
        print("✅ Users already exist, skipping admin creation")
        
        # List existing users
        users = db.query(User).all()
        print("\nExisting users:")
        for u in users:
            print(f"  - {u.username} (active: {u.is_active})")
            
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()

print("\nSetup complete! You can now login with admin/admin")
