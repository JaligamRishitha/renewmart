#!/usr/bin/env python3
"""
Check current database schema
"""

import sqlite3

def check_schema():
    """Check current database schema"""
    db_path = "renewmart.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check documents table structure
        print("📋 Current documents table structure:")
        cursor.execute("PRAGMA table_info(documents)")
        columns = cursor.fetchall()
        
        for col in columns:
            print(f"  {col[1]} ({col[2]}) - {'NOT NULL' if col[3] else 'NULL'} - Default: {col[4]}")
        
        # Check if audit trail table exists
        print("\n📋 Checking for audit trail table:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='document_audit_trail'")
        audit_table = cursor.fetchone()
        
        if audit_table:
            print("  ✅ document_audit_trail table exists")
            cursor.execute("PRAGMA table_info(document_audit_trail)")
            audit_columns = cursor.fetchall()
            for col in audit_columns:
                print(f"    {col[1]} ({col[2]})")
        else:
            print("  ❌ document_audit_trail table does not exist")
        
        # Check for specific land ID
        print(f"\n🔍 Checking for land ID: ff8f54a7-7e05-4d49-a71d-19a134eb3e5c")
        cursor.execute("SELECT land_id, title, landowner_id FROM lands WHERE land_id = ?", 
                      ("ff8f54a7-7e05-4d49-a71d-19a134eb3e5c",))
        land = cursor.fetchone()
        
        if land:
            print(f"  ✅ Land found: {land[1]} (Owner: {land[2]})")
            
            # Check documents for this land
            cursor.execute("SELECT COUNT(*) FROM documents WHERE land_id = ?", 
                          ("ff8f54a7-7e05-4d49-a71d-19a134eb3e5c",))
            doc_count = cursor.fetchone()[0]
            print(f"  📄 Documents for this land: {doc_count}")
            
            if doc_count > 0:
                cursor.execute("SELECT document_type, COUNT(*) FROM documents WHERE land_id = ? GROUP BY document_type", 
                              ("ff8f54a7-7e05-4d49-a71d-19a134eb3e5c",))
                doc_types = cursor.fetchall()
                for doc_type, count in doc_types:
                    print(f"    - {doc_type}: {count} documents")
        else:
            print("  ❌ Land not found")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_schema()
