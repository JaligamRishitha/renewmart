#!/usr/bin/env python3
"""
Apply document versioning migration to your PostgreSQL database
"""
import psycopg2
import os
from dotenv import load_dotenv

def apply_migration():
    """Apply document versioning migration to PostgreSQL database"""
    
    # Load environment variables
    load_dotenv()
    
    # Get database credentials from .env
    db_name = os.getenv('DB_NAME', 'newmart')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'root')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    
    print(f"Connecting to database: {db_name} on {db_host}:{db_port}")
    print(f"User: {db_user}")
    
    try:
        # Connect to PostgreSQL database
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        with conn.cursor() as cur:
            print("Connected successfully! Applying document versioning migration...")
            
            # Migration statements
            migrations = [
                # Add version control fields
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(document_id);",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_notes TEXT;",
                
                # Add new status fields
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_status VARCHAR(50) DEFAULT 'active';",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_by UUID REFERENCES \"user\"(user_id);",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_change_reason TEXT;",
                
                # Update existing documents
                "UPDATE documents SET version_number = 1, is_latest_version = TRUE WHERE version_number IS NULL;",
                
                # Create indexes for better performance
                "CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(land_id, document_type, version_number);",
                "CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(land_id, document_type, is_latest_version) WHERE is_latest_version = TRUE;",
                "CREATE INDEX IF NOT EXISTS idx_documents_version_status ON documents(land_id, document_type, version_status);",
                
                # Add comments
                "COMMENT ON COLUMN documents.version_number IS 'Version number of the document (1, 2, 3, etc.)';",
                "COMMENT ON COLUMN documents.is_latest_version IS 'Whether this is the latest version of the document';",
                "COMMENT ON COLUMN documents.parent_document_id IS 'Reference to the original document (for version tracking)';",
                "COMMENT ON COLUMN documents.version_notes IS 'Notes about this version (e.g., \"Updated with new survey data\")';",
                "COMMENT ON COLUMN documents.version_status IS 'Version-specific status: active, archived, under_review, locked';",
                "COMMENT ON COLUMN documents.review_locked_at IS 'Timestamp when this version was locked for review';",
                "COMMENT ON COLUMN documents.review_locked_by IS 'User who locked this version for review';",
                "COMMENT ON COLUMN documents.version_change_reason IS 'Reason for version change (e.g., \"Updated with new survey data\")';"
            ]
            
            for i, migration in enumerate(migrations, 1):
                try:
                    print(f"Executing migration {i}/{len(migrations)}...")
                    cur.execute(migration)
                    print(f"Migration {i} completed successfully")
                except psycopg2.Error as e:
                    if "already exists" in str(e) or "duplicate column" in str(e):
                        print(f"Migration {i} skipped (already exists): {str(e)[:100]}...")
                    else:
                        print(f"Migration {i} failed: {e}")
                        raise
            
            conn.commit()
            print("\nAll migrations applied successfully!")
            print("Document versioning is now enabled in your database.")
            
    except psycopg2.OperationalError as e:
        print(f"Database connection failed: {e}")
        print("Please check your database credentials in .env file")
        print("Make sure PostgreSQL is running and accessible")
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    apply_migration()
