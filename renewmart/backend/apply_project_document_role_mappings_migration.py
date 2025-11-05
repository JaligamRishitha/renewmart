#!/usr/bin/env python3
"""
Apply migration to create project_document_role_mappings table
"""
import os
import sys
from sqlalchemy import create_engine, text
from config import settings

def apply_migration():
    """Apply the project_document_role_mappings table migration"""
    try:
        # Get database URL
        DATABASE_URL = (
            os.getenv("RENEWMART_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or settings.DATABASE_URL
        )
        
        print(f"Connecting to database...")
        
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Read migration SQL
        migration_path = os.path.join(
            os.path.dirname(__file__),
            "migrations",
            "add_project_document_role_mappings.sql"
        )
        
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        with engine.connect() as conn:
            print("Applying migration: project_document_role_mappings table...")
            conn.execute(text(migration_sql))
            conn.commit()
            print("✅ Migration applied successfully!")
            
            # Verify table was created
            check_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'project_document_role_mappings'
                )
            """)
            table_exists = conn.execute(check_query).scalar()
            
            if table_exists:
                print("✅ Table 'project_document_role_mappings' verified and exists!")
            else:
                print("⚠️  Warning: Table check failed, but migration completed")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()

