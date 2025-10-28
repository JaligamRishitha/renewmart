#!/usr/bin/env python3
"""
Fix database by adding missing columns
"""
import psycopg2
from config import settings

def fix_database():
    """Add missing version control columns to database"""
    
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
            # Add version control fields
            print('Adding version control fields...')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(document_id);')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_notes TEXT;')
            
            # Add new status fields
            print('Adding status fields...')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_status VARCHAR(50) DEFAULT \'active\';')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_at TIMESTAMP WITH TIME ZONE;')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_by UUID REFERENCES "user"(user_id);')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_change_reason TEXT;')
            
            # Update existing documents
            print('Updating existing documents...')
            cur.execute('UPDATE documents SET version_number = 1, is_latest_version = TRUE WHERE version_number IS NULL;')
            
            conn.commit()
            print('✅ Database migration completed successfully')
            
    except Exception as e:
        print(f'❌ Migration failed: {e}')
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()
