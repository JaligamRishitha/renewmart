#!/usr/bin/env python3
"""
Run document versioning migrations
"""
import psycopg2
from config import settings

def run_migrations():
    """Run document versioning migrations"""
    
    # Connect to database
    conn = psycopg2.connect(
        host=settings.DATABASE_HOST,
        port=settings.DATABASE_PORT,
        database=settings.DATABASE_NAME,
        user=settings.DATABASE_USER,
        password=settings.DATABASE_PASSWORD
    )
    
    try:
        with conn.cursor() as cur:
            # Read and execute enhance_document_version_status.sql
            print("Running document version status migration...")
            with open('migrations/enhance_document_version_status.sql', 'r') as f:
                migration_sql = f.read()
            cur.execute(migration_sql)
            
            # Read and execute add_document_audit_trail.sql
            print("Running document audit trail migration...")
            with open('migrations/add_document_audit_trail.sql', 'r') as f:
                audit_sql = f.read()
            cur.execute(audit_sql)
            
            conn.commit()
            print("✅ Migrations executed successfully")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migrations()
