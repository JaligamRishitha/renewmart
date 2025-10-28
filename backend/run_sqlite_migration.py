#!/usr/bin/env python3
"""
Script to run the document assignment migration for SQLite database
"""
import os
import sys
import sqlite3
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config import settings

def run_migration():
    """Run the document assignment migration for SQLite"""
    
    # Get database path from settings
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        db_path = os.path.join(backend_dir, db_path)
    
    try:
        # Connect to the SQLite database
        print(f"Connecting to SQLite database: {db_path}")
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key constraints
        cursor = conn.cursor()
        
        # Read the migration file and convert to SQLite syntax
        migration_file = backend_dir / "migrations" / "create_document_assignments_table_sqlite.sql"
        
        if not migration_file.exists():
            print(f"Migration file not found: {migration_file}")
            return False
        
        print(f"Reading migration file: {migration_file}")
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Use the SQLite-specific migration file directly
        sqlite_sql = migration_sql
        
        # Execute the migration
        print("Executing migration...")
        cursor.executescript(sqlite_sql)
        conn.commit()
        
        print("Document assignment migration completed successfully!")
        
        # Verify the table was created
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='document_assignments'
        """)
        
        if cursor.fetchone():
            print("document_assignments table created successfully")
        else:
            print("document_assignments table was not created")
            return False
        
        # Check if the table has the expected columns
        cursor.execute("PRAGMA table_info(document_assignments)")
        columns = [row[1] for row in cursor.fetchall()]  # row[1] is column name
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

def convert_to_sqlite(sql):
    """Convert PostgreSQL SQL to SQLite SQL"""
    # Replace PostgreSQL-specific syntax with SQLite equivalents
    sql = sql.replace("gen_random_uuid()", "lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))")
    sql = sql.replace("TIMESTAMP WITH TIME ZONE", "DATETIME")
    sql = sql.replace("DEFAULT NOW()", "DEFAULT CURRENT_TIMESTAMP")
    sql = sql.replace("ON DELETE CASCADE", "ON DELETE CASCADE")
    sql = sql.replace("ON DELETE SET NULL", "ON DELETE SET NULL")
    
    # Remove PostgreSQL-specific comments and features
    lines = sql.split('\n')
    sqlite_lines = []
    
    for line in lines:
        # Skip comment lines that start with --
        if line.strip().startswith('--'):
            continue
        # Skip COMMENT ON statements
        if 'COMMENT ON' in line.upper():
            continue
        # Skip CREATE INDEX IF NOT EXISTS (SQLite handles this differently)
        if 'CREATE INDEX IF NOT EXISTS' in line.upper():
            # Convert to regular CREATE INDEX
            line = line.replace('CREATE INDEX IF NOT EXISTS', 'CREATE INDEX IF NOT EXISTS')
        sqlite_lines.append(line)
    
    return '\n'.join(sqlite_lines)

if __name__ == "__main__":
    print("Starting SQLite document assignment migration...")
    success = run_migration()
    
    if success:
        print("\nMigration completed successfully!")
        sys.exit(0)
    else:
        print("\nMigration failed!")
        sys.exit(1)
