from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from uuid import UUID

from database import get_db
from models.schemas import Document
from auth import get_current_user

router = APIRouter(prefix="/documents", tags=["document-versions"])


@router.get("/land/{land_id}/versions/{document_type}", response_model=List[Document])
async def get_document_versions(
    land_id: UUID,
    document_type: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all versions of a specific document type for a land."""
    # Check if land exists and user has permission
    land_check = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    landowner_id_str = str(land_result.landowner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = user_id_str == landowner_id_str
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view documents for this land"
        )
    
    # Get all versions of the document type
    query = text("""
        SELECT d.document_id, d.land_id, d.document_type, d.file_name, 
               d.file_path, d.file_size, d.uploaded_by, d.created_at, d.mime_type, 
               d.is_draft, d.status, d.approved_by, d.approved_at, 
               d.rejection_reason, d.admin_comments, d.version_number, 
               d.is_latest_version, d.parent_document_id, d.version_notes
        FROM documents d
        WHERE d.land_id = :land_id AND d.document_type = :document_type
        ORDER BY d.version_number DESC
    """)
    
    results = db.execute(query, {
        "land_id": str(land_id),
        "document_type": document_type
    }).fetchall()
    
    return [
        Document(
            document_id=row.document_id,
            land_id=row.land_id,
            document_type=row.document_type,
            file_name=row.file_name,
            file_path=row.file_path,
            file_size=row.file_size,
            uploaded_by=row.uploaded_by,
            created_at=row.created_at,
            mime_type=row.mime_type,
            is_draft=row.is_draft,
            status=row.status,
            approved_by=row.approved_by,
            approved_at=row.approved_at,
            rejection_reason=row.rejection_reason,
            admin_comments=row.admin_comments,
            version_number=row.version_number,
            is_latest_version=row.is_latest_version,
            parent_document_id=row.parent_document_id,
            version_notes=row.version_notes
        )
        for row in results
    ]
