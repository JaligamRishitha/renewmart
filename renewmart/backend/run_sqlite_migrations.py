#!/usr/bin/env python3
"""
SQLite Migration Runner
Run document versioning migrations on SQLite database
"""

import sqlite3
import os
from pathlib import Path

def run_migration(db_path, migration_file):
    """Run a single migration file on SQLite database"""
    print(f"Running migration: {migration_file}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Read and execute migration file
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Execute migration (split by semicolon for multiple statements)
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement:
                cursor.execute(statement)
        
        conn.commit()
        print(f"✅ Migration completed: {migration_file}")
        
    except Exception as e:
        print(f"❌ Error running migration {migration_file}: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def main():
    """Run all document versioning migrations"""
    db_path = "renewmart.db"
    migrations_dir = Path("migrations")
    
    # Check if database exists
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return
    
    # Migration files in order
    migration_files = [
        "add_document_version_control_sqlite.sql",
        "enhance_document_version_status_sqlite.sql", 
        "add_document_audit_trail_sqlite.sql"
    ]
    
    print("🚀 Starting document versioning migrations...")
    
    for migration_file in migration_files:
        migration_path = migrations_dir / migration_file
        if migration_path.exists():
            run_migration(db_path, migration_path)
        else:
            print(f"⚠️  Migration file not found: {migration_path}")
    
    print("🎉 All migrations completed!")
    
    # Verify schema
    print("\n📋 Verifying schema...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check documents table columns
    cursor.execute("PRAGMA table_info(documents)")
    columns = cursor.fetchall()
    
    required_columns = [
        'version_number', 'is_latest_version', 'version_status', 
        'review_locked_at', 'review_locked_by', 'version_change_reason'
    ]
    
    existing_columns = [col[1] for col in columns]
    
    print("Required columns status:")
    for col in required_columns:
        status = "✅" if col in existing_columns else "❌"
        print(f"  {status} {col}")
    
    # Check if audit trail table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='document_audit_trail'")
    audit_table_exists = cursor.fetchone() is not None
    print(f"  {'✅' if audit_table_exists else '❌'} document_audit_trail table")
    
    conn.close()

if __name__ == "__main__":
    main()
