from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import json

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import MessageResponse

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/land/{land_id}/role/{reviewer_role}", response_model=Dict[str, Any])
async def save_review_status(
    land_id: UUID,
    reviewer_role: str,
    review_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or update review status for a specific role on a land."""
    
    # Validate reviewer_role
    valid_roles = ['re_sales_advisor', 're_analyst', 're_governance_lead']
    if reviewer_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reviewer role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Check if land exists using stored procedure
    land_result = db.execute(
        text("SELECT * FROM check_land_exists_for_review(CAST(:land_id AS uuid))"),
        {"land_id": str(land_id)}
    ).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    try:
        # Check if review already exists
        check_query = text("""
            SELECT review_id FROM land_reviews 
            WHERE land_id = :land_id AND reviewer_role = :reviewer_role
        """)
        existing = db.execute(check_query, {
            "land_id": str(land_id),
            "reviewer_role": reviewer_role
        }).fetchone()
        
        if existing:
            # Update existing review
            update_query = text("""
                UPDATE land_reviews SET
                    reviewer_id = :reviewer_id,
                    reviewer_name = :reviewer_name,
                    status = :status,
                    rating = :rating,
                    comments = :comments,
                    justification = :justification,
                    subtasks_completed = :subtasks_completed,
                    total_subtasks = :total_subtasks,
                    documents_approved = :documents_approved,
                    total_documents = :total_documents,
                    review_data = :review_data,
                    approved_at = :approved_at,
                    published = :published,
                    published_at = :published_at,
                    updated_at = NOW()
                WHERE land_id = :land_id AND reviewer_role = :reviewer_role
                RETURNING review_id
            """)
        else:
            # Insert new review
            update_query = text("""
                INSERT INTO land_reviews (
                    land_id, reviewer_role, reviewer_id, reviewer_name,
                    status, rating, comments, justification,
                    subtasks_completed, total_subtasks,
                    documents_approved, total_documents,
                    review_data, approved_at, published, published_at
                ) VALUES (
                    :land_id, :reviewer_role, :reviewer_id, :reviewer_name,
                    :status, :rating, :comments, :justification,
                    :subtasks_completed, :total_subtasks,
                    :documents_approved, :total_documents,
                    :review_data, :approved_at, :published, :published_at
                )
                RETURNING review_id
            """)
        
        # Prepare parameters
        params = {
            "land_id": str(land_id),
            "reviewer_role": reviewer_role,
            "reviewer_id": str(current_user["user_id"]),
            "reviewer_name": review_data.get("reviewerName"),
            "status": review_data.get("status", "pending"),
            "rating": review_data.get("rating"),
            "comments": review_data.get("comments"),
            "justification": review_data.get("justification"),
            "subtasks_completed": review_data.get("subtasksCompleted", 0),
            "total_subtasks": review_data.get("totalSubtasks", 0),
            "documents_approved": review_data.get("documentsApproved", 0),
            "total_documents": review_data.get("totalDocuments", 0),
            "review_data": json.dumps(review_data) if review_data else None,
            "approved_at": review_data.get("approvedAt"),
            "published": review_data.get("published", False),
            "published_at": review_data.get("publishedAt")
        }
        
        result = db.execute(update_query, params)
        db.commit()
        
        # Auto-publish land to marketplace if this review is published
        if params.get("published") == True:
            try:
                # Check if land is already published using stored procedure
                land_status = db.execute(
                    text("SELECT * FROM get_land_status(CAST(:land_id AS uuid))"),
                    {"land_id": str(land_id)}
                ).fetchone()
                
                if land_status and land_status.status != 'published':
                    # Check if land has required fields for publishing
                    check_fields_query = text("""
                        SELECT 
                            title IS NOT NULL AND
                            location_text IS NOT NULL AND
                            energy_key IS NOT NULL AND
                            capacity_mw IS NOT NULL AND
                            price_per_mwh IS NOT NULL AND
                            timeline_text IS NOT NULL AND
                            contract_term_years IS NOT NULL AND
                            developer_name IS NOT NULL as has_required_fields
                        FROM lands 
                        WHERE land_id = :land_id
                    """)
                    fields_check = db.execute(check_fields_query, {"land_id": str(land_id)}).fetchone()
                    
                    if fields_check and fields_check.has_required_fields:
                        # Publish the land to marketplace
                        publish_query = text("""
                            UPDATE lands 
                            SET status = 'published', published_at = NOW()
                            WHERE land_id = :land_id 
                            AND status IN ('draft', 'submitted', 'under_review', 'approved', 'investor_ready')
                        """)
                        db.execute(publish_query, {"land_id": str(land_id)})
                        db.commit()
            except Exception as publish_error:
                # Log but don't fail the review save if publish fails
                print(f"Warning: Failed to auto-publish land {land_id}: {str(publish_error)}")
        
        # Fetch and return the saved review
        return await get_review_status(land_id, reviewer_role, current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save review status: {str(e)}"
        )


@router.get("/land/{land_id}/role/{reviewer_role}", response_model=Dict[str, Any])
async def get_review_status(
    land_id: UUID,
    reviewer_role: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get review status for a specific role on a land."""
    
    query = text("""
        SELECT 
            review_id, land_id, reviewer_role, reviewer_id, reviewer_name,
            status, rating, comments, justification,
            subtasks_completed, total_subtasks,
            documents_approved, total_documents,
            review_data, approved_at, published, published_at,
            created_at, updated_at
        FROM land_reviews
        WHERE land_id = :land_id AND reviewer_role = :reviewer_role
    """)
    
    result = db.execute(query, {
        "land_id": str(land_id),
        "reviewer_role": reviewer_role
    }).fetchone()
    
    if not result:
        # Return default pending status
        return {
            "status": "pending",
            "published": False,
            "subtasksCompleted": 0,
            "totalSubtasks": 0,
            "documentsApproved": 0,
            "totalDocuments": 0
        }
    
    return {
        "review_id": str(result.review_id),
        "land_id": str(result.land_id),
        "reviewer_role": result.reviewer_role,
        "reviewer_id": str(result.reviewer_id) if result.reviewer_id else None,
        "reviewerName": result.reviewer_name,
        "status": result.status,
        "rating": result.rating,
        "comments": result.comments,
        "justification": result.justification,
        "subtasksCompleted": result.subtasks_completed,
        "totalSubtasks": result.total_subtasks,
        "documentsApproved": result.documents_approved,
        "totalDocuments": result.total_documents,
        "approvedAt": result.approved_at.isoformat() if result.approved_at else None,
        "published": result.published,
        "publishedAt": result.published_at.isoformat() if result.published_at else None,
        "createdAt": result.created_at.isoformat() if result.created_at else None,
        "updatedAt": result.updated_at.isoformat() if result.updated_at else None
    }


@router.get("/land/{land_id}/all", response_model=Dict[str, Any])
async def get_all_review_statuses(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all review statuses for a land (all roles)."""
    
    # Check if land exists using stored procedure
    land_result = db.execute(
        text("SELECT * FROM check_land_exists_for_review(CAST(:land_id AS uuid))"),
        {"land_id": str(land_id)}
    ).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    query = text("""
        SELECT 
            review_id, land_id, reviewer_role, reviewer_id, reviewer_name,
            status, rating, comments, justification,
            subtasks_completed, total_subtasks,
            documents_approved, total_documents,
            review_data, approved_at, published, published_at,
            created_at, updated_at
        FROM land_reviews
        WHERE land_id = :land_id
        ORDER BY created_at ASC
    """)
    
    results = db.execute(query, {"land_id": str(land_id)}).fetchall()
    
    # Build response with all three roles
    all_roles = ['re_sales_advisor', 're_analyst', 're_governance_lead']
    response = {}
    
    for role in all_roles:
        # Find existing review for this role
        role_review = next((r for r in results if r.reviewer_role == role), None)
        
        if role_review:
            response[role] = {
                "review_id": str(role_review.review_id),
                "land_id": str(role_review.land_id),
                "reviewer_role": role_review.reviewer_role,
                "reviewer_id": str(role_review.reviewer_id) if role_review.reviewer_id else None,
                "reviewerName": role_review.reviewer_name,
                "status": role_review.status,
                "rating": role_review.rating,
                "comments": role_review.comments,
                "justification": role_review.justification,
                "subtasksCompleted": role_review.subtasks_completed,
                "totalSubtasks": role_review.total_subtasks,
                "documentsApproved": role_review.documents_approved,
                "totalDocuments": role_review.total_documents,
                "approvedAt": role_review.approved_at.isoformat() if role_review.approved_at else None,
                "published": role_review.published,
                "publishedAt": role_review.published_at.isoformat() if role_review.published_at else None,
                "createdAt": role_review.created_at.isoformat() if role_review.created_at else None,
                "updatedAt": role_review.updated_at.isoformat() if role_review.updated_at else None
            }
        else:
            # Default pending status
            response[role] = {
                "status": "pending",
                "published": False,
                "subtasksCompleted": 0,
                "totalSubtasks": 0,
                "documentsApproved": 0,
                "totalDocuments": 0
            }
    
    return response


@router.delete("/land/{land_id}/role/{reviewer_role}", response_model=MessageResponse)
async def delete_review_status(
    land_id: UUID,
    reviewer_role: str,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete review status for a specific role (admin only)."""
    
    try:
        query = text("""
            DELETE FROM land_reviews
            WHERE land_id = :land_id AND reviewer_role = :reviewer_role
            RETURNING review_id
        """)
        
        result = db.execute(query, {
            "land_id": str(land_id),
            "reviewer_role": reviewer_role
        }).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        db.commit()
        return MessageResponse(message="Review status deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete review status: {str(e)}"
        )


