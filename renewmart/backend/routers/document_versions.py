"""
Document version management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import Document, MessageResponse
from notification_service import NotificationService

router = APIRouter(prefix="/document-versions", tags=["document-versions"])

@router.get("/land/{land_id}/document-type/{document_type}", response_model=List[Document])
async def get_document_versions(
    land_id: UUID,
    document_type: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all versions of a specific document type for a land"""
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    # Get land info to check ownership
    land_check = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    is_admin = "administrator" in user_roles
    is_owner = user_id_str == str(land_result.landowner_id)
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view document versions"
        )
    
    # Get all versions of the document (exclude subtask documents)
    query = text("""
        SELECT d.*, u.first_name, u.last_name, u.email as uploader_email,
               approver.first_name as approver_first_name, approver.last_name as approver_last_name
        FROM documents d
        LEFT JOIN "user" u ON d.uploaded_by = u.user_id
        LEFT JOIN "user" approver ON d.approved_by = approver.user_id
        WHERE d.land_id = :land_id AND d.document_type = :document_type
        AND d.subtask_id IS NULL
        ORDER BY d.doc_slot, d.version_number DESC, d.created_at DESC
    """)
    
    result = db.execute(query, {
        "land_id": str(land_id),
        "document_type": document_type
    }).fetchall()
    
    documents = []
    for row in result:
        doc_dict = dict(row._mapping)
        # Convert to Document schema format
        documents.append({
            "document_id": doc_dict["document_id"],
            "land_id": doc_dict["land_id"],
            "document_type": doc_dict["document_type"],
            "file_name": doc_dict["file_name"],
            "file_size": doc_dict["file_size"],
            "mime_type": doc_dict["mime_type"],
            "is_draft": doc_dict["is_draft"],
            "status": doc_dict["status"],
            "approved_by": doc_dict.get("approved_by"),
            "approved_at": doc_dict.get("approved_at"),
            "rejection_reason": doc_dict.get("rejection_reason"),
            "version_number": doc_dict["version_number"],
            "is_latest_version": doc_dict["is_latest_version"],
            "version_status": doc_dict["version_status"],
            "version_notes": doc_dict["version_notes"],
            "version_change_reason": doc_dict["version_change_reason"],
            "review_locked_at": doc_dict["review_locked_at"],
            "review_locked_by": doc_dict.get("review_locked_by"),
            "created_at": doc_dict["created_at"],
            "doc_slot": doc_dict.get("doc_slot", "D1"),
            "uploader_name": f"{doc_dict['first_name']} {doc_dict['last_name']}" if doc_dict['first_name'] else doc_dict['uploader_email'],
            "approver_name": f"{doc_dict['approver_first_name']} {doc_dict['approver_last_name']}" if doc_dict.get('approver_first_name') else None
        })
    
    return documents

@router.post("/{document_id}/lock-for-review")
async def lock_document_for_review(
    document_id: UUID,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lock a document version for review (admin only)"""
    
    # Get document info
    doc_query = text("""
        SELECT d.*, l.land_id, l.title as land_title
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_query, {"document_id": str(document_id)}).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if already locked
    if doc_result.review_locked_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is already locked for review"
        )
    
    # Lock the document
    lock_query = text("""
        UPDATE documents 
        SET version_status = 'under_review',
            review_locked_at = :locked_at,
            review_locked_by = :locked_by,
            version_change_reason = :reason
        WHERE document_id = :document_id
    """)
    
    db.execute(lock_query, {
        "document_id": str(document_id),
        "locked_at": datetime.utcnow(),
        "locked_by": current_user["user_id"],
        "reason": reason
    })
    
    db.commit()
    
    # Send notification
    notification_service = NotificationService(db)
    notification_service.notify_review_lock(
        str(doc_result.land_id),
        doc_result.document_type,
        doc_result.version_number,
        str(current_user["user_id"]),
        reason
    )
    
    return {"message": "Document locked for review successfully"}

@router.post("/{document_id}/unlock")
async def unlock_document(
    document_id: UUID,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Unlock a document version from review (admin only)"""
    
    # Get document info
    doc_query = text("""
        SELECT d.*, l.land_id, l.title as land_title
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_query, {"document_id": str(document_id)}).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if locked
    if not doc_result.review_locked_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not locked for review"
        )
    
    # Unlock the document
    unlock_query = text("""
        UPDATE documents 
        SET version_status = 'active',
            review_locked_at = NULL,
            review_locked_by = NULL,
            version_change_reason = :reason
        WHERE document_id = :document_id
    """)
    
    db.execute(unlock_query, {
        "document_id": str(document_id),
        "reason": reason
    })
    
    db.commit()
    
    # Send notification
    notification_service = NotificationService(db)
    notification_service.notify_status_change(
        str(doc_result.land_id),
        doc_result.document_type,
        doc_result.version_number,
        str(current_user["user_id"]),
        'active',
        reason
    )
    
    return {"message": "Document unlocked successfully"}

@router.post("/{document_id}/archive")
async def archive_document_version(
    document_id: UUID,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Archive a document version (admin only)"""
    
    # Get document info
    doc_query = text("""
        SELECT d.*, l.land_id, l.title as land_title
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_query, {"document_id": str(document_id)}).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Archive the document
    archive_query = text("""
        UPDATE documents 
        SET version_status = 'archived',
            version_change_reason = :reason
        WHERE document_id = :document_id
    """)
    
    db.execute(archive_query, {
        "document_id": str(document_id),
        "reason": reason
    })
    
    db.commit()
    
    # Send notification
    notification_service = NotificationService(db)
    notification_service.notify_status_change(
        str(doc_result.land_id),
        doc_result.document_type,
        doc_result.version_number,
        str(current_user["user_id"]),
        'archived',
        reason
    )
    
    return {"message": "Document version archived successfully"}

@router.post("/{document_id}/approve")
async def approve_document_version(
    document_id: UUID,
    reason: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a document version that is under review (reviewer action)"""
    
    # Get document info
    doc_query = text("""
        SELECT d.*, l.land_id, l.title as land_title, t.assigned_to, t.assigned_role
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        LEFT JOIN tasks t ON d.land_id = t.land_id AND t.assigned_to = :user_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_query, {
        "document_id": str(document_id),
        "user_id": str(current_user["user_id"])
    }).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Convert result to dict for easier access
    doc_dict = dict(doc_result._mapping)
    
    # Check if document is under review
    version_status = doc_dict.get('version_status') or doc_dict.get('d.version_status')
    if version_status != 'under_review':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not under review. Only documents under review can be approved."
        )
    
    # Check permissions - user must be assigned as reviewer for this land
    user_roles = current_user.get("roles", [])
    user_id = current_user["user_id"]
    user_id_str = str(user_id)
    is_admin = "administrator" in user_roles
    
    # Get land_id from document
    land_id = doc_dict.get('land_id') or doc_dict.get('d.land_id')
    if not land_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document does not have an associated land"
        )
    
    # Check if user is assigned as reviewer for this land
    reviewer_check = text("""
        SELECT assigned_role FROM tasks 
        WHERE land_id = :land_id AND assigned_to = :user_id
        LIMIT 1
    """)
    reviewer_result = db.execute(reviewer_check, {
        "land_id": str(land_id),
        "user_id": user_id_str
    }).fetchone()
    
    if not is_admin and not reviewer_result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only assigned reviewers can approve documents."
        )
    
    # Approve the document
    approve_query = text("""
        UPDATE documents 
        SET status = 'approved',
            version_status = 'active',
            approved_by = CAST(:approved_by AS uuid),
            approved_at = :approved_at,
            version_change_reason = :reason,
            review_locked_at = NULL,
            review_locked_by = NULL
        WHERE document_id = CAST(:document_id AS uuid)
        RETURNING document_id, land_id, document_type, version_number
    """)
    
    try:
        result = db.execute(approve_query, {
            "document_id": str(document_id),
            "approved_by": user_id_str,
            "approved_at": datetime.utcnow(),
            "reason": reason or "Approved by reviewer"
        })
        db.commit()
        
        # Get updated document info for notification
        updated_doc = result.fetchone()
        if updated_doc:
            updated_doc_dict = dict(updated_doc._mapping)
        else:
            # Fallback to original doc_dict
            updated_doc_dict = doc_dict
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve document: {str(e)}"
        )
    
    # Send notification (with error handling)
    try:
        notification_service = NotificationService(db)
        notification_service.notify_status_change(
            str(land_id),
            updated_doc_dict.get('document_type') or doc_dict.get('document_type', 'unknown'),
            updated_doc_dict.get('version_number') or doc_dict.get('version_number', 1),
            user_id_str,
            'approved',
            reason or "Approved by reviewer"
        )
    except Exception as e:
        # Log notification error but don't fail the approval
        print(f"Warning: Failed to send notification: {str(e)}")
    
    return {"message": "Document version approved successfully"}

@router.post("/{document_id}/reject")
async def reject_document_version(
    document_id: UUID,
    rejection_reason: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a document version that is under review (reviewer action)"""
    
    # Get document info
    doc_query = text("""
        SELECT d.*, l.land_id, l.title as land_title, t.assigned_to, t.assigned_role
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        LEFT JOIN tasks t ON d.land_id = t.land_id AND t.assigned_to = :user_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_query, {
        "document_id": str(document_id),
        "user_id": str(current_user["user_id"])
    }).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Convert result to dict for easier access
    doc_dict = dict(doc_result._mapping)
    
    # Check if document is under review
    version_status = doc_dict.get('version_status') or doc_dict.get('d.version_status')
    if version_status != 'under_review':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not under review. Only documents under review can be rejected."
        )
    
    # Check permissions - user must be assigned as reviewer for this land
    user_roles = current_user.get("roles", [])
    user_id = current_user["user_id"]
    user_id_str = str(user_id)
    is_admin = "administrator" in user_roles
    
    # Get land_id from document
    land_id = doc_dict.get('land_id') or doc_dict.get('d.land_id')
    if not land_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document does not have an associated land"
        )
    
    # Check if user is assigned as reviewer for this land
    reviewer_check = text("""
        SELECT assigned_role FROM tasks 
        WHERE land_id = :land_id AND assigned_to = :user_id
        LIMIT 1
    """)
    reviewer_result = db.execute(reviewer_check, {
        "land_id": str(land_id),
        "user_id": user_id_str
    }).fetchone()
    
    if not is_admin and not reviewer_result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only assigned reviewers can reject documents."
        )
    
    if not rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )
    
    # Reject the document
    reject_query = text("""
        UPDATE documents 
        SET status = 'rejected',
            version_status = 'active',
            approved_by = CAST(:approved_by AS uuid),
            approved_at = :approved_at,
            rejection_reason = :rejection_reason,
            version_change_reason = :reason,
            review_locked_at = NULL,
            review_locked_by = NULL
        WHERE document_id = CAST(:document_id AS uuid)
        RETURNING document_id, land_id, document_type, version_number
    """)
    
    try:
        result = db.execute(reject_query, {
            "document_id": str(document_id),
            "approved_by": user_id_str,
            "approved_at": datetime.utcnow(),
            "rejection_reason": rejection_reason,
            "reason": f"Rejected: {rejection_reason}"
        })
        db.commit()
        
        # Get updated document info for notification
        updated_doc = result.fetchone()
        if updated_doc:
            updated_doc_dict = dict(updated_doc._mapping)
        else:
            # Fallback to original doc_dict
            updated_doc_dict = doc_dict
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject document: {str(e)}"
        )
    
    # Send notification (with error handling)
    try:
        notification_service = NotificationService(db)
        notification_service.notify_status_change(
            str(land_id),
            updated_doc_dict.get('document_type') or doc_dict.get('document_type', 'unknown'),
            updated_doc_dict.get('version_number') or doc_dict.get('version_number', 1),
            user_id_str,
            'rejected',
            rejection_reason
        )
    except Exception as e:
        # Log notification error but don't fail the rejection
        print(f"Warning: Failed to send notification: {str(e)}")
    
    return {"message": "Document version rejected successfully"}

@router.get("/land/{land_id}/status-summary")
async def get_document_status_summary(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status summary of all documents for a land"""
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    # Get land info to check ownership
    land_check = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    is_admin = "administrator" in user_roles
    is_owner = user_id_str == str(land_result.landowner_id)
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view document status"
        )
    
    # Get status summary (exclude subtask documents)
    summary_query = text("""
        SELECT 
            document_type,
            COUNT(*) as total_versions,
            COUNT(CASE WHEN is_latest_version = TRUE THEN 1 END) as latest_versions,
            COUNT(CASE WHEN version_status = 'active' THEN 1 END) as active_versions,
            COUNT(CASE WHEN version_status = 'under_review' THEN 1 END) as under_review_versions,
            COUNT(CASE WHEN version_status = 'archived' THEN 1 END) as archived_versions,
            MAX(version_number) as max_version,
            MAX(created_at) as last_updated
        FROM documents 
        WHERE land_id = :land_id
        AND subtask_id IS NULL
        GROUP BY document_type
        ORDER BY document_type
    """)
    
    result = db.execute(summary_query, {"land_id": str(land_id)}).fetchall()
    
    summary = []
    for row in result:
        summary.append({
            "document_type": row.document_type,
            "total_versions": row.total_versions,
            "latest_versions": row.latest_versions,
            "active_versions": row.active_versions,
            "under_review_versions": row.under_review_versions,
            "archived_versions": row.archived_versions,
            "max_version": row.max_version,
            "last_updated": row.last_updated
        })
    
    return summary

@router.get("/land/{land_id}/audit-trail")
async def get_document_audit_trail(
    land_id: UUID,
    document_type: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit trail for document changes in a land"""
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    # Get land info to check ownership
    land_check = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    is_admin = "administrator" in user_roles
    is_owner = user_id_str == str(land_result.landowner_id)
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view audit trail"
        )
    
    # Build query with filters
    where_conditions = ["dat.land_id = :land_id"]
    params = {"land_id": str(land_id), "limit": limit, "offset": offset}
    
    if document_type:
        where_conditions.append("d.document_type = :document_type")
        params["document_type"] = document_type
    
    if action_type:
        where_conditions.append("dat.action_type = :action_type")
        params["action_type"] = action_type
    
    where_clause = " AND ".join(where_conditions)
    
    # Get audit trail
    query = text(f"""
        SELECT 
            dat.*,
            d.document_type,
            d.file_name,
            u.first_name,
            u.last_name,
            u.email as user_email
        FROM document_audit_trail dat
        LEFT JOIN documents d ON dat.document_id = d.document_id
        LEFT JOIN "user" u ON dat.changed_by = u.user_id
        WHERE {where_clause}
        ORDER BY dat.created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    
    result = db.execute(query, params).fetchall()
    
    audit_entries = []
    for row in result:
        audit_entries.append({
            "audit_id": row.audit_id,
            "document_id": row.document_id,
            "land_id": row.land_id,
            "action_type": row.action_type,
            "old_status": row.old_status,
            "new_status": row.new_status,
            "old_version_number": row.old_version_number,
            "new_version_number": row.new_version_number,
            "changed_by": row.changed_by,
            "change_reason": row.change_reason,
            "metadata": row.metadata,
            "created_at": row.created_at,
            "document_type": row.document_type,
            "file_name": row.file_name,
            "user_name": f"{row.first_name} {row.last_name}" if row.first_name else row.user_email
        })
    
    # Get total count for pagination
    count_query = text(f"""
        SELECT COUNT(*) as total
        FROM document_audit_trail dat
        LEFT JOIN documents d ON dat.document_id = d.document_id
        WHERE {where_clause}
    """)
    
    count_result = db.execute(count_query, params).fetchone()
    total_count = count_result.total if count_result else 0
    
    return {
        "audit_entries": audit_entries,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total_count
    }