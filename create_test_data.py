#!/usr/bin/env python3
import sqlite3
import uuid
from datetime import datetime

def create_test_data():
    conn = sqlite3.connect('renewmart.db')
    cursor = conn.cursor()
    
    try:
        # Get landowner user
        cursor.execute('SELECT user_id FROM "user" WHERE email = "landowner@renewmart.com"')
        landowner = cursor.fetchone()
        if not landowner:
            print("No landowner found!")
            return
        
        landowner_id = landowner[0]
        print(f"Using landowner ID: {landowner_id}")
        
        # Create test lands
        lands_data = [
            {
                "title": "Solar Farm Project - California",
                "location_text": "Fresno, California",
                "area_acres": 500.0,
                "energy_key": "solar",
                "capacity_mw": 100.0,
                "price_per_mwh": 45.5,
                "status": "published"
            },
            {
                "title": "Wind Energy Project - Texas",
                "location_text": "Austin, Texas",
                "area_acres": 1000.0,
                "energy_key": "wind",
                "capacity_mw": 200.0,
                "price_per_mwh": 35.0,
                "status": "published"
            }
        ]
        
        for land_data in lands_data:
            land_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO lands (
                    land_id, landowner_id, title, location_text, area_acres, 
                    energy_key, capacity_mw, price_per_mwh, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                land_id, landowner_id, land_data["title"], land_data["location_text"],
                land_data["area_acres"], land_data["energy_key"], land_data["capacity_mw"],
                land_data["price_per_mwh"], land_data["status"], datetime.now().isoformat()
            ))
            print(f"Created land: {land_data['title']} (ID: {land_id})")
        
        # Get investor user
        cursor.execute('SELECT user_id FROM "user" WHERE email = "investor@renewmart.com"')
        investor = cursor.fetchone()
        if not investor:
            print("No investor found!")
            return
        
        investor_id = investor[0]
        print(f"Using investor ID: {investor_id}")
        
        # Create test investor interest
        cursor.execute('SELECT land_id FROM lands WHERE status = "published" LIMIT 1')
        land = cursor.fetchone()
        if land:
            interest_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO investor_interests (
                    interest_id, investor_id, land_id, status, message, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (interest_id, investor_id, land[0], 'interested', 'I am very interested in this renewable energy project!', datetime.now().isoformat()))
            
            print(f"Created investor interest: {interest_id}")
        
        conn.commit()
        print("\n[SUCCESS] Test data created successfully!")
        
        # Verify data
        cursor.execute('SELECT COUNT(*) FROM lands WHERE status = "published"')
        land_count = cursor.fetchone()[0]
        print(f"Published lands: {land_count}")
        
        cursor.execute('SELECT COUNT(*) FROM investor_interests')
        interest_count = cursor.fetchone()[0]
        print(f"Investor interests: {interest_count}")
        
    except Exception as e:
        print(f"[ERROR] Error creating test data: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    create_test_data()

