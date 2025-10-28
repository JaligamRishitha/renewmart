#!/usr/bin/env python3
"""
Run SQL migration for document versioning
"""
import sqlite3
import os

def run_migration():
    """Run the SQL migration on SQLite database"""
    
    # Check if SQLite database exists
    db_path = "renewmart.db"
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        print("Running document versioning migration...")
        
        # Add version control fields
        print("Adding version control fields...")
        cur.execute("ALTER TABLE documents ADD COLUMN version_number INTEGER DEFAULT 1;")
        cur.execute("ALTER TABLE documents ADD COLUMN is_latest_version BOOLEAN DEFAULT 1;")
        cur.execute("ALTER TABLE documents ADD COLUMN parent_document_id TEXT;")
        cur.execute("ALTER TABLE documents ADD COLUMN version_notes TEXT;")
        
        # Add new status fields
        print("Adding status fields...")
        cur.execute("ALTER TABLE documents ADD COLUMN version_status TEXT DEFAULT 'active';")
        cur.execute("ALTER TABLE documents ADD COLUMN review_locked_at TEXT;")
        cur.execute("ALTER TABLE documents ADD COLUMN review_locked_by TEXT;")
        cur.execute("ALTER TABLE documents ADD COLUMN version_change_reason TEXT;")
        
        # Update existing documents
        print("Updating existing documents...")
        cur.execute("UPDATE documents SET version_number = 1, is_latest_version = 1 WHERE version_number IS NULL;")
        
        conn.commit()
        print("Database migration completed successfully")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Columns already exist, migration not needed")
        else:
            print(f"Migration failed: {e}")
            raise
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
