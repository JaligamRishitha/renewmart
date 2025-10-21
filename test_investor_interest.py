#!/usr/bin/env python3
import sqlite3
import uuid
from datetime import datetime

def test_investor_interest():
    conn = sqlite3.connect('renewmart.db')
    cursor = conn.cursor()
    
    # Check for published lands
    cursor.execute('SELECT land_id, title FROM lands WHERE status = "published" LIMIT 1')
    land = cursor.fetchone()
    print('Published land:', land)
    
    # Check for investor users
    cursor.execute('SELECT user_id, first_name, last_name FROM "user" WHERE roles LIKE "%investor%" LIMIT 1')
    investor = cursor.fetchone()
    print('Investor user:', investor)
    
    if land and investor:
        # Create a test investor interest
        interest_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO investor_interests (
                interest_id, investor_id, land_id, status, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (interest_id, investor[0], land[0], 'interested', 'Test interest submission', datetime.now().isoformat()))
        
        conn.commit()
        print('Created test investor interest:', interest_id)
        
        # Verify it was created
        cursor.execute('SELECT COUNT(*) FROM investor_interests')
        count = cursor.fetchone()[0]
        print('Total investor interests:', count)
        
        # Show the created record
        cursor.execute('''
            SELECT ii.interest_id, ii.investor_id, ii.land_id, ii.status, ii.message, ii.created_at,
                   l.title, u.first_name, u.last_name
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            JOIN "user" u ON ii.investor_id = u.user_id
            WHERE ii.interest_id = ?
        ''', (interest_id,))
        
        record = cursor.fetchone()
        print('Created record:', record)
    
    conn.close()

if __name__ == '__main__':
    test_investor_interest()

