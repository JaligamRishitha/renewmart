"""
Reviewer API endpoints for document management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from auth import get_current_user, require_admin, require_reviewer
from models.schemas import Document, MessageResponse
from notification_service import NotificationService

router = APIRouter(prefix="/reviewer", tags=["reviewer"])

@router.get("/documents/assigned", response_model=List[Document])
async def get_assigned_documents(
    current_user: dict = Depends(require_reviewer),
    db: Session = Depends(get_db)
):
    """Get documents assigned to the current reviewer"""
    
    user_id = current_user["user_id"]
    
    # Get documents assigned to this reviewer (exclude subtask documents)
    query = text("""
        SELECT d.*, u.first_name, u.last_name, u.email as uploader_email,
               l.title as land_title, l.land_id
        FROM documents d
        LEFT JOIN "user" u ON d.uploaded_by = u.user_id
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.review_locked_by = :user_id
        AND d.version_status = 'under_review'
        AND d.subtask_id IS NULL
        ORDER BY d.review_locked_at DESC
    """)
    
    result = db.execute(query, {"user_id": str(user_id)}).fetchall()
    
    documents = []
    for row in result:
        doc_dict = dict(row._mapping)
        documents.append({
            "document_id": doc_dict["document_id"],
            "land_id": doc_dict["land_id"],
            "land_title": doc_dict["land_title"],
            "document_type": doc_dict["document_type"],
            "file_name": doc_dict["file_name"],
            "file_size": doc_dict["file_size"],
            "mime_type": doc_dict["mime_type"],
            "version_number": doc_dict["version_number"],
            "is_latest_version": doc_dict["is_latest_version"],
            "version_status": doc_dict["version_status"],
            "version_notes": doc_dict["version_notes"],
            "review_locked_at": doc_dict["review_locked_at"],
            "created_at": doc_dict["created_at"],
            "uploader_name": f"{doc_dict['first_name']} {doc_dict['last_name']}" if doc_dict['first_name'] else doc_dict['uploader_email']
        })
    
    return documents

@router.post("/documents/{document_id}/claim")
async def claim_document_for_review(
    document_id: UUID,
    current_user: dict = Depends(require_reviewer),
    db: Session = Depends(get_db)
):
    """Claim a document for review (mark as under_review) - Only one version per type can be under review"""
    
    user_id = current_user["user_id"]
    
    # Get document info using stored procedure
    doc_result = db.execute(
        text("SELECT * FROM get_document_info_for_lock(CAST(:document_id AS uuid))"),
        {"document_id": str(document_id)}
    ).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    print(f"Document found: document_id={document_id}, land_id={doc_result.land_id}, document_type={doc_result.document_type}")
    
    # Check if document is already under review
    if hasattr(doc_result, 'version_status') and doc_result.version_status == 'under_review':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is already under review"
        )
    
    # Get doc_slot from database since it's not in the function result
    doc_slot_result = db.execute(
        text("SELECT doc_slot FROM documents WHERE document_id = :document_id"),
        {"document_id": str(document_id)}
    ).fetchone()
    
    doc_slot = doc_slot_result[0] if doc_slot_result and doc_slot_result[0] else 'D1'
    
    # Check if another document of the same type is already under review
    # Check if version_status column exists using stored procedure
    column_exists = db.execute(
        text("SELECT check_column_exists('documents', 'version_status')")
    ).fetchone()
    
    if column_exists:
        # Use version_status column if it exists
        existing_review_query = text("""
            SELECT document_id, file_name, version_number, doc_slot
            FROM documents 
            WHERE land_id = :land_id 
            AND document_type = :document_type 
            AND doc_slot = :doc_slot
            AND version_status = 'under_review'
            AND document_id != :document_id
        """)
        
        existing_review = db.execute(existing_review_query, {
            "land_id": str(doc_result.land_id),
            "document_type": doc_result.document_type,
            "doc_slot": doc_slot,
            "document_id": str(document_id)
        }).fetchone()
    else:
        # Fallback: no existing review check if column doesn't exist
        existing_review = None
    
    if existing_review and column_exists:
        # Release the existing document from review using stored procedure
        db.execute(
            text("""
                SELECT release_document_lock(
                    CAST(:existing_document_id AS uuid),
                    :release_reason
                )
            """),
            {
                "existing_document_id": str(existing_review.document_id),
                "release_reason": f"Released to allow review of version {doc_result.version_number}"
            }
        )
    
    # Claim the document using stored procedure
    if column_exists:
        db.execute(
            text("""
                SELECT lock_document_version_for_review(
                    CAST(:document_id AS uuid),
                    :locked_at,
                    CAST(:locked_by AS uuid),
                    :reason
                )
            """),
            {
                "document_id": str(document_id),
                "locked_at": datetime.utcnow(),
                "locked_by": str(user_id),
                "reason": "Claimed for review"
            }
        )
    else:
        # Fallback: just update version_status if version_status columns don't exist
        claim_query = text("""
            UPDATE documents 
            SET version_status = 'under_review'
            WHERE document_id = :document_id
        """)
        
        db.execute(claim_query, {
            "document_id": str(document_id)
        })
    
    try:
        db.commit()
        print(f"Database commit successful for document {document_id}")
    except Exception as e:
        print(f"Database commit error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document status: {str(e)}"
        )
    
    # Send notification (with error handling)
    try:
        notification_service = NotificationService(db)
        notification_service.notify_review_lock(
            str(doc_result.land_id),
            doc_result.document_type,
            doc_result.version_number,
            str(user_id),
            "Claimed for review"
        )
        print(f"Notification sent successfully for document {document_id}")
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Notification error (non-critical): {e}")
        # Continue with the response
    
    response_message = "Document claimed for review successfully"
    if existing_review and column_exists:
        response_message += f". Previous version {existing_review.version_number} has been released from review."
    elif not column_exists:
        response_message += " (Note: Database migration not run - using basic status field)"
    
    return {"message": response_message}

@router.post("/documents/{document_id}/complete")
async def complete_document_review(
    document_id: UUID,
    review_result: str,  # 'approve', 'reject', 'request_changes'
    comments: Optional[str] = None,
    current_user: dict = Depends(require_reviewer),
    db: Session = Depends(get_db)
):
    """Complete document review with result"""
    
    user_id = current_user["user_id"]
    
    # Validate review result
    valid_results = ['approve', 'reject', 'request_changes']
    if review_result not in valid_results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review result. Must be one of: {valid_results}"
        )
    
    # Get document info using stored procedure
    doc_result = db.execute(
        text("SELECT * FROM get_document_info_for_lock(CAST(:document_id AS uuid))"),
        {"document_id": str(document_id)}
    ).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get review_locked_by from database since it's not in the function result
    review_locked_by_result = db.execute(
        text("SELECT review_locked_by FROM documents WHERE document_id = :document_id"),
        {"document_id": str(document_id)}
    ).fetchone()
    
    review_locked_by = review_locked_by_result[0] if review_locked_by_result else None
    
    # Check if document is under review by this user
    if doc_result.version_status != 'under_review' or not review_locked_by or str(review_locked_by) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not under review by you"
        )
    
    # Update document based on review result - use version_status only
    if review_result == 'approve':
        new_version_status = 'approved'
        version_change_reason = f"Approved by reviewer: {comments or 'No comments'}"
    elif review_result == 'reject':
        new_version_status = 'rejected'
        version_change_reason = f"Rejected by reviewer: {comments or 'No comments'}"
    else:  # request_changes
        new_version_status = 'pending'
        version_change_reason = f"Changes requested by reviewer: {comments or 'No comments'}"
    
    complete_query = text("""
        UPDATE documents 
        SET version_status = :new_version_status,
            approved_by = CAST(:user_id AS uuid),
            approved_at = :approved_at,
            review_locked_at = NULL,
            review_locked_by = NULL,
            version_change_reason = :reason,
            admin_comments = :comments
        WHERE document_id = :document_id
    """)
    
    db.execute(complete_query, {
        "document_id": str(document_id),
        "new_version_status": new_version_status,
        "user_id": str(user_id),
        "approved_at": datetime.utcnow(),
        "reason": version_change_reason,
        "comments": comments
    })
    
    db.commit()
    
    # Send notification
    notification_service = NotificationService(db)
    notification_service.notify_status_change(
        str(doc_result.land_id),
        doc_result.document_type,
        doc_result.version_number,
        str(user_id),
        new_version_status,
        version_change_reason
    )
    
    return {
        "message": f"Document review completed: {review_result}",
        "version_status": new_version_status,
        "comments": comments
    }

@router.get("/documents/available")
async def get_available_documents_for_review(
    current_user: dict = Depends(require_reviewer),
    db: Session = Depends(get_db)
):
    """Get documents available for review (not yet claimed)"""
    
    # Get documents available for review (exclude subtask documents)
    query = text("""
        SELECT d.*, u.first_name, u.last_name, u.email as uploader_email,
               l.title as land_title, l.land_id
        FROM documents d
        LEFT JOIN "user" u ON d.uploaded_by = u.user_id
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.version_status != 'under_review'
        AND d.review_locked_at IS NULL
        AND d.subtask_id IS NULL
        ORDER BY d.created_at DESC
    """)
    
    result = db.execute(query).fetchall()
    
    documents = []
    for row in result:
        doc_dict = dict(row._mapping)
        documents.append({
            "document_id": doc_dict["document_id"],
            "land_id": doc_dict["land_id"],
            "land_title": doc_dict["land_title"],
            "document_type": doc_dict["document_type"],
            "file_name": doc_dict["file_name"],
            "file_size": doc_dict["file_size"],
            "mime_type": doc_dict["mime_type"],
            "version_number": doc_dict["version_number"],
            "is_latest_version": doc_dict["is_latest_version"],
            "version_status": doc_dict["version_status"],
            "created_at": doc_dict["created_at"],
            "uploader_name": f"{doc_dict['first_name']} {doc_dict['last_name']}" if doc_dict['first_name'] else doc_dict['uploader_email']
        })
    
    return documents
