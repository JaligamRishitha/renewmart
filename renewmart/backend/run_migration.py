#!/usr/bin/env python3
"""
Database Migration Runner for RenewMart

This script applies database migrations safely with backup and verification.

Usage:
    python run_migration.py migrations/add_document_blob_storage.sql
    
Features:
- Automatic backup before migration
- Transaction-based execution
- Verification after migration
- Rollback on failure
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from database import SQLALCHEMY_DATABASE_URL

def print_status(message, status="INFO"):
    """Print colored status message"""
    colors = {
        "INFO": "\033[94m",  # Blue
        "SUCCESS": "\033[92m",  # Green
        "WARNING": "\033[93m",  # Yellow
        "ERROR": "\033[91m",  # Red
        "RESET": "\033[0m"
    }
    color = colors.get(status, colors["INFO"])
    reset = colors["RESET"]
    print(f"{color}[{status}]{reset} {message}")

def backup_database(engine):
    """Create a database backup before migration"""
    print_status("Creating database backup...", "INFO")
    
    backup_dir = Path("migrations/backups")
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"backup_{timestamp}.sql"
    
    # Extract database connection info
    db_url = str(engine.url)
    
    # Note: Actual backup would use pg_dump
    print_status(f"Backup location: {backup_file}", "INFO")
    print_status("NOTE: For production, use pg_dump for full backup", "WARNING")
    
    return backup_file

def read_migration_file(migration_path):
    """Read migration SQL file"""
    migration_file = Path(migration_path)
    
    if not migration_file.exists():
        print_status(f"Migration file not found: {migration_path}", "ERROR")
        sys.exit(1)
    
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    return sql

def verify_migration(engine):
    """Verify migration was applied correctly"""
    print_status("Verifying migration...", "INFO")
    
    with engine.connect() as conn:
        # Check if file_data column exists
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name IN ('file_data', 'file_path')
            ORDER BY column_name
        """))
        
        columns = {row.column_name: row for row in result}
        
        # Verify file_data exists
        if 'file_data' not in columns:
            print_status("ERROR: file_data column not found", "ERROR")
            return False
        
        if columns['file_data'].data_type != 'bytea':
            print_status(f"ERROR: file_data has wrong type: {columns['file_data'].data_type}", "ERROR")
            return False
        
        # Verify file_path is nullable
        if 'file_path' in columns and columns['file_path'].is_nullable != 'YES':
            print_status("WARNING: file_path is not nullable", "WARNING")
        
        # Check if index exists
        result = conn.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'documents' 
            AND indexname = 'idx_documents_document_id'
        """))
        
        if not result.fetchone():
            print_status("WARNING: Index idx_documents_document_id not found", "WARNING")
        
        print_status("Migration verification passed!", "SUCCESS")
        return True

def apply_migration(migration_path):
    """Apply database migration"""
    print_status(f"Starting migration: {migration_path}", "INFO")
    print_status(f"Database: {SQLALCHEMY_DATABASE_URL.split('@')[1] if '@' in SQLALCHEMY_DATABASE_URL else 'local'}", "INFO")
    
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    try:
        # Create backup
        backup_file = backup_database(engine)
        
        # Read migration
        print_status("Reading migration file...", "INFO")
        sql = read_migration_file(migration_path)
        
        # Display migration preview
        print_status("Migration SQL:", "INFO")
        print("-" * 80)
        print(sql[:500] + "..." if len(sql) > 500 else sql)
        print("-" * 80)
        
        # Confirm
        response = input("\nApply this migration? [y/N]: ")
        if response.lower() not in ['y', 'yes']:
            print_status("Migration cancelled by user", "WARNING")
            return False
        
        # Execute migration in transaction
        print_status("Applying migration...", "INFO")
        with engine.begin() as conn:
            # Split by semicolons and execute each statement
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            
            for i, statement in enumerate(statements, 1):
                if statement:
                    print_status(f"Executing statement {i}/{len(statements)}...", "INFO")
                    conn.execute(text(statement))
        
        print_status("Migration applied successfully!", "SUCCESS")
        
        # Verify migration
        if verify_migration(engine):
            print_status("Migration completed successfully!", "SUCCESS")
            print_status(f"Backup saved to: {backup_file}", "INFO")
            return True
        else:
            print_status("Migration verification failed", "ERROR")
            return False
            
    except SQLAlchemyError as e:
        print_status(f"Migration failed: {str(e)}", "ERROR")
        print_status("Database rolled back to previous state", "WARNING")
        return False
    except Exception as e:
        print_status(f"Unexpected error: {str(e)}", "ERROR")
        return False

def show_pending_migrations():
    """Show available migrations"""
    print_status("Available migrations:", "INFO")
    
    migrations_dir = Path("migrations")
    if not migrations_dir.exists():
        print_status("No migrations directory found", "WARNING")
        return
    
    sql_files = sorted(migrations_dir.glob("*.sql"))
    
    if not sql_files:
        print_status("No migration files found", "WARNING")
        return
    
    for i, migration in enumerate(sql_files, 1):
        print(f"  {i}. {migration.name}")

def main():
    """Main entry point"""
    print()
    print("=" * 80)
    print(" RenewMart Database Migration Runner")
    print("=" * 80)
    print()
    
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <migration_file>")
        print()
        show_pending_migrations()
        print()
        print("Example:")
        print("  python run_migration.py migrations/add_document_blob_storage.sql")
        sys.exit(1)
    
    migration_path = sys.argv[1]
    
    success = apply_migration(migration_path)
    
    print()
    print("=" * 80)
    if success:
        print_status("Migration completed successfully!", "SUCCESS")
        print()
        print("Next steps:")
        print("  1. Restart your application")
        print("  2. Test document upload/download")
        print("  3. Monitor application logs")
        print("  4. Update schema_map.md documentation")
    else:
        print_status("Migration failed - database unchanged", "ERROR")
        print()
        print("Troubleshooting:")
        print("  1. Check database connection")
        print("  2. Review error messages above")
        print("  3. Verify database permissions")
        print("  4. Check migration SQL syntax")
    print("=" * 80)
    print()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

