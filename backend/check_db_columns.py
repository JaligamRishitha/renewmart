#!/usr/bin/env python3
"""Quick script to check if the new database columns exist."""

import psycopg2
import sys

try:
    # Connect to the database
    conn = psycopg2.connect(
        dbname="renewmart",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5432"
    )
    cursor = conn.cursor()
    
    # Check if columns exist
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'lands' 
        AND column_name IN ('project_priority', 'project_due_date')
        ORDER BY column_name;
    """)
    
    results = cursor.fetchall()
    
    if len(results) == 2:
        print("✅ SUCCESS: Both columns exist in the database!")
        print("\nColumns found:")
        for col_name, col_type in results:
            print(f"  - {col_name}: {col_type}")
    elif len(results) == 1:
        print("⚠️  WARNING: Only one column found!")
        print(f"  Found: {results[0][0]}")
        print("\nPlease run the migration SQL to add the missing column.")
    else:
        print("❌ ERROR: Columns not found in database!")
        print("\n🔧 You need to run this SQL:")
        print("""
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_priority VARCHAR(50);
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_due_date TIMESTAMP WITH TIME ZONE;
        """)
        print("\nRun it using psql or pgAdmin, then restart the backend server.")
        sys.exit(1)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ ERROR checking database: {e}")
    print("\nMake sure:")
    print("  1. PostgreSQL is running")
    print("  2. Database 'renewmart' exists")
    print("  3. Connection settings are correct (user: postgres, password: postgres)")
    sys.exit(1)

