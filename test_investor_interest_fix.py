#!/usr/bin/env python3
import sqlite3
import uuid
from datetime import datetime

def test_investor_interest_fix():
    """Test the investor interest functionality with SQLite database"""
    conn = sqlite3.connect('renewmart.db')
    cursor = conn.cursor()
    
    try:
        print("Testing investor interest functionality...")
        
        # Check if users exist
        cursor.execute('SELECT COUNT(*) FROM "user"')
        user_count = cursor.fetchone()[0]
        print(f"Users in database: {user_count}")
        
        if user_count == 0:
            print("No users found. Creating test users...")
            
            # Create test users
            landowner_id = str(uuid.uuid4())
            investor_id = str(uuid.uuid4())
            admin_id = str(uuid.uuid4())
            
            # Insert users
            cursor.execute('''
                INSERT INTO "user" (user_id, email, password_hash, first_name, last_name, phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (landowner_id, 'landowner@test.com', 'hashed_password', 'John', 'Landowner', '+1234567890', 1, datetime.now().isoformat()))
            
            cursor.execute('''
                INSERT INTO "user" (user_id, email, password_hash, first_name, last_name, phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (investor_id, 'investor@test.com', 'hashed_password', 'Jane', 'Investor', '+1234567891', 1, datetime.now().isoformat()))
            
            cursor.execute('''
                INSERT INTO "user" (user_id, email, password_hash, first_name, last_name, phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (admin_id, 'admin@test.com', 'hashed_password', 'Admin', 'User', '+1234567892', 1, datetime.now().isoformat()))
            
            # Insert roles
            cursor.execute('INSERT INTO user_roles (user_id, role_key) VALUES (?, ?)', (landowner_id, 'landowner'))
            cursor.execute('INSERT INTO user_roles (user_id, role_key) VALUES (?, ?)', (investor_id, 'investor'))
            cursor.execute('INSERT INTO user_roles (user_id, role_key) VALUES (?, ?)', (admin_id, 'administrator'))
            
            print("Test users created successfully!")
        else:
            # Get existing users
            cursor.execute('SELECT user_id, email FROM "user" WHERE email LIKE "%landowner%" LIMIT 1')
            landowner = cursor.fetchone()
            cursor.execute('SELECT user_id, email FROM "user" WHERE email LIKE "%investor%" LIMIT 1')
            investor = cursor.fetchone()
            
            if landowner:
                landowner_id = landowner[0]
            if investor:
                investor_id = investor[0]
        
        # Create test land
        land_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT OR REPLACE INTO lands (
                land_id, landowner_id, title, location_text, area_acres, 
                energy_key, capacity_mw, price_per_mwh, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (land_id, landowner_id, 'Test Solar Farm', 'California, USA', 500.0, 'solar', 100.0, 45.5, 'published', datetime.now().isoformat()))
        
        print(f"Created test land: {land_id}")
        
        # Create test investor interest
        interest_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT OR REPLACE INTO investor_interests (
                interest_id, investor_id, land_id, status, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (interest_id, investor_id, land_id, 'interested', 'I am very interested in this renewable energy project!', datetime.now().isoformat()))
        
        print(f"Created investor interest: {interest_id}")
        
        conn.commit()
        
        # Test the admin investor interests query
        print("\nTesting admin investor interests query...")
        cursor.execute('''
            SELECT 
                ii.interest_id,
                ii.land_id,
                ii.investor_id,
                ii.status,
                ii.message as comments,
                ii.investment_amount,
                ii.created_at,
                ii.updated_at,
                l.title as project_title,
                l.location_text as project_location,
                l.energy_key as project_type,
                l.capacity_mw,
                l.price_per_mwh,
                l.status as project_status,
                investor.first_name as investor_first_name,
                investor.last_name as investor_last_name,
                investor.email as investor_email,
                investor.phone as investor_phone,
                landowner.first_name || ' ' || landowner.last_name as landowner_name
            FROM investor_interests ii
            INNER JOIN lands l ON ii.land_id = l.land_id
            INNER JOIN "user" investor ON ii.investor_id = investor.user_id
            LEFT JOIN "user" landowner ON l.landowner_id = landowner.user_id
            WHERE l.status != 'draft'
            ORDER BY ii.created_at DESC
        ''')
        
        results = cursor.fetchall()
        print(f"Query returned {len(results)} results")
        
        for row in results:
            print(f"Interest ID: {row[0]}")
            print(f"Project: {row[8]} ({row[9]})")
            print(f"Investor: {row[14]} {row[15]} ({row[16]})")
            print(f"Status: {row[3]}")
            print(f"Comments: {row[4]}")
            print("---")
        
        print("\n[SUCCESS] Investor interest functionality is working!")
        
    except Exception as e:
        print(f"[ERROR] Error testing investor interest: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    test_investor_interest_fix()

