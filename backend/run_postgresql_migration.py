#!/usr/bin/env python3
"""
Run PostgreSQL migration for document versioning
"""
import psycopg2
from config import settings

def run_postgresql_migration():
    """Run the PostgreSQL migration for document versioning"""
    
    try:
        # Connect to PostgreSQL database
        conn = psycopg2.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            database=settings.DATABASE_NAME,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD
        )
        
        with conn.cursor() as cur:
            print("Running PostgreSQL document versioning migration...")
            
            # Read and execute migration
            with open('migrations/add_versioning_to_postgresql.sql', 'r') as f:
                migration_sql = f.read()
            
            # Split by semicolon and execute each statement
            statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
            
            for statement in statements:
                if statement:
                    try:
                        cur.execute(statement)
                        print(f"Executed: {statement[:50]}...")
                    except psycopg2.Error as e:
                        if "already exists" in str(e) or "duplicate column" in str(e):
                            print(f"Skipped (already exists): {statement[:50]}...")
                        else:
                            print(f"Error executing: {statement[:50]}... - {e}")
                            raise
            
            conn.commit()
            print("PostgreSQL migration completed successfully")
            
    except psycopg2.OperationalError as e:
        print(f"Database connection failed: {e}")
        print("Please check your database configuration in settings.toml")
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_postgresql_migration()
