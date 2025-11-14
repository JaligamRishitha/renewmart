"""
Document assignment API endpoints for assigning specific document versions to reviewers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    DocumentAssignmentCreate, DocumentAssignmentUpdate, DocumentAssignment,
    MessageResponse
)
from notification_service import NotificationService

router = APIRouter(prefix="/document-assignments", tags=["document-assignments"])

@router.post("/assign", response_model=DocumentAssignment)
async def assign_document_to_reviewer(
    assignment_data: DocumentAssignmentCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign a specific document version to a reviewer (admin only)"""
    
    # Get document info using stored procedure
    doc_result = db.execute(
        text("SELECT * FROM get_document_for_assignment(CAST(:document_id AS uuid))"),
        {"document_id": str(assignment_data.document_id)}
    ).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if document is already assigned using stored procedure
    existing = db.execute(
        text("SELECT * FROM check_existing_document_assignment(CAST(:document_id AS uuid))"),
        {"document_id": str(assignment_data.document_id)}
    ).fetchone()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is already assigned to a reviewer"
        )
    
    # Verify the assigned user exists and has the correct role using stored procedure
    user_result = db.execute(
        text("SELECT * FROM verify_user_with_role(CAST(:user_id AS uuid), :role_key)"),
        {
            "user_id": str(assignment_data.assigned_to),
            "role_key": assignment_data.reviewer_role
        }
    ).fetchone()
    
    if not user_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or does not have the specified role"
        )
    
    # Create the assignment using stored procedure
    lock_reason = assignment_data.lock_reason or f"Assigned to {user_result.first_name} {user_result.last_name} for review"
    result = db.execute(
        text("""
            SELECT * FROM create_document_assignment(
                CAST(:document_id AS uuid),
                CAST(:land_id AS uuid),
                CAST(:assigned_to AS uuid),
                CAST(:assigned_by AS uuid),
                :reviewer_role,
                CAST(:task_id AS uuid),
                :assignment_notes,
                :due_date,
                :priority,
                :lock_reason
            )
        """),
        {
            "document_id": str(assignment_data.document_id),
            "land_id": str(doc_result.land_id),
            "assigned_to": str(assignment_data.assigned_to),
            "assigned_by": str(current_user["user_id"]),
            "reviewer_role": assignment_data.reviewer_role,
            "task_id": str(assignment_data.task_id) if assignment_data.task_id else None,
            "assignment_notes": assignment_data.assignment_notes,
            "due_date": assignment_data.due_date,
            "priority": assignment_data.priority,
            "lock_reason": lock_reason
        }
    ).fetchone()
    
    # Update document status to locked using stored procedure
    db.execute(
        text("""
            SELECT lock_document_for_review(
                CAST(:document_id AS uuid),
                :locked_at,
                CAST(:locked_by AS uuid)
            )
        """),
        {
            "document_id": str(assignment_data.document_id),
            "locked_at": datetime.utcnow(),
            "locked_by": str(current_user["user_id"])
        }
    )
    
    db.commit()
    
    # Send notification
    notification_service = NotificationService(db)
    notification_service.notify_review_assignment(
        str(doc_result.land_id),
        doc_result.document_type,
        doc_result.version_number,
        str(assignment_data.assigned_to),
        str(current_user["user_id"])
    )
    
    # Return the created assignment
    return {
        "assignment_id": result.assignment_id,
        "document_id": assignment_data.document_id,
        "land_id": doc_result.land_id,
        "assigned_to": assignment_data.assigned_to,
        "assigned_by": current_user["user_id"],
        "reviewer_role": assignment_data.reviewer_role,
        "task_id": assignment_data.task_id,
        "assignment_notes": assignment_data.assignment_notes,
        "due_date": assignment_data.due_date,
        "priority": assignment_data.priority,
        "lock_reason": assignment_data.lock_reason,
        "assignment_status": "assigned",
        "assigned_at": result.assigned_at,
        "started_at": None,
        "completed_at": None,
        "is_locked": True
    }

@router.get("/land/{land_id}", response_model=List[DocumentAssignment])
async def get_land_document_assignments(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all document assignments for a land"""
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    # Get land info to check ownership using stored procedure
    land_result = db.execute(
        text("SELECT * FROM check_land_exists(CAST(:land_id AS uuid))"),
        {"land_id": str(land_id)}
    ).fetchone()
    
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
            detail="Not enough permissions to view document assignments"
        )
    
    # Get assignments with document and user details using stored procedure
    result = db.execute(
        text("SELECT * FROM get_land_document_assignments(CAST(:land_id AS uuid))"),
        {"land_id": str(land_id)}
    ).fetchall()
    
    assignments = []
    for row in result:
        assignments.append({
            "assignment_id": row.assignment_id,
            "document_id": row.document_id,
            "land_id": row.land_id,
            "assigned_to": row.assigned_to,
            "assigned_by": row.assigned_by,
            "reviewer_role": row.reviewer_role,
            "task_id": row.task_id,
            "assignment_notes": row.assignment_notes,
            "due_date": row.due_date,
            "priority": row.priority,
            "lock_reason": row.lock_reason,
            "assignment_status": row.assignment_status,
            "assigned_at": row.assigned_at,
            "started_at": row.started_at,
            "completed_at": row.completed_at,
            "is_locked": row.is_locked,
            "document_type": row.document_type,
            "file_name": row.file_name,
            "version_number": row.version_number,
            "version_status": row.version_status,
            "assignee_name": f"{row.assignee_first_name} {row.assignee_last_name}",
            "assigner_name": f"{row.assigner_first_name} {row.assigner_last_name}"
        })
    
    return assignments

@router.get("/reviewer/{reviewer_id}", response_model=List[DocumentAssignment])
async def get_reviewer_assignments(
    reviewer_id: UUID,
    status_filter: Optional[str] = Query(None, description="Filter by assignment status"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all document assignments for a specific reviewer"""
    
    # Check if user is requesting their own assignments or is admin
    user_roles = current_user.get("roles", [])
    is_admin = "administrator" in user_roles
    is_own_assignments = str(current_user["user_id"]) == str(reviewer_id)
    
    if not (is_admin or is_own_assignments):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view these assignments"
        )
    
    # Build query with optional status filter
    where_conditions = ["da.assigned_to = :reviewer_id"]
    params = {"reviewer_id": str(reviewer_id)}
    
    if status_filter:
        where_conditions.append("da.assignment_status = :status_filter")
        params["status_filter"] = status_filter
    
    # Get reviewer assignments using stored procedure
    result = db.execute(
        text("SELECT * FROM get_reviewer_assignments(CAST(:reviewer_id AS uuid), :status_filter)"),
        {
            "reviewer_id": str(reviewer_id),
            "status_filter": status_filter
        }
    ).fetchall()
    
    assignments = []
    for row in result:
        assignments.append({
            "assignment_id": row.assignment_id,
            "document_id": row.document_id,
            "land_id": row.land_id,
            "assigned_to": row.assigned_to,
            "assigned_by": row.assigned_by,
            "reviewer_role": row.reviewer_role,
            "task_id": row.task_id,
            "assignment_notes": row.assignment_notes,
            "due_date": row.due_date,
            "priority": row.priority,
            "lock_reason": row.lock_reason,
            "assignment_status": row.assignment_status,
            "assigned_at": row.assigned_at,
            "started_at": row.started_at,
            "completed_at": row.completed_at,
            "is_locked": row.is_locked,
            "document_type": row.document_type,
            "file_name": row.file_name,
            "version_number": row.version_number,
            "version_status": row.version_status,
            "land_title": row.land_title,
            "land_location": row.land_location,
            "assigner_name": f"{row.assigner_first_name} {row.assigner_last_name}"
        })
    
    return assignments

@router.put("/{assignment_id}", response_model=DocumentAssignment)
async def update_assignment(
    assignment_id: UUID,
    update_data: DocumentAssignmentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a document assignment"""
    
    # Get assignment info using stored procedure
    assignment_result = db.execute(
        text("SELECT * FROM get_assignment_info(CAST(:assignment_id AS uuid))"),
        {"assignment_id": str(assignment_id)}
    ).fetchone()
    
    if not assignment_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permissions - admin or assigned reviewer
    user_roles = current_user.get("roles", [])
    is_admin = "administrator" in user_roles
    is_assigned_reviewer = str(current_user["user_id"]) == str(assignment_result.assigned_to)
    
    if not (is_admin or is_assigned_reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this assignment"
        )
    
    # Build update query
    update_fields = []
    params = {"assignment_id": str(assignment_id)}
    
    if update_data.assignment_status is not None:
        update_fields.append("assignment_status = :assignment_status")
        params["assignment_status"] = update_data.assignment_status
        
        # Set started_at or completed_at based on status
        if update_data.assignment_status == "in_progress" and not assignment_result.started_at:
            update_fields.append("started_at = :started_at")
            params["started_at"] = datetime.utcnow()
        elif update_data.assignment_status == "completed":
            update_fields.append("completed_at = :completed_at")
            params["completed_at"] = datetime.utcnow()
    
    if update_data.assignment_notes is not None:
        update_fields.append("assignment_notes = :assignment_notes")
        params["assignment_notes"] = update_data.assignment_notes
    
    if update_data.due_date is not None:
        update_fields.append("due_date = :due_date")
        params["due_date"] = update_data.due_date
    
    if update_data.priority is not None:
        update_fields.append("priority = :priority")
        params["priority"] = update_data.priority
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Update assignment using stored procedure
    result = db.execute(
        text("""
            SELECT * FROM update_document_assignment(
                CAST(:assignment_id AS uuid),
                :assignment_status,
                :assignment_notes,
                :due_date,
                :priority,
                :started_at,
                :completed_at
            )
        """),
        {
            "assignment_id": str(assignment_id),
            "assignment_status": update_data.assignment_status if update_data.assignment_status else None,
            "assignment_notes": update_data.assignment_notes,
            "due_date": update_data.due_date,
            "priority": update_data.priority,
            "started_at": datetime.utcnow() if update_data.assignment_status == "in_progress" and not assignment_result.started_at else None,
            "completed_at": datetime.utcnow() if update_data.assignment_status == "completed" else None
        }
    ).fetchone()
    db.commit()
    
    # Send notification if status changed
    if update_data.assignment_status:
        notification_service = NotificationService(db)
        notification_service.notify_status_change(
            str(assignment_result.land_id),
            assignment_result.document_type,
            assignment_result.version_number,
            str(current_user["user_id"]),
            update_data.assignment_status,
            f"Assignment status updated to {update_data.assignment_status}"
        )
    
    return {
        "assignment_id": result.assignment_id,
        "document_id": result.document_id,
        "land_id": result.land_id,
        "assigned_to": result.assigned_to,
        "assigned_by": result.assigned_by,
        "reviewer_role": result.reviewer_role,
        "task_id": result.task_id,
        "assignment_notes": result.assignment_notes,
        "due_date": result.due_date,
        "priority": result.priority,
        "lock_reason": result.lock_reason,
        "assignment_status": result.assignment_status,
        "assigned_at": result.assigned_at,
        "started_at": result.started_at,
        "completed_at": result.completed_at,
        "is_locked": result.is_locked
    }

@router.delete("/{assignment_id}", response_model=MessageResponse)
async def cancel_assignment(
    assignment_id: UUID,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Cancel a document assignment (admin only)"""
    
    # Get assignment info using stored procedure
    assignment_result = db.execute(
        text("SELECT * FROM get_assignment_info(CAST(:assignment_id AS uuid))"),
        {"assignment_id": str(assignment_id)}
    ).fetchone()
    
    if not assignment_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Cancel the assignment using stored procedure
    db.execute(
        text("SELECT cancel_document_assignment(CAST(:assignment_id AS uuid), :reason)"),
        {
            "assignment_id": str(assignment_id),
            "reason": f"Cancelled by admin: {reason or 'No reason provided'}"
        }
    )
    
    # Unlock the document using stored procedure
    db.execute(
        text("SELECT unlock_document_from_assignment(CAST(:document_id AS uuid))"),
        {"document_id": str(assignment_result.document_id)}
    )
    
    db.commit()
    
    # Send notification
    notification_service = NotificationService(db)
    notification_service.notify_status_change(
        str(assignment_result.land_id),
        assignment_result.document_type,
        assignment_result.version_number,
        str(current_user["user_id"]),
        'active',
        f"Assignment cancelled: {reason or 'No reason provided'}"
    )
    
    return {"message": "Assignment cancelled successfully"}

@router.get("/land/{land_id}/available-documents")
async def get_available_documents_for_assignment(
    land_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all available document versions that can be assigned to reviewers"""
    
    # Get all document versions for the land using stored procedure
    result = db.execute(
        text("SELECT * FROM get_available_documents_for_assignment(CAST(:land_id AS uuid))"),
        {"land_id": str(land_id)}
    ).fetchall()
    
    documents = []
    for row in result:
        documents.append({
            "document_id": row.document_id,
            "land_id": row.land_id,
            "document_type": row.document_type,
            "file_name": row.file_name,
            "version_number": row.version_number,
            "is_latest_version": row.is_latest_version,
            "version_status": row.version_status,
            "version_notes": row.version_notes,
            "created_at": row.created_at,
            "uploader_name": f"{row.first_name} {row.last_name}" if row.first_name else row.uploader_email,
            "is_assigned": row.is_assigned,
            "current_assignment_status": row.current_assignment_status,
            "assigned_to_name": f"{row.assigned_to_first_name} {row.assigned_to_last_name}" if row.assigned_to_first_name else None
        })
    
    return documents
