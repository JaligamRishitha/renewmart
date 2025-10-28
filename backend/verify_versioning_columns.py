#!/usr/bin/env python3
"""
Verify that document versioning columns were added to the database
"""
import psycopg2
import os
from dotenv import load_dotenv

def verify_columns():
    """Verify that versioning columns exist in the documents table"""
    
    # Load environment variables
    load_dotenv()
    
    # Get database credentials from .env
    db_name = os.getenv('DB_NAME', 'newmart')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'root')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    
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
            print("Connected to database successfully!")
            print("Checking document versioning columns...")
            
            # Check if versioning columns exist
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'documents' 
                AND column_name IN (
                    'version_number', 'is_latest_version', 'parent_document_id', 
                    'version_notes', 'version_status', 'review_locked_at', 
                    'review_locked_by', 'version_change_reason'
                )
                ORDER BY column_name;
            """)
            
            columns = cur.fetchall()
            
            if columns:
                print(f"\nFound {len(columns)} versioning columns:")
                print("-" * 80)
                print(f"{'Column Name':<20} {'Data Type':<15} {'Nullable':<10} {'Default'}")
                print("-" * 80)
                
                for col in columns:
                    print(f"{col[0]:<20} {col[1]:<15} {col[2]:<10} {col[3] or 'None'}")
                
                print("\nDocument versioning is properly configured!")
                
                # Check if there are any documents
                cur.execute("SELECT COUNT(*) FROM documents;")
                doc_count = cur.fetchone()[0]
                print(f"\nTotal documents in database: {doc_count}")
                
                if doc_count > 0:
                    # Check versioning data
                    cur.execute("""
                        SELECT 
                            COUNT(*) as total_docs,
                            COUNT(version_number) as with_version,
                            COUNT(CASE WHEN is_latest_version = TRUE THEN 1 END) as latest_versions
                        FROM documents;
                    """)
                    
                    stats = cur.fetchone()
                    print(f"Documents with version numbers: {stats[1]}")
                    print(f"Latest versions: {stats[2]}")
                
            else:
                print("No versioning columns found!")
                print("The migration may not have been applied correctly.")
            
    except psycopg2.OperationalError as e:
        print(f"Database connection failed: {e}")
    except Exception as e:
        print(f"Verification failed: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    verify_columns()
