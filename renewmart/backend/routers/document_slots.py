#!/usr/bin/env python3
"""
Backend API endpoints for D1/D2 independent review management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import Document, MessageResponse

router = APIRouter(prefix="/document-slots", tags=["document-slots"])

@router.post("/{land_id}/{document_type}/{doc_slot}/mark-for-review")
async def mark_slot_for_review(
    land_id: UUID,
    document_type: str,
    doc_slot: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all documents in a specific slot for review"""
    
    # Validate doc_slot
    if doc_slot not in ['D1', 'D2']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doc_slot must be 'D1' or 'D2'"
        )
    
    # Validate document type supports multiple slots
    multi_slot_types = ['ownership-documents', 'government-nocs']
    if document_type not in multi_slot_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document type does not support multiple slots"
        )
    
    try:
        # Update all documents in the slot using stored procedure
        # Note: This requires a batch update stored procedure which we'll create
        # For now, keeping direct query but can be converted later
        update_query = text("""
            UPDATE documents 
            SET version_status = 'under_review',
                review_locked_at = NOW(),
                review_locked_by = :user_id
            WHERE land_id = :land_id 
              AND document_type = :document_type
              AND doc_slot = :doc_slot
              AND subtask_id IS NULL
        """)
        
        result = db.execute(update_query, {
            "land_id": str(land_id),
            "document_type": document_type,
            "doc_slot": doc_slot,
            "user_id": current_user["user_id"]
        })
        
        updated_count = result.rowcount
        
        if updated_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No documents found in {doc_slot} slot for {document_type}"
            )
        
        db.commit()
        
        return MessageResponse(
            message=f"Successfully marked {updated_count} documents in {doc_slot} slot for review",
            details={
                "land_id": str(land_id),
                "document_type": document_type,
                "doc_slot": doc_slot,
                "updated_count": updated_count,
                "reason": reason
            }
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark slot for review: {str(e)}"
        )

@router.post("/{land_id}/{document_type}/{doc_slot}/unlock")
async def unlock_slot_from_review(
    land_id: UUID,
    document_type: str,
    doc_slot: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlock all documents in a specific slot from review"""
    
    # Validate doc_slot
    if doc_slot not in ['D1', 'D2']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doc_slot must be 'D1' or 'D2'"
        )
    
    try:
        # Update all documents in the slot to active
        update_query = text("""
            UPDATE documents 
            SET version_status = 'active',
                review_locked_at = NULL,
                review_locked_by = NULL
            WHERE land_id = :land_id 
              AND document_type = :document_type
              AND doc_slot = :doc_slot
              AND subtask_id IS NULL
        """)
        
        result = db.execute(update_query, {
            "land_id": str(land_id),
            "document_type": document_type,
            "doc_slot": doc_slot
        })
        
        updated_count = result.rowcount
        
        if updated_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No documents found in {doc_slot} slot for {document_type}"
            )
        
        db.commit()
        
        return MessageResponse(
            message=f"Successfully unlocked {updated_count} documents in {doc_slot} slot from review",
            details={
                "land_id": str(land_id),
                "document_type": document_type,
                "doc_slot": doc_slot,
                "updated_count": updated_count,
                "reason": reason
            }
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unlock slot from review: {str(e)}"
        )

@router.get("/{land_id}/status-summary")
async def get_slot_status_summary(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get review status summary for all document slots"""
    
    try:
        query = text("""
            WITH slot_summary AS (
                SELECT 
                    document_type,
                    doc_slot,
                    COUNT(*) as total_docs,
                    COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) as under_review_docs,
                    CASE 
                        WHEN COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) > 0 
                        THEN 'under_review'
                        ELSE 'active'
                    END as slot_status
                FROM documents
                WHERE land_id = :land_id
                  AND document_type IN ('ownership-documents', 'government-nocs')
                  AND doc_slot IN ('D1', 'D2')
                  AND subtask_id IS NULL
                GROUP BY document_type, doc_slot
            )
            SELECT 
                document_type,
                COUNT(*) as total_slots,
                COUNT(CASE WHEN slot_status = 'under_review' THEN 1 END) as slots_under_review,
                STRING_AGG(
                    CASE 
                        WHEN slot_status = 'under_review' THEN doc_slot || ': under review'
                        ELSE doc_slot || ': active'
                    END, 
                    ', '
                ) as status_summary,
                CASE 
                    WHEN COUNT(CASE WHEN slot_status = 'under_review' THEN 1 END) > 0 
                    THEN true
                    ELSE false
                END as has_review_status
            FROM slot_summary
            GROUP BY document_type
            ORDER BY document_type
        """)
        
        results = db.execute(query, {"land_id": str(land_id)}).fetchall()
        
        summary = {}
        for row in results:
            summary[row.document_type] = {
                "total_slots": row.total_slots,
                "slots_under_review": row.slots_under_review,
                "status_summary": row.status_summary,
                "has_review_status": row.has_review_status,
                "show_slot_indicators": row.total_slots > 1
            }
        
        return {
            "land_id": str(land_id),
            "slot_status": summary
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get slot status summary: {str(e)}"
        )

@router.get("/{land_id}/{document_type}/slot-status")
async def get_document_type_slot_status(
    land_id: UUID,
    document_type: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get slot status for a specific document type"""
    
    try:
        query = text("""
            SELECT 
                doc_slot,
                COUNT(*) as total_docs,
                COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) as under_review_docs,
                CASE 
                    WHEN COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) > 0 
                    THEN 'under_review'
                    ELSE 'active'
                END as slot_status
            FROM documents
            WHERE land_id = :land_id
              AND document_type = :document_type
              AND doc_slot IN ('D1', 'D2')
              AND subtask_id IS NULL
            GROUP BY doc_slot
            ORDER BY doc_slot
        """)
        
        results = db.execute(query, {
            "land_id": str(land_id),
            "document_type": document_type
        }).fetchall()
        
        slot_status = {}
        for row in results:
            slot_status[row.doc_slot] = {
                "total_docs": row.total_docs,
                "under_review_docs": row.under_review_docs,
                "status": row.slot_status,
                "status_indicator": f"{row.doc_slot}: {row.slot_status.replace('_', ' ')}"
            }
        
        return {
            "land_id": str(land_id),
            "document_type": document_type,
            "slot_status": slot_status,
            "has_multiple_slots": len(slot_status) > 1
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get slot status: {str(e)}"
        )
