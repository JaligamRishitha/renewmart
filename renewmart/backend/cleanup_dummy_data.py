"""
Cleanup script to delete dummy lands and documents created by the seed script.
This script deletes lands with "London" in the title that match the seed pattern.
"""

from database import get_db
from sqlalchemy import text
from datetime import datetime, timedelta

def cleanup_dummy_data():
    """Delete dummy lands and their associated documents"""
    db = next(get_db())
    
    try:
        print("=" * 80)
        print("CLEANING UP DUMMY DATA")
        print("=" * 80)
        
        # Find lands with "London" in title that match the seed pattern
        # Pattern: "London [Energy Type] Project [1-2]"
        find_lands_query = text("""
            SELECT land_id, title, created_at
            FROM lands
            WHERE title LIKE 'London % Project %'
            ORDER BY created_at DESC
        """)
        
        lands_to_delete = db.execute(find_lands_query).fetchall()
        
        if not lands_to_delete:
            print("[INFO] No dummy lands found to delete.")
            return True
        
        print(f"[INFO] Found {len(lands_to_delete)} lands to delete:")
        for land in lands_to_delete:
            print(f"  - {land.title} (ID: {land.land_id}, Created: {land.created_at})")
        
        # Get all land IDs
        land_ids = [str(land.land_id) for land in lands_to_delete]
        
        # Create placeholders for IN clause
        placeholders = ', '.join([f':land_id_{i}' for i in range(len(land_ids))])
        params = {f'land_id_{i}': land_id for i, land_id in enumerate(land_ids)}
        
        # Get all document IDs for these lands
        get_doc_ids_query = text(f"""
            SELECT document_id
            FROM documents
            WHERE land_id IN ({placeholders})
        """)
        doc_ids_result = db.execute(get_doc_ids_query, params).fetchall()
        doc_ids = [str(row.document_id) for row in doc_ids_result]
        doc_count = len(doc_ids)
        
        print(f"\n[INFO] This will also delete {doc_count} associated documents.")
        print("\n[INFO] Starting deletion...")
        
        # Delete document_audit_trail records by land_id first
        delete_audit_by_land_query = text(f"""
            DELETE FROM document_audit_trail
            WHERE land_id IN ({placeholders})
               OR document_id IN (
                   SELECT document_id FROM documents WHERE land_id IN ({placeholders})
               )
        """)
        audit_result = db.execute(delete_audit_by_land_query, {**params, **params})
        audit_deleted = audit_result.rowcount
        print(f"[OK] Deleted {audit_deleted} audit trail records")
        
        # Temporarily disable the trigger to avoid foreign key constraint issues
        disable_trigger_query = text("ALTER TABLE documents DISABLE TRIGGER trg_log_document_change")
        db.execute(disable_trigger_query)
        print("[OK] Disabled document trigger")
        
        try:
            # Delete documents first
            if doc_count > 0:
                delete_docs_query = text(f"""
                    DELETE FROM documents
                    WHERE land_id IN ({placeholders})
                """)
                db.execute(delete_docs_query, params)
                print(f"[OK] Deleted {doc_count} documents")
            
            # Delete lands (CASCADE will handle other related records)
            delete_lands_query = text(f"""
                DELETE FROM lands
                WHERE land_id IN ({placeholders})
            """)
            result = db.execute(delete_lands_query, params)
            lands_deleted = result.rowcount
        finally:
            # Re-enable the trigger
            enable_trigger_query = text("ALTER TABLE documents ENABLE TRIGGER trg_log_document_change")
            db.execute(enable_trigger_query)
            print("[OK] Re-enabled document trigger")
        
        db.commit()
        
        print(f"[OK] Deleted {lands_deleted} lands")
        print("\n" + "=" * 80)
        print(f"[SUCCESS] Cleanup completed!")
        print(f"  • Deleted {lands_deleted} lands")
        print(f"  • Deleted {doc_count} documents")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Failed to cleanup dummy data: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 80)
    print("DUMMY DATA CLEANUP SCRIPT")
    print("=" * 80)
    print("\nThis script will delete all lands with titles matching:")
    print('  Pattern: "London [Energy Type] Project [1-2]"')
    print("\n⚠️  WARNING: This will permanently delete data from your database!")
    print("=" * 80)
    
    success = cleanup_dummy_data()
    exit(0 if success else 1)

