#!/usr/bin/env python3
import os
import sys
sys.path.append('backend')

from backend.database import engine
from sqlalchemy import text
import uuid
from datetime import datetime

def create_test_data():
    conn = engine.connect()
    
    try:
        print("Creating test data in PostgreSQL...")
        
        # Get landowner user
        result = conn.execute(text('SELECT user_id FROM "user" WHERE email = :email'), {"email": "landowner@renewmart.com"})
        landowner = result.fetchone()
        if not landowner:
            print("No landowner found!")
            return
        
        landowner_id = landowner[0]
        print(f"Using landowner ID: {landowner_id}")
        
        # Create test land
        land_id = str(uuid.uuid4())
        conn.execute(text('''
            INSERT INTO lands (
                land_id, landowner_id, title, location_text, area_acres, 
                energy_key, capacity_mw, price_per_mwh, status, created_at
            ) VALUES (:land_id, :landowner_id, :title, :location_text, :area_acres, 
                     :energy_key, :capacity_mw, :price_per_mwh, :status, :created_at)
        '''), {
            "land_id": land_id,
            "landowner_id": landowner_id,
            "title": "Solar Farm Project - California",
            "location_text": "Fresno, California",
            "area_acres": 500.0,
            "energy_key": "solar",
            "capacity_mw": 100.0,
            "price_per_mwh": 45.5,
            "status": "published",
            "created_at": datetime.now()
        })
        
        print(f"Created land: Solar Farm Project (ID: {land_id})")
        
        # Get investor user
        result = conn.execute(text('SELECT user_id FROM "user" WHERE email = :email'), {"email": "investor@renewmart.com"})
        investor = result.fetchone()
        if not investor:
            print("No investor found!")
            return
        
        investor_id = investor[0]
        print(f"Using investor ID: {investor_id}")
        
        # Create test investor interest
        interest_id = str(uuid.uuid4())
        conn.execute(text('''
            INSERT INTO investor_interests (
                interest_id, investor_id, land_id, status, message, created_at
            ) VALUES (:interest_id, :investor_id, :land_id, :status, :message, :created_at)
        '''), {
            "interest_id": interest_id,
            "investor_id": investor_id,
            "land_id": land_id,
            "status": "interested",
            "message": "I am very interested in this renewable energy project!",
            "created_at": datetime.now()
        })
        
        print(f"Created investor interest: {interest_id}")
        
        conn.commit()
        print("\n[SUCCESS] Test data created successfully!")
        
        # Verify data
        result = conn.execute(text('SELECT COUNT(*) FROM lands WHERE status = :status'), {"status": "published"})
        land_count = result.fetchone()[0]
        print(f"Published lands: {land_count}")
        
        result = conn.execute(text('SELECT COUNT(*) FROM investor_interests'))
        interest_count = result.fetchone()[0]
        print(f"Investor interests: {interest_count}")
        
    except Exception as e:
        print(f"[ERROR] Error creating test data: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    create_test_data()

