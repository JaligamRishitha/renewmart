#!/usr/bin/env python3
"""
Run the document version control migration
"""
import os
import sys
from sqlalchemy import create_engine, text
from config import settings

def run_migration():
    """Run the document version control migration"""
    try:
        # Get database URL
        DATABASE_URL = (
            os.getenv("RENEWMART_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or settings.DATABASE_URL
        )
        
        print(f"Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")
        
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Read migration SQL
        migration_sql = """
        -- Add version control fields
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(document_id);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_notes TEXT;

        -- Create index for version queries
        CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(land_id, document_type, version_number);
        CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(land_id, document_type, is_latest_version) WHERE is_latest_version = TRUE;

        -- Add comment to document the change
        COMMENT ON COLUMN documents.version_number IS 'Version number of the document (1, 2, 3, etc.)';
        COMMENT ON COLUMN documents.is_latest_version IS 'Whether this is the latest version of the document';
        COMMENT ON COLUMN documents.parent_document_id IS 'Reference to the original document (for version tracking)';
        COMMENT ON COLUMN documents.version_notes IS 'Notes about this version (e.g., "Updated with new survey data")';

        -- Update existing documents to have version 1 and be latest
        UPDATE documents SET version_number = 1, is_latest_version = TRUE WHERE version_number IS NULL;
        """
        
        # Execute migration
        with engine.connect() as connection:
            connection.execute(text(migration_sql))
            connection.commit()
            
        print("SUCCESS: Document version control migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"ERROR: Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
