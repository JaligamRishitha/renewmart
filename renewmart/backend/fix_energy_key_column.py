#!/usr/bin/env python3
"""
Fix database by adding missing energy_key column to lands table
"""
import psycopg2
from sqlalchemy import create_engine, text
from database import engine
from config import settings
import sys

def fix_energy_key_column():
    """Add missing energy_key column to lands table"""
    
    try:
        # Connect to database using SQLAlchemy engine
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            
            try:
                print("🔍 Checking if energy_key column exists...")
                
                # Check if column exists
                check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'lands' 
                    AND column_name = 'energy_key';
                """)
                
                result = conn.execute(check_query)
                column_exists = result.fetchone() is not None
                
                if column_exists:
                    print("✅ energy_key column already exists in lands table")
                    trans.commit()
                    return True
                
                print("⚠️  energy_key column not found. Adding it now...")
                
                # Check if lu_energy_type table exists (for foreign key constraint)
                check_table_query = text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'lu_energy_type'
                    );
                """)
                
                table_result = conn.execute(check_table_query)
                energy_type_table_exists = table_result.fetchone()[0]
                
                if energy_type_table_exists:
                    # Add column with foreign key constraint
                    print("   Adding column with foreign key to lu_energy_type...")
                    add_column_query = text("""
                        ALTER TABLE lands 
                        ADD COLUMN IF NOT EXISTS energy_key TEXT 
                        REFERENCES lu_energy_type(energy_key);
                    """)
                else:
                    # Add column without foreign key constraint
                    print("   Adding column without foreign key (lu_energy_type table not found)...")
                    add_column_query = text("""
                        ALTER TABLE lands 
                        ADD COLUMN IF NOT EXISTS energy_key TEXT;
                    """)
                
                conn.execute(add_column_query)
                
                # Create index if it doesn't exist
                print("   Creating index on energy_key...")
                create_index_query = text("""
                    CREATE INDEX IF NOT EXISTS idx_lands_energy 
                    ON lands(energy_key);
                """)
                conn.execute(create_index_query)
                
                trans.commit()
                print("✅ Successfully added energy_key column to lands table")
                return True
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Error adding column: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print(f"\nPlease check:")
        print(f"  1. Database is running")
        print(f"  2. Connection settings in config are correct")
        print(f"  3. DATABASE_URL: {settings.DATABASE_URL if hasattr(settings, 'DATABASE_URL') else 'Not set'}")
        return False

if __name__ == "__main__":
    print("🚀 Starting energy_key column migration...")
    success = fix_energy_key_column()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("   You can now create lands with energy_key field.")
        sys.exit(0)
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        sys.exit(1)

