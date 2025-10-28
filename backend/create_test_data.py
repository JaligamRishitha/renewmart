#!/usr/bin/env python3
"""
Create test data to fix the 500 error
"""

import sqlite3
import uuid
from datetime import datetime

def create_test_data():
    """Create test land and documents"""
    db_path = "renewmart.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🚀 Creating test data...")
        
        # 1. Create test land with the specific ID
        land_id = "ff8f54a7-7e05-4d49-a71d-19a134eb3e5c"
        print(f"1. Creating test land: {land_id}")
        
        # First check if lands table exists and get its structure
        cursor.execute("PRAGMA table_info(lands)")
        land_columns = [col[1] for col in cursor.fetchall()]
        print(f"   Lands table columns: {land_columns}")
        
        # Create land with minimal required fields
        cursor.execute("""
            INSERT OR REPLACE INTO lands (
                land_id, title, landowner_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?)
        """, (
            land_id,
            "Test Land Property",
            "test-user-id",  # You'll need a real user ID
            "active",
            datetime.now().isoformat()
        ))
        
        print("   ✅ Test land created")
        
        # 2. Add missing columns to documents table
        print("2. Adding missing columns to documents table...")
        
        missing_columns = [
            ("document_type", "TEXT"),
            ("file_name", "TEXT"), 
            ("is_draft", "BOOLEAN DEFAULT 1"),
            ("status", "TEXT DEFAULT 'pending'"),
            ("created_at", "TEXT DEFAULT (datetime('now'))")
        ]
        
        for col_name, col_def in missing_columns:
            try:
                cursor.execute(f"ALTER TABLE documents ADD COLUMN {col_name} {col_def}")
                print(f"   ✅ Added column: {col_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"   ⚠️  Column already exists: {col_name}")
                else:
                    print(f"   ❌ Error adding {col_name}: {e}")
        
        # 3. Create test document
        print("3. Creating test document...")
        
        document_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO documents (
                document_id, land_id, filename, original_filename, file_path,
                file_size, mime_type, uploaded_by, document_type, file_name,
                is_draft, status, version_number, is_latest_version, version_status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            document_id,
            land_id,
            "test_document.pdf",
            "test_document.pdf", 
            "/uploads/test_document.pdf",
            1024,
            "application/pdf",
            "test-user-id",
            "survey_report",
            "test_document.pdf",
            0,  # is_draft = False
            "pending",
            1,  # version_number
            1,  # is_latest_version
            "active",
            datetime.now().isoformat()
        ))
        
        print("   ✅ Test document created")
        
        # 4. Verify the fix
        print("4. Verifying the fix...")
        
        # Check land exists
        cursor.execute("SELECT land_id, title FROM lands WHERE land_id = ?", (land_id,))
        land = cursor.fetchone()
        if land:
            print(f"   ✅ Land verified: {land[1]}")
        
        # Check document exists
        cursor.execute("SELECT COUNT(*) FROM documents WHERE land_id = ?", (land_id,))
        doc_count = cursor.fetchone()[0]
        print(f"   ✅ Documents for land: {doc_count}")
        
        # Test the API query
        cursor.execute("""
            SELECT 
                document_type,
                COUNT(*) as total_versions,
                COUNT(CASE WHEN is_latest_version = 1 THEN 1 END) as latest_versions,
                COUNT(CASE WHEN version_status = 'active' THEN 1 END) as active_versions
            FROM documents 
            WHERE land_id = ?
            GROUP BY document_type
        """, (land_id,))
        
        result = cursor.fetchone()
        if result:
            print(f"   ✅ API query test successful: {result}")
        
        conn.commit()
        conn.close()
        
        print("\n🎉 Test data created successfully!")
        print("   Now try the API endpoint again:")
        print(f"   GET http://127.0.0.1:8000/api/document-versions/land/{land_id}/status-summary")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_test_data()
