#!/usr/bin/env python3
import sys
sys.path.append('backend')

from backend.database import engine
from sqlalchemy import text

def check_database_schema():
    """Check the actual database schema"""
    conn = engine.connect()
    
    try:
        print("Checking database schema...")
        
        # Check investor_interests table structure (SQLite)
        result = conn.execute(text("PRAGMA table_info(investor_interests)"))
        
        columns = result.fetchall()
        print("\ninvestor_interests table columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) - nullable: {not col[3]}")
        
        # Check if there are any records
        result = conn.execute(text("SELECT COUNT(*) FROM investor_interests"))
        count = result.fetchone()[0]
        print(f"\nNumber of records in investor_interests: {count}")
        
        # Check lands table structure (SQLite)
        result = conn.execute(text("PRAGMA table_info(lands)"))
        
        columns = result.fetchall()
        print("\nlands table columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) - nullable: {not col[3]}")
        
        # Check user table structure (SQLite)
        result = conn.execute(text("PRAGMA table_info(user)"))
        
        columns = result.fetchall()
        print("\nuser table columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) - nullable: {not col[3]}")
        
    except Exception as e:
        print(f"Error checking schema: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    check_database_schema()
