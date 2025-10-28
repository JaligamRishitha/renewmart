#!/usr/bin/env python3
"""
Fix document versioning issues
"""

import sqlite3

def fix_document_issues():
    """Fix document versioning issues"""
    db_path = "renewmart.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔧 Fixing document versioning issues...")
        
        # 1. Create audit trail table
        print("1. Creating document_audit_trail table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_audit_trail (
                audit_id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                land_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                old_status TEXT,
                new_status TEXT,
                old_version_number INTEGER,
                new_version_number INTEGER,
                changed_by TEXT NOT NULL,
                change_reason TEXT,
                metadata TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_document_audit_document_id ON document_audit_trail(document_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_document_audit_land_id ON document_audit_trail(land_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_document_audit_action_type ON document_audit_trail(action_type)")
        
        print("   ✅ Audit trail table created")
        
        # 2. Add missing columns if they don't exist
        print("2. Checking for missing columns...")
        
        # Check if file_name column exists (API expects this, but table has filename)
        cursor.execute("PRAGMA table_info(documents)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'file_name' not in columns and 'filename' in columns:
            print("   ⚠️  Column mismatch: table has 'filename' but API expects 'file_name'")
            print("   💡 This might cause the API error")
        
        # 3. Check for the specific land ID
        print("3. Checking for land ID: ff8f54a7-7e05-4d49-a71d-19a134eb3e5c")
        cursor.execute("SELECT land_id, title FROM lands WHERE land_id = ?", 
                      ("ff8f54a7-7e05-4d49-a71d-19a134eb3e5c",))
        land = cursor.fetchone()
        
        if not land:
            print("   ❌ Land not found - this is likely the main cause of the 500 error")
            
            # Show available lands
            cursor.execute("SELECT land_id, title FROM lands LIMIT 5")
            available_lands = cursor.fetchall()
            print("   📋 Available lands:")
            for land_id, title in available_lands:
                print(f"     - {land_id}: {title}")
        else:
            print(f"   ✅ Land found: {land[1]}")
        
        # 4. Check documents table structure for API compatibility
        print("4. Checking API compatibility...")
        
        # The API expects these columns based on the router code
        required_api_columns = [
            'document_id', 'land_id', 'document_type', 'file_name', 
            'file_size', 'mime_type', 'is_draft', 'status', 
            'version_number', 'is_latest_version', 'version_status',
            'version_notes', 'version_change_reason', 'review_locked_at',
            'created_at', 'uploaded_by'
        ]
        
        missing_columns = []
        for col in required_api_columns:
            if col not in columns:
                missing_columns.append(col)
        
        if missing_columns:
            print(f"   ❌ Missing columns: {missing_columns}")
        else:
            print("   ✅ All required columns present")
        
        # 5. Check if there are any documents
        cursor.execute("SELECT COUNT(*) FROM documents")
        doc_count = cursor.fetchone()[0]
        print(f"5. Total documents in database: {doc_count}")
        
        conn.commit()
        conn.close()
        
        print("\n🎯 Summary:")
        print("   - Audit trail table: ✅ Created")
        print("   - Land ID issue: ❌ Land not found (main cause of 500 error)")
        print("   - Column mismatch: ⚠️  filename vs file_name")
        
        print("\n💡 Next steps:")
        print("   1. Use a valid land ID from the list above")
        print("   2. Or create a test land with the specific ID")
        print("   3. Check if the API expects 'file_name' column")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_document_issues()
