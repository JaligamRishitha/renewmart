#!/usr/bin/env python3
"""
Script to run the document assignment migration
"""
import os
import sys
import psycopg2
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config import settings

def run_migration():
    """Run the document assignment migration"""
    
    # Database connection parameters
    db_params = {
        'host': settings.DATABASE_HOST,
        'port': settings.DATABASE_PORT,
        'database': settings.DATABASE_NAME,
        'user': settings.DATABASE_USER,
        'password': settings.DATABASE_PASSWORD
    }
    
    try:
        # Connect to the database
        print("Connecting to database...")
        conn = psycopg2.connect(**db_params)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Read the migration file
        migration_file = backend_dir / "migrations" / "create_document_assignments_table.sql"
        
        if not migration_file.exists():
            print(f"Migration file not found: {migration_file}")
            return False
        
        print(f"Reading migration file: {migration_file}")
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Execute the migration
        print("Executing migration...")
        cursor.execute(migration_sql)
        
        print("Document assignment migration completed successfully!")
        
        # Verify the table was created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'document_assignments'
        """)
        
        if cursor.fetchone():
            print("document_assignments table created successfully")
        else:
            print("document_assignments table was not created")
            return False
        
        # Check if the table has the expected columns
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'document_assignments'
            ORDER BY ordinal_position
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        expected_columns = [
            'assignment_id', 'document_id', 'land_id', 'assigned_to', 'assigned_by',
            'reviewer_role', 'task_id', 'assignment_status', 'assignment_notes',
            'assigned_at', 'started_at', 'completed_at', 'due_date', 'priority',
            'is_locked', 'lock_reason'
        ]
        
        missing_columns = set(expected_columns) - set(columns)
        if missing_columns:
            print(f"Missing columns: {missing_columns}")
            return False
        else:
            print("All expected columns are present")
        
        return True
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False
    
    finally:
        if 'conn' in locals():
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    print("Starting document assignment migration...")
    success = run_migration()
    
    if success:
        print("\nMigration completed successfully!")
        sys.exit(0)
    else:
        print("\nMigration failed!")
        sys.exit(1)
