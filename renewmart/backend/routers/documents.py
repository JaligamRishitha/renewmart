from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from uuid import UUID
from pathlib import Path
import io
import os
import uuid
from datetime import datetime

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    DocumentCreate, DocumentUpdate, Document,
    MessageResponse
)

router = APIRouter(prefix="/documents", tags=["documents"])

# Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".tiff", ".txt"}

# Helper functions
def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
    
    return True, "Valid"

def read_file_bytes(file: UploadFile) -> tuple[bytes, int]:
    """Read file content as bytes and return data with size"""
    file_data = b""
    file_size = 0
    
    # Read file in chunks
    while chunk := file.file.read(8192):
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        file_data += chunk
    
    return file_data, file_size

# Document endpoints
@router.post("/upload/{land_id}", response_model=Document)
async def upload_document(
    land_id: UUID,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document for a land (owner or admin only)."""
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
    
    # Check permissions - convert both to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    landowner_id_str = str(land_result.landowner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = user_id_str == landowner_id_str
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to upload documents for this land"
        )
    
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        # Read file bytes
        file_data, file_size = read_file_bytes(file)
        
        # Determine MIME type
        mime_type = file.content_type or 'application/octet-stream'
        
        # Create document record with binary data
        document_id = str(uuid.uuid4())
        insert_query = text("""
            INSERT INTO documents (
                document_id, land_id, document_type, file_name, 
                file_data, file_size, uploaded_by, mime_type, is_draft
            ) VALUES (
                :document_id, :land_id, :document_type, :file_name,
                :file_data, :file_size, :uploaded_by, :mime_type, :is_draft
            )
        """)
        
        db.execute(insert_query, {
            "document_id": document_id,
            "land_id": str(land_id),
            "document_type": document_type,
            "file_name": file.filename,
            "file_data": file_data,
            "file_size": file_size,
            "uploaded_by": current_user["user_id"],
            "mime_type": mime_type,
            "is_draft": True
        })
        
        db.commit()
        
        # Create notifications for document upload
        try:
            from utils.notifications import notify_document_uploaded
            
            # Get reviewer IDs (assigned reviewers for this land)
            reviewer_query = text("""
                SELECT DISTINCT u.user_id
                FROM "user" u
                JOIN user_roles ur ON u.user_id = ur.user_id
                WHERE ur.role_key IN ('re_analyst', 're_sales_advisor', 're_governance_lead')
                AND u.is_active = true
            """)
            reviewers = db.execute(reviewer_query).fetchall()
            reviewer_ids = [str(row.user_id) for row in reviewers]
            
            # Get admin user IDs
            admin_query = text("""
                SELECT DISTINCT u.user_id
                FROM "user" u
                JOIN user_roles ur ON u.user_id = ur.user_id
                WHERE ur.role_key = 'administrator' AND u.is_active = true
            """)
            admins = db.execute(admin_query).fetchall()
            admin_user_ids = [str(row.user_id) for row in admins]
            
            notify_document_uploaded(
                db=db,
                document_id=document_id,
                land_id=str(land_id),
                document_type=document_type,
                uploaded_by=str(current_user["user_id"]),
                reviewer_ids=reviewer_ids,
                admin_user_ids=admin_user_ids
            )
        except Exception as e:
            print(f"Error creating document upload notification: {str(e)}")
        
        # Fetch the created document
        return await get_document(UUID(document_id), current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )

@router.get("/land/{land_id}", response_model=List[Document])
async def get_land_documents(
    land_id: UUID,
    document_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a land."""
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
    
    # Check permissions - convert to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    landowner_id_str = str(land_result.landowner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = landowner_id_str == user_id_str
    is_published = land_result.status == "published"
    
    # Check if user is a reviewer assigned to this land
    is_reviewer = False
    reviewer_role = None
    if not (is_admin or is_owner or is_published):
        # Check if user has a task assigned for this land
        reviewer_check = text("""
            SELECT assigned_role FROM tasks 
            WHERE land_id = :land_id AND assigned_to = :user_id
            LIMIT 1
        """)
        reviewer_result = db.execute(
            reviewer_check, 
            {"land_id": str(land_id), "user_id": user_id_str}
        ).fetchone()
        
        if reviewer_result:
            is_reviewer = True
            reviewer_role = reviewer_result.assigned_role
    
    if not (is_admin or is_owner or is_published or is_reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view documents for this land"
        )
    
    # Build query with optional document type filter
    base_query = """
        SELECT d.document_id, d.land_id, d.document_type, d.file_name,
               d.file_path, d.file_size, d.uploaded_by, d.created_at,
               d.mime_type, d.is_draft, d.status, d.version_status, 
               d.version_number, d.is_latest_version, d.doc_slot,
               d.review_locked_at, d.review_locked_by,
               u.first_name || ' ' || u.last_name as uploader_name,
               l.title as land_title
        FROM documents d
        LEFT JOIN "user" u ON d.uploaded_by = u.user_id
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.land_id = :land_id
    """
    
    params = {"land_id": str(land_id)}
    
    # Filter documents based on reviewer role
    # Admin can see all documents, so no filtering needed for admin
    if is_reviewer and reviewer_role and not (is_admin or is_owner):
        # Document type mapping - each document type is linked to specific roles
        # Admin can see all documents regardless of this mapping
        role_document_mapping = {
            "re_sales_advisor": [
                "land-valuation",
                "sale-contracts",
                "topographical-surveys",
                "grid-connectivity"
            ],
            "re_analyst": [
                "financial-models"
            ],
            "re_governance_lead": [
                "land-valuation",
                "ownership-documents",
                "zoning-approvals",
                "environmental-impact",
                "government-nocs"
            ]
        }
        
        allowed_docs = role_document_mapping.get(reviewer_role, [])
        if allowed_docs:
            # Create placeholders for IN clause
            placeholders = ", ".join([f":doc_type_{i}" for i in range(len(allowed_docs))])
            base_query += f" AND d.document_type IN ({placeholders})"
            # Add document types to params
            for i, doc_type in enumerate(allowed_docs):
                params[f"doc_type_{i}"] = doc_type
    
    if document_type:
        base_query += " AND d.document_type = :document_type"
        params["document_type"] = document_type
    
    base_query += " ORDER BY d.created_at DESC"
    
    results = db.execute(text(base_query), params).fetchall()
    
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
            status=getattr(row, 'status', 'pending'),
            version_status=getattr(row, 'version_status', 'active'),
            version_number=getattr(row, 'version_number', 1),
            is_latest_version=getattr(row, 'is_latest_version', True),
            doc_slot=getattr(row, 'doc_slot', 'D1'),
            review_locked_at=getattr(row, 'review_locked_at', None),
            review_locked_by=getattr(row, 'review_locked_by', None)
        )
        for row in results
    ]


@router.get("/land/{land_id}/reviewer", response_model=List[Dict[str, Any]])
async def get_land_reviewer_documents(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reviewer documents for a land, grouped by main subtasks."""
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
    
    # Check permissions - convert to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    landowner_id_str = str(land_result.landowner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = landowner_id_str == user_id_str
    is_published = land_result.status == "published"
    
    # Check if user is a reviewer assigned to this land
    is_reviewer = False
    if not (is_admin or is_owner or is_published):
        reviewer_check = text("""
            SELECT assigned_role FROM tasks 
            WHERE land_id = :land_id AND assigned_to = :user_id
            LIMIT 1
        """)
        reviewer_result = db.execute(
            reviewer_check, 
            {"land_id": str(land_id), "user_id": user_id_str}
        ).fetchone()
        
        if reviewer_result:
            is_reviewer = True
    
    if not (is_admin or is_owner or is_published or is_reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view reviewer documents for this land"
        )
    
    # Get reviewer documents with subtask and task information
    query = text("""
        SELECT 
            d.document_id, d.land_id, d.task_id, d.subtask_id, d.document_type, 
            d.file_name, d.file_path, d.file_size, d.uploaded_by, d.created_at,
            d.mime_type, d.is_draft,
            u.first_name || ' ' || u.last_name as uploader_name,
            t.assigned_role as task_role,
            s.title as subtask_title,
            s.description as subtask_description,
            s.status as subtask_status,
            s.created_at as subtask_created_at,
            s.updated_at as subtask_updated_at,
            s.completed_at as subtask_completed_at
        FROM documents d
        LEFT JOIN "user" u ON d.uploaded_by = u.user_id
        LEFT JOIN tasks t ON d.task_id = t.task_id
        LEFT JOIN subtasks s ON d.subtask_id = s.subtask_id
        WHERE d.land_id = :land_id 
        AND d.subtask_id IS NOT NULL
        AND d.uploaded_by != :landowner_id
        ORDER BY t.assigned_role, s.title, d.created_at
    """)
    
    results = db.execute(query, {
        "land_id": str(land_id),
        "landowner_id": landowner_id_str
    }).fetchall()
    
    # Group documents by main subtask (task role)
    grouped_docs = {}
    for row in results:
        task_role = row.task_role or 'Unknown'
        if task_role not in grouped_docs:
            grouped_docs[task_role] = {
                'main_subtask': task_role,
                'subtasks': {}
            }
        
        subtask_id = str(row.subtask_id) if row.subtask_id else 'unknown'
        if subtask_id not in grouped_docs[task_role]['subtasks']:
            grouped_docs[task_role]['subtasks'][subtask_id] = {
                'subtask_id': subtask_id,
                'title': row.subtask_title or 'Untitled Subtask',
                'description': row.subtask_description or '',
                'status': row.subtask_status or 'pending',
                'start_date': row.subtask_created_at,
                'completion_date': row.subtask_completed_at,
                'documents': []
            }
        
        grouped_docs[task_role]['subtasks'][subtask_id]['documents'].append({
            'document_id': str(row.document_id),
            'file_name': row.file_name,
            'file_size': row.file_size,
            'mime_type': row.mime_type,
            'uploaded_by': str(row.uploaded_by),
            'uploader_name': row.uploader_name,
            'created_at': row.created_at,
            'document_type': row.document_type
        })
    
    # Convert to list format for frontend
    result_list = []
    for main_subtask, data in grouped_docs.items():
        subtasks_list = []
        for subtask_id, subtask_data in data['subtasks'].items():
            subtasks_list.append({
                'subtask_id': subtask_id,
                'title': subtask_data['title'],
                'description': subtask_data['description'],
                'status': subtask_data['status'],
                'start_date': subtask_data['start_date'].isoformat() if subtask_data['start_date'] else None,
                'completion_date': subtask_data['completion_date'].isoformat() if subtask_data['completion_date'] else None,
                'documents': subtask_data['documents']
            })
        
        result_list.append({
            'main_subtask': main_subtask,
            'subtasks': subtasks_list
        })
    
    return result_list


@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document by ID."""
    query = text("""
        SELECT d.document_id, d.land_id, d.document_type, d.file_name,
               d.file_path, d.file_size, d.uploaded_by, d.created_at,
               d.mime_type, d.is_draft,
               l.landowner_id, l.status
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    result = db.execute(query, {"document_id": str(document_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions - convert to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    is_admin = "administrator" in user_roles
    is_owner = result.landowner_id and str(result.landowner_id) == user_id_str
    is_published = result.status == "published"
    
    # Check if user is a reviewer assigned to this land
    is_reviewer = False
    if not (is_admin or is_owner or is_published):
        # Check if user has a task assigned for this land
        reviewer_check = text("""
            SELECT assigned_role FROM tasks 
            WHERE land_id = :land_id AND assigned_to = :user_id
            LIMIT 1
        """)
        reviewer_result = db.execute(
            reviewer_check, 
            {"land_id": str(result.land_id), "user_id": user_id_str}
        ).fetchone()
        
        if reviewer_result:
            is_reviewer = True
    
    if not (is_admin or is_owner or is_published or is_reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this document"
        )
    
    return Document(
        document_id=result.document_id,
        land_id=result.land_id,
        document_type=result.document_type,
        file_name=result.file_name,
        file_path=result.file_path,
        file_size=result.file_size,
        uploaded_by=result.uploaded_by,
        created_at=result.created_at,
        mime_type=result.mime_type,
        is_draft=result.is_draft
    )

@router.put("/{document_id}", response_model=Document)
async def update_document(
    document_id: UUID,
    document_update: DocumentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update document metadata (uploader or admin only)."""
    # Check if document exists and user has permission
    doc_check = text("""
        SELECT d.uploaded_by, l.landowner_id
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_check, {"document_id": str(document_id)}).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions - convert to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    is_admin = "administrator" in user_roles
    is_uploader = str(doc_result.uploaded_by) == user_id_str
    is_landowner = doc_result.landowner_id and str(doc_result.landowner_id) == user_id_str
    
    if not (is_admin or is_uploader or is_landowner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this document"
        )
    
    # Build dynamic update query
    update_fields = []
    params = {"document_id": str(document_id)}
    
    update_data = document_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["document_type", "file_name"]:
            update_fields.append(f"{field} = :{field}")
            params[field] = value
    
    if update_fields:
        update_query = text(f"""
            UPDATE documents 
            SET {', '.join(update_fields)}
            WHERE document_id = :document_id
        """)
        
        db.execute(update_query, params)
        db.commit()
    
    return await get_document(document_id, current_user, db)

@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete document (uploader or admin only)."""
    # Check if document exists and user has permission
    doc_check = text("""
        SELECT d.uploaded_by, l.landowner_id
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_check, {"document_id": str(document_id)}).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions - convert to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    is_admin = "administrator" in user_roles
    is_uploader = str(doc_result.uploaded_by) == user_id_str
    is_landowner = doc_result.landowner_id and str(doc_result.landowner_id) == user_id_str
    
    if not (is_admin or is_uploader or is_landowner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this document"
        )
    
    try:
        # Delete database record (includes binary data)
        delete_query = text("DELETE FROM documents WHERE document_id = :document_id")
        db.execute(delete_query, {"document_id": str(document_id)})
        db.commit()
        
        return MessageResponse(message="Document deleted successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )

@router.get("/download/{document_id}")
async def download_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download document file from database or file system (legacy)."""
    # Check if document exists and user has permission
    doc_check = text("""
        SELECT d.file_data, d.file_path, d.file_name, d.mime_type, d.land_id, l.landowner_id, l.status
        FROM documents d
        LEFT JOIN lands l ON d.land_id = l.land_id
        WHERE d.document_id = :document_id
    """)
    
    doc_result = db.execute(doc_check, {"document_id": str(document_id)}).fetchone()
    
    if not doc_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions - convert to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    
    is_admin = "administrator" in user_roles
    is_owner = doc_result.landowner_id and str(doc_result.landowner_id) == user_id_str
    is_published = doc_result.status == "published"
    
    # Check if user is a reviewer assigned to this land
    is_reviewer = False
    if not (is_admin or is_owner or is_published):
        # Check if user has a task assigned for this land
        reviewer_check = text("""
            SELECT assigned_role FROM tasks 
            WHERE land_id = :land_id AND assigned_to = :user_id
            LIMIT 1
        """)
        reviewer_result = db.execute(
            reviewer_check, 
            {"land_id": str(doc_result.land_id), "user_id": user_id_str}
        ).fetchone()
        
        if reviewer_result:
            is_reviewer = True
    
    if not (is_admin or is_owner or is_published or is_reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to download this document"
        )
    
    # Try database blob storage first (new method)
    if doc_result.file_data:
        return Response(
            content=bytes(doc_result.file_data),
            media_type=doc_result.mime_type or 'application/octet-stream',
            headers={
                'Content-Disposition': f'attachment; filename="{doc_result.file_name}"'
            }
        )
    
    # Fallback to file system (legacy method for old documents)
    elif doc_result.file_path and os.path.exists(doc_result.file_path):
        from fastapi.responses import FileResponse
        return FileResponse(
            path=doc_result.file_path,
            filename=doc_result.file_name,
            media_type=doc_result.mime_type or 'application/octet-stream'
        )
    
    # Neither method has the file
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file data not found. Please re-upload this document."
        )

@router.get("/types/list", response_model=List[str])
async def get_document_types(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all document types in use."""
    query = text("""
        SELECT DISTINCT document_type 
        FROM documents 
        ORDER BY document_type
    """)
    
    results = db.execute(query).fetchall()
    
    return [row.document_type for row in results]

@router.get("/my/uploads", response_model=List[Document])
async def get_my_uploads(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents uploaded by the current user."""
    query = text("""
        SELECT d.document_id, d.land_id, d.document_type, d.file_name,
               d.file_path, d.file_size, d.uploaded_by, d.created_at,
               d.mime_type, d.is_draft
        FROM documents d
        WHERE d.uploaded_by = :user_id
        ORDER BY d.created_at DESC
    """)
    
    results = db.execute(query, {"user_id": current_user["user_id"]}).fetchall()
    
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
            is_draft=row.is_draft
        )
        for row in results
    ]

# Admin endpoints
@router.get("/admin/all", response_model=List[Document])
async def get_all_documents(
    skip: int = 0,
    limit: int = 100,
    document_type: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all documents (admin only)."""
    base_query = """
        SELECT d.document_id, d.land_id, d.document_type, d.file_name,
               d.file_path, d.file_size, d.uploaded_by, d.created_at,
               d.mime_type, d.is_draft
        FROM documents d
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    if document_type:
        base_query += " AND d.document_type = :document_type"
        params["document_type"] = document_type
    
    base_query += " ORDER BY d.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
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
            is_draft=row.is_draft
        )
        for row in results
    ]


# ========== TASK-BASED DOCUMENT ENDPOINTS ==========

@router.post("/task/{task_id}/upload", response_model=Document)
async def upload_task_document(
    task_id: UUID,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document for a specific task (reviewer only)."""
    # Check if task exists and user is assigned to it
    task_check = text("""
        SELECT t.task_id, t.land_id, t.assigned_to, t.status
        FROM tasks t
        WHERE t.task_id = :task_id
    """)
    
    task_result = db.execute(task_check, {"task_id": str(task_id)}).fetchone()
    
    if not task_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions - user must be assigned to the task or be an admin
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    assigned_to_str = str(task_result.assigned_to)
    
    is_admin = "administrator" in user_roles
    is_assigned = user_id_str == assigned_to_str
    
    if not (is_admin or is_assigned):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only assigned reviewer can upload documents for this task."
        )
    
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        # Read file bytes
        file_data, file_size = read_file_bytes(file)
        
        # Insert document with task_id
        insert_query = text("""
            INSERT INTO documents (
                document_id, land_id, task_id, uploaded_by, document_type, 
                file_name, file_data, file_size, mime_type, is_draft, status, created_at
            )
            VALUES (
                :document_id, :land_id, :task_id, :uploaded_by, :document_type, 
                :file_name, :file_data, :file_size, :mime_type, :is_draft, :status, :created_at
            )
            RETURNING document_id, land_id, task_id, uploaded_by, document_type, 
                      file_name, file_path, file_size, mime_type, is_draft, status, created_at
        """)
        
        document_id = uuid.uuid4()
        
        result = db.execute(insert_query, {
            "document_id": str(document_id),
            "land_id": str(task_result.land_id),
            "task_id": str(task_id),
            "uploaded_by": str(current_user["user_id"]),
            "document_type": document_type,
            "file_name": file.filename,
            "file_data": file_data,
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "is_draft": False,  # Task documents are not drafts
            "status": "pending",  # Pending admin approval
            "created_at": datetime.utcnow()
        })
        
        db.commit()
        
        row = result.fetchone()
        return Document(
            document_id=row.document_id,
            land_id=row.land_id,
            task_id=row.task_id,
            document_type=row.document_type,
            file_name=row.file_name,
            file_path=row.file_path,
            file_size=row.file_size,
            uploaded_by=row.uploaded_by,
            created_at=row.created_at,
            mime_type=row.mime_type,
            is_draft=row.is_draft,
            status=row.status
        )
        
    except Exception as e:
        db.rollback()
        print(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("/task/{task_id}", response_model=List[Document])
async def get_task_documents(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a specific task."""
    # Check if task exists
    task_check = text("""
        SELECT t.task_id, t.assigned_to FROM tasks t WHERE t.task_id = :task_id
    """)
    
    task_result = db.execute(task_check, {"task_id": str(task_id)}).fetchone()
    
    if not task_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Get documents for this task
    query = text("""
        SELECT d.document_id, d.land_id, d.task_id, d.document_type, d.file_name, 
               d.file_path, d.file_size, d.uploaded_by, d.created_at, d.mime_type, 
               d.is_draft, d.status, d.approved_by, d.approved_at, 
               d.rejection_reason, d.admin_comments
        FROM documents d
        WHERE d.task_id = :task_id
        ORDER BY d.created_at DESC
    """)
    
    results = db.execute(query, {"task_id": str(task_id)}).fetchall()
    
    return [
        Document(
            document_id=row.document_id,
            land_id=row.land_id,
            task_id=row.task_id,
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
            admin_comments=row.admin_comments
        )
        for row in results
    ]


@router.post("/approve/{document_id}", response_model=Document)
async def approve_document(
    document_id: UUID,
    admin_comments: Optional[str] = Form(None),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve a document (admin only)."""
    # Update document status
    update_query = text("""
        UPDATE documents
        SET status = 'approved',
            approved_by = :approved_by,
            approved_at = :approved_at,
            admin_comments = :admin_comments
        WHERE document_id = :document_id
        RETURNING document_id, land_id, task_id, document_type, file_name, 
                  file_path, file_size, uploaded_by, created_at, mime_type, 
                  is_draft, status, approved_by, approved_at, admin_comments
    """)
    
    result = db.execute(update_query, {
        "document_id": str(document_id),
        "approved_by": str(current_user["user_id"]),
        "approved_at": datetime.utcnow(),
        "admin_comments": admin_comments
    })
    
    db.commit()
    
    row = result.fetchone()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return Document(
        document_id=row.document_id,
        land_id=row.land_id,
        task_id=row.task_id,
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
        admin_comments=row.admin_comments
    )


@router.post("/reject/{document_id}", response_model=Document)
async def reject_document(
    document_id: UUID,
    rejection_reason: str = Form(...),
    admin_comments: Optional[str] = Form(None),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reject a document (admin only)."""
    # Update document status
    update_query = text("""
        UPDATE documents
        SET status = 'rejected',
            approved_by = :approved_by,
            approved_at = :approved_at,
            rejection_reason = :rejection_reason,
            admin_comments = :admin_comments
        WHERE document_id = :document_id
        RETURNING document_id, land_id, task_id, document_type, file_name, 
                  file_path, file_size, uploaded_by, created_at, mime_type, 
                  is_draft, status, approved_by, approved_at, rejection_reason, admin_comments
    """)
    
    result = db.execute(update_query, {
        "document_id": str(document_id),
        "approved_by": str(current_user["user_id"]),
        "approved_at": datetime.utcnow(),
        "rejection_reason": rejection_reason,
        "admin_comments": admin_comments
    })
    
    db.commit()
    
    row = result.fetchone()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return Document(
        document_id=row.document_id,
        land_id=row.land_id,
        task_id=row.task_id,
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
        admin_comments=row.admin_comments
    )


# ========== SUBTASK-BASED DOCUMENT ENDPOINTS ==========

@router.post("/subtask/{subtask_id}/upload", response_model=Document)
async def upload_subtask_document(
    subtask_id: UUID,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document for a specific subtask (reviewer only)."""
    # Check if subtask exists and get task info
    subtask_check = text("""
        SELECT s.subtask_id, s.task_id, t.land_id, t.assigned_to, t.status
        FROM subtasks s
        JOIN tasks t ON s.task_id = t.task_id
        WHERE s.subtask_id = :subtask_id
    """)
    
    subtask_result = db.execute(subtask_check, {"subtask_id": str(subtask_id)}).fetchone()
    
    if not subtask_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    
    # Check permissions - user must be assigned to the parent task or be an admin
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    assigned_to_str = str(subtask_result.assigned_to)
    
    is_admin = "administrator" in user_roles
    is_assigned = user_id_str == assigned_to_str
    
    if not (is_admin or is_assigned):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only assigned reviewer can upload documents for this subtask."
        )
    
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        # Read file bytes
        file_data, file_size = read_file_bytes(file)
        
        # Insert document with subtask_id
        insert_query = text("""
            INSERT INTO documents (
                document_id, land_id, task_id, subtask_id, uploaded_by, document_type, 
                file_name, file_data, file_size, mime_type, is_draft, status, created_at
            )
            VALUES (
                :document_id, :land_id, :task_id, :subtask_id, :uploaded_by, :document_type, 
                :file_name, :file_data, :file_size, :mime_type, :is_draft, :status, :created_at
            )
            RETURNING document_id, land_id, task_id, subtask_id, uploaded_by, document_type, 
                      file_name, file_path, file_size, mime_type, is_draft, status, created_at
        """)
        
        document_id = uuid.uuid4()
        
        result = db.execute(insert_query, {
            "document_id": str(document_id),
            "land_id": str(subtask_result.land_id),
            "task_id": str(subtask_result.task_id),
            "subtask_id": str(subtask_id),
            "uploaded_by": str(current_user["user_id"]),
            "document_type": document_type,
            "file_name": file.filename,
            "file_data": file_data,
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "is_draft": False,
            "status": "pending",
            "created_at": datetime.utcnow()
        })
        
        db.commit()
        
        row = result.fetchone()
        return Document(
            document_id=row.document_id,
            land_id=row.land_id,
            task_id=row.task_id,
            subtask_id=row.subtask_id,
            document_type=row.document_type,
            file_name=row.file_name,
            file_path=row.file_path,
            file_size=row.file_size,
            uploaded_by=row.uploaded_by,
            created_at=row.created_at,
            mime_type=row.mime_type,
            is_draft=row.is_draft,
            status=row.status
        )
        
    except Exception as e:
        db.rollback()
        print(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("/subtask/{subtask_id}", response_model=List[Document])
async def get_subtask_documents(
    subtask_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a specific subtask."""
    # Check if subtask exists
    subtask_check = text("""
        SELECT s.subtask_id FROM subtasks s WHERE s.subtask_id = :subtask_id
    """)
    
    subtask_result = db.execute(subtask_check, {"subtask_id": str(subtask_id)}).fetchone()
    
    if not subtask_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    
    # Get documents for this subtask
    query = text("""
        SELECT d.document_id, d.land_id, d.task_id, d.subtask_id, d.document_type, d.file_name, 
               d.file_path, d.file_size, d.uploaded_by, d.created_at, d.mime_type, 
               d.is_draft, d.status, d.approved_by, d.approved_at, 
               d.rejection_reason, d.admin_comments
        FROM documents d
        WHERE d.subtask_id = :subtask_id
        ORDER BY d.created_at DESC
    """)
    
    results = db.execute(query, {"subtask_id": str(subtask_id)}).fetchall()
    
    return [
        Document(
            document_id=row.document_id,
            land_id=row.land_id,
            task_id=row.task_id,
            subtask_id=row.subtask_id,
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
            admin_comments=row.admin_comments
        )
        for row in results
    ]