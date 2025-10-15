from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    LandCreate, LandUpdate, LandResponse, Land,
    LandSectionCreate, LandSection,
    SectionDefinition, MessageResponse
)

router = APIRouter(prefix="/lands", tags=["lands"])


# Admin Dashboard
@router.get("/admin/projects", response_model=List[Dict[str, Any]])
async def get_admin_projects(
    status_filter: Optional[str] = Query(None, description="Filter by status: submitted, under_review, approved, published, etc."),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all projects for admin review (admin only)."""
    
    # Query to get all submitted projects with landowner details
    query = text("""
        SELECT 
            l.land_id,
            l.title,
            l.location_text,
            l.land_type,
            l.energy_key,
            l.capacity_mw,
            l.price_per_mwh,
            l.area_acres,
            l.status,
            l.timeline_text,
            l.contract_term_years,
            l.developer_name,
            l.admin_notes,
            l.created_at,
            l.updated_at,
            l.published_at,
            u.email as landowner_email,
            u.first_name,
            u.last_name,
            u.phone
        FROM lands l
        LEFT JOIN "user" u ON l.landowner_id = u.user_id
        WHERE 1=1
        AND l.status != 'draft'
    """ + (" AND l.status = :status_filter" if status_filter else "") + """
        ORDER BY 
            CASE l.status
                WHEN 'submitted' THEN 1
                WHEN 'under_review' THEN 2
                WHEN 'approved' THEN 3
                WHEN 'published' THEN 4
                WHEN 'rtb' THEN 5
                WHEN 'interest_locked' THEN 6
                ELSE 7
            END,
            l.created_at DESC
    """)
    
    params = {}
    if status_filter:
        params["status_filter"] = status_filter
    
    results = db.execute(query, params).fetchall()
    
    projects = []
    for row in results:
        landowner_name = f"{row.first_name or ''} {row.last_name or ''}".strip() or row.landowner_email
        
        project = {
            "id": str(row.land_id),
            "landownerName": landowner_name,
            "landownerEmail": row.landowner_email,
            "landownerPhone": row.phone,
            "location": row.location_text or "Not specified",
            "projectType": row.land_type or "Not specified",
            "energyType": row.energy_key or "Not specified",
            "capacity": f"{row.capacity_mw} MW" if row.capacity_mw else "Not specified",
            "pricePerMWh": float(row.price_per_mwh) if row.price_per_mwh else 0,
            "areaAcres": float(row.area_acres) if row.area_acres else 0,
            "status": row.status or "unknown",
            "timeline": row.timeline_text or "Not specified",
            "contractTerm": f"{row.contract_term_years} years" if row.contract_term_years else "Not specified",
            "developerName": row.developer_name or "Not specified",
            "adminNotes": row.admin_notes or "",
            "submittedDate": row.created_at.isoformat() if row.created_at else None,
            "lastUpdated": row.updated_at.isoformat() if row.updated_at else None,
            "publishedAt": row.published_at.isoformat() if row.published_at else None,
            "title": row.title or f"{row.land_type} Project"
        }
        projects.append(project)
    
    return projects


@router.get("/admin/summary", response_model=Dict[str, Any])
async def get_admin_summary(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard summary statistics (admin only)."""
    
    summary_query = text("""
        SELECT 
            COUNT(*) as total_projects,
            COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_reviews,
            COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
            COUNT(CASE WHEN status = 'rtb' THEN 1 END) as ready_to_buy,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
            COALESCE(SUM(area_acres), 0) as total_land_area,
            COALESCE(SUM(capacity_mw), 0) as total_capacity
        FROM lands
        WHERE status != 'draft'
    """)
    
    result = db.execute(summary_query).fetchone()
    
    # Get landowner count
    landowner_query = text("""
        SELECT COUNT(DISTINCT l.landowner_id) as landowner_count
        FROM lands l
        WHERE l.status != 'draft'
    """)
    landowner_result = db.execute(landowner_query).fetchone()
    
    return {
        "totalProjects": result.total_projects,
        "pendingReviews": result.pending_reviews,
        "underReview": result.under_review,
        "approved": result.approved,
        "published": result.published,
        "readyToBuy": result.ready_to_buy,
        "rejected": result.rejected,
        "totalLandArea": float(result.total_land_area),
        "totalCapacity": float(result.total_capacity),
        "totalLandowners": landowner_result.landowner_count
    }


# Landowner Dashboard
@router.get("/dashboard/summary", response_model=Dict[str, Any])
async def get_landowner_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get landowner dashboard summary with statistics."""
    user_id = current_user["user_id"]
    
    # Get summary statistics
    summary_query = text("""
        SELECT 
            COUNT(*) as total_projects,
            COALESCE(SUM(area_acres), 0) as total_land_area,
            COUNT(CASE WHEN status IN ('published', 'rtb', 'interest_locked') THEN 1 END) as active_projects,
            COUNT(CASE WHEN status IN ('published', 'rtb') THEN 1 END) as completed_submissions
        FROM lands
        WHERE landowner_id = :user_id
    """)
    
    summary_result = db.execute(summary_query, {"user_id": user_id}).fetchone()
    
    # Calculate estimated revenue (simplified calculation based on capacity)
    revenue_query = text("""
        SELECT COALESCE(SUM(capacity_mw * price_per_mwh * 8760 / 1000000), 0) as estimated_revenue
        FROM lands
        WHERE landowner_id = :user_id 
        AND status IN ('published', 'rtb', 'interest_locked')
        AND capacity_mw IS NOT NULL
        AND price_per_mwh IS NOT NULL
    """)
    
    revenue_result = db.execute(revenue_query, {"user_id": user_id}).fetchone()
    
    return {
        "totalLandArea": float(summary_result.total_land_area) if summary_result.total_land_area else 0,
        "activeProjects": int(summary_result.active_projects),
        "completedSubmissions": int(summary_result.completed_submissions),
        "estimatedRevenue": float(revenue_result.estimated_revenue) if revenue_result.estimated_revenue else 0,
        "totalProjects": int(summary_result.total_projects)
    }


@router.get("/dashboard/projects", response_model=List[Dict[str, Any]])
async def get_landowner_dashboard_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or location"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get landowner's projects for dashboard display."""
    user_id = current_user["user_id"]
    
    # Build query
    query = """
        SELECT 
            l.land_id,
            l.title as name,
            l.location_text as location,
            l.energy_key as type,
            l.capacity_mw as capacity,
            l.status,
            l.updated_at as last_updated,
            l.timeline_text as timeline,
            l.price_per_mwh,
            l.area_acres,
            l.created_at,
            CASE 
                WHEN l.status = 'draft' THEN 'Draft - Not yet submitted (visible to admin)'
                WHEN l.status = 'submitted' THEN 'Submitted - Awaiting admin review'
                WHEN l.status = 'under_review' THEN 'Admin reviewing - sections assigned to reviewers'
                WHEN l.status = 'approved' THEN 'Approved - Ready for publishing'
                WHEN l.status = 'published' THEN 'Published to investors'
                WHEN l.status = 'rtb' THEN 'Ready to Buy - All approvals completed'
                WHEN l.status = 'interest_locked' THEN 'Investor interest received - Hidden from others'
                WHEN l.status = 'rejected' THEN 'Rejected - Needs revision'
                ELSE 'Unknown status'
            END as description
        FROM lands l
        WHERE l.landowner_id = :user_id
    """
    
    params = {"user_id": user_id, "skip": skip, "limit": limit}
    
    # Apply filters
    if status_filter:
        query += " AND l.status = :status_filter"
        params["status_filter"] = status_filter
    
    if search:
        query += " AND (LOWER(l.title) LIKE :search OR LOWER(l.location_text) LIKE :search)"
        params["search"] = f"%{search.lower()}%"
    
    query += " ORDER BY l.updated_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(query), params).fetchall()
    
    # Format projects for frontend
    projects = []
    for row in results:
        # Calculate estimated revenue if price data exists
        estimated_revenue = 0
        if row.capacity and row.price_per_mwh:
            # Annual revenue in millions (capacity_mw * price_per_mwh * 8760 hours / 1,000,000)
            estimated_revenue = float(row.capacity) * float(row.price_per_mwh) * 8760 / 1000000
        
        project = {
            "id": str(row.land_id),
            "name": row.name or "Untitled Project",
            "location": row.location or "Location not specified",
            "type": row.type or "solar",  # Default to solar if not specified
            "capacity": float(row.capacity) if row.capacity else 0,
            "status": row.status,
            "lastUpdated": row.last_updated.isoformat() if row.last_updated else None,
            "timeline": row.timeline or "Not specified",
            "estimatedRevenue": round(estimated_revenue, 2),
            "description": row.description,
            "createdAt": row.created_at.isoformat() if row.created_at else None
        }
        projects.append(project)
    
    return projects


# Land CRUD operations
@router.post("/", response_model=Land)
async def create_land(
    land_data: LandCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new land entry (authenticated users)."""
    try:
        # Generate new land ID
        import uuid
        land_id = uuid.uuid4()
        
        # Prepare coordinates as JSON string if it's a dict
        coordinates_json = land_data.coordinates
        if isinstance(coordinates_json, dict):
            import json
            coordinates_json = json.dumps(coordinates_json)
        
        # Create land with direct INSERT
        insert_query = text("""
            INSERT INTO lands (
                land_id, landowner_id, title, location_text, coordinates, 
                area_acres, land_type, energy_key, capacity_mw, price_per_mwh,
                timeline_text, contract_term_years, developer_name, admin_notes, status
            ) VALUES (
                :land_id, :landowner_id, :title, :location_text, :coordinates,
                :area_acres, :land_type, :energy_key, :capacity_mw, :price_per_mwh,
                :timeline_text, :contract_term_years, :developer_name, :admin_notes, 'draft'
            )
        """)
        
        db.execute(insert_query, {
            "land_id": str(land_id),
            "landowner_id": current_user["user_id"],
            "title": land_data.title,
            "location_text": land_data.location_text,
            "coordinates": coordinates_json,
            "area_acres": float(land_data.area_acres) if land_data.area_acres else None,
            "land_type": land_data.land_type,
            "energy_key": land_data.energy_key,
            "capacity_mw": float(land_data.capacity_mw) if land_data.capacity_mw else None,
            "price_per_mwh": float(land_data.price_per_mwh) if land_data.price_per_mwh else None,
            "timeline_text": land_data.timeline_text,
            "contract_term_years": land_data.contract_term_years,
            "developer_name": land_data.developer_name,
            "admin_notes": land_data.admin_notes
        })
        
        db.commit()
        
        # Fetch the created land
        return await get_land(land_id, current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create land: {str(e)}"
        )

@router.get("/", response_model=List[Land])
async def list_lands(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    owner_id: Optional[UUID] = Query(None, description="Filter by owner"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List lands with optional filters."""
    # Build dynamic query based on user role and filters
    base_query = """
        SELECT l.land_id, l.landowner_id, l.title, l.location_text,
               l.coordinates, l.area_acres, l.land_type, l.status,
               l.admin_notes, l.energy_key, l.capacity_mw, l.price_per_mwh,
               l.timeline_text, l.contract_term_years, l.developer_name,
               l.published_at, l.interest_locked_at, l.created_at, l.updated_at
        FROM lands l
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    # Apply filters based on user role
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles:
        # Non-admin users can only see their own lands or published lands
        base_query += " AND (l.landowner_id = :current_user_id OR l.status = 'published')"
        params["current_user_id"] = current_user["user_id"]
    
    if status_filter:
        base_query += " AND l.status = :status_filter"
        params["status_filter"] = status_filter
    
    if owner_id:
        base_query += " AND l.landowner_id = :owner_id"
        params["owner_id"] = str(owner_id)
    
    base_query += " ORDER BY l.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    return [
        Land(
            land_id=row.land_id,
            landowner_id=row.landowner_id,
            title=row.title,
            location_text=row.location_text,
            coordinates=row.coordinates,
            area_acres=Decimal(str(row.area_acres)) if row.area_acres else None,
            land_type=row.land_type,
            status=row.status,
            admin_notes=row.admin_notes,
            energy_key=row.energy_key,
            capacity_mw=Decimal(str(row.capacity_mw)) if row.capacity_mw else None,
            price_per_mwh=Decimal(str(row.price_per_mwh)) if row.price_per_mwh else None,
            timeline_text=row.timeline_text,
            contract_term_years=row.contract_term_years,
            developer_name=row.developer_name,
            published_at=row.published_at,
            interest_locked_at=row.interest_locked_at,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in results
    ]

@router.get("/{land_id}", response_model=Land)
async def get_land(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get land by ID."""
    query = text("""
        SELECT l.land_id, l.landowner_id, l.title, l.location_text,
               l.coordinates, l.area_acres, l.land_type, l.status,
               l.admin_notes, l.energy_key, l.capacity_mw, l.price_per_mwh,
               l.timeline_text, l.contract_term_years, l.developer_name,
               l.published_at, l.interest_locked_at, l.created_at, l.updated_at
        FROM lands l
        WHERE l.land_id = :land_id
    """)
    
    result = db.execute(query, {"land_id": str(land_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    # Check permissions - compare both as strings to avoid UUID/string mismatch
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    landowner_id_str = str(result.landowner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = user_id_str == landowner_id_str
    is_published = result.status == "published"
    
    if not (is_admin or is_owner or is_published):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this land"
        )
    
    return Land(
        land_id=result.land_id,
        landowner_id=result.landowner_id,
        title=result.title,
        location_text=result.location_text,
        coordinates=result.coordinates,
        area_acres=Decimal(str(result.area_acres)) if result.area_acres else None,
        land_type=result.land_type,
        status=result.status,
        admin_notes=result.admin_notes,
        energy_key=result.energy_key,
        capacity_mw=Decimal(str(result.capacity_mw)) if result.capacity_mw else None,
        price_per_mwh=Decimal(str(result.price_per_mwh)) if result.price_per_mwh else None,
        timeline_text=result.timeline_text,
        contract_term_years=result.contract_term_years,
        developer_name=result.developer_name,
        published_at=result.published_at,
        interest_locked_at=result.interest_locked_at,
        created_at=result.created_at,
        updated_at=result.updated_at
    )

@router.put("/{land_id}", response_model=LandResponse)
async def update_land(
    land_id: UUID,
    land_update: LandUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update land information (owner or admin only)."""
    # Check if land exists and user has permission
    land_check = text("""
        SELECT owner_id, status_key FROM lands WHERE land_id = :land_id
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
    owner_id_str = str(land_result.owner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = owner_id_str == user_id_str
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this land"
        )
    
    # Build dynamic update query
    update_fields = []
    params = {"land_id": str(land_id)}
    
    update_data = land_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["title", "description", "location", "coordinates"]:
            update_fields.append(f"{field} = :{field}")
            params[field] = value
        elif field in ["total_area", "price_per_sqft", "total_price"]:
            update_fields.append(f"{field} = :{field}")
            params[field] = float(value)
    
    if update_fields:
        update_query = text(f"""
            UPDATE lands 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE land_id = :land_id
        """)
        
        db.execute(update_query, params)
        db.commit()
    
    return await get_land(land_id, current_user, db)

@router.delete("/{land_id}", response_model=MessageResponse)
async def delete_land(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete land (owner or admin only)."""
    # Check if land exists and user has permission
    land_check = text("""
        SELECT owner_id, status_key FROM lands WHERE land_id = :land_id
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
    owner_id_str = str(land_result.owner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = owner_id_str == user_id_str
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this land"
        )
    
    # Only allow deletion of draft lands
    if land_result.status_key != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft lands can be deleted"
        )
    
    delete_query = text("DELETE FROM lands WHERE land_id = :land_id")
    db.execute(delete_query, {"land_id": str(land_id)})
    db.commit()
    
    return MessageResponse(message="Land deleted successfully")

# Land status management
@router.post("/{land_id}/submit", response_model=MessageResponse)
async def submit_land_for_review(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit land for review (owner only)."""
    # First check if land exists and belongs to user
    check_query = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    
    land_result = db.execute(check_query, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    # Check permissions - convert both to strings for comparison
    user_id_str = str(current_user["user_id"])
    landowner_id_str = str(land_result.landowner_id)
    
    if landowner_id_str != user_id_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit this land"
        )
    
    if land_result.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only submit draft lands. Current status: {land_result.status}"
        )
    
    # Try to use stored procedure first, fallback to direct update
    try:
        sp_query = text("SELECT sp_land_submit_for_review(:land_id, :owner_id) as success")
        result = db.execute(sp_query, {
            "land_id": str(land_id),
            "owner_id": current_user["user_id"]
        }).fetchone()
        
        if result and result.success:
            db.commit()
            return MessageResponse(message="Land submitted for review successfully")
    except Exception as sp_error:
        # Stored procedure doesn't exist, use direct update
        db.rollback()
        print(f"Stored procedure not found, using direct update: {sp_error}")
        
        try:
            update_query = text("""
                UPDATE lands 
                SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
                WHERE land_id = :land_id AND landowner_id = :owner_id
            """)
            
            db.execute(update_query, {
                "land_id": str(land_id),
                "owner_id": current_user["user_id"]
            })
            
            db.commit()
            return MessageResponse(message="Land submitted for review successfully")
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error submitting land: {str(e)}"
            )

@router.post("/{land_id}/publish", response_model=MessageResponse)
async def publish_land(
    land_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Publish land (admin only)."""
    query = text("SELECT sp_publish_land(:land_id) as success")
    
    try:
        result = db.execute(query, {"land_id": str(land_id)}).fetchone()
        db.commit()
        
        if result and result.success:
            return MessageResponse(message="Land published successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to publish land"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error publishing land: {str(e)}"
        )

@router.post("/{land_id}/mark-rtb", response_model=MessageResponse)
async def mark_land_ready_to_buy(
    land_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Mark land as ready to buy (admin only)."""
    query = text("SELECT sp_land_mark_rtb(:land_id) as success")
    
    try:
        result = db.execute(query, {"land_id": str(land_id)}).fetchone()
        db.commit()
        
        if result and result.success:
            return MessageResponse(message="Land marked as ready to buy successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to mark land as ready to buy"
            )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error marking land as RTB: {str(e)}"
        )

# Land sections management
@router.get("/{land_id}/sections", response_model=List[LandSection])
async def get_land_sections(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sections for a land."""
    # First check if user can access this land
    await get_land(land_id, current_user, db)
    
    query = text("""
        SELECT ls.land_section_id, ls.land_id, ls.section_definition_id,
               ls.section_data, ls.created_at, ls.updated_at,
               sd.section_name, sd.section_type, sd.is_required
        FROM land_sections ls
        JOIN section_definitions sd ON ls.section_definition_id = sd.section_definition_id
        WHERE ls.land_id = :land_id
        ORDER BY sd.section_name
    """)
    
    results = db.execute(query, {"land_id": str(land_id)}).fetchall()
    
    return [
        LandSection(
            land_section_id=row.land_section_id,
            land_id=row.land_id,
            section_definition_id=row.section_definition_id,
            section_data=row.section_data,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in results
    ]

@router.post("/{land_id}/sections", response_model=LandSection)
async def create_land_section(
    land_id: UUID,
    section_data: LandSectionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new section for a land."""
    # Check if user owns the land or is admin
    land_check = text("SELECT owner_id FROM lands WHERE land_id = :land_id")
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    # Check permissions - convert both to strings for comparison
    user_roles = current_user.get("roles", [])
    user_id_str = str(current_user["user_id"])
    owner_id_str = str(land_result.owner_id)
    
    is_admin = "administrator" in user_roles
    is_owner = owner_id_str == user_id_str
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Use stored procedure to assign section
    query = text("""
        SELECT sp_assign_section(:land_id, :section_definition_id, :section_data) as section_id
    """)
    
    result = db.execute(query, {
        "land_id": str(land_id),
        "section_definition_id": str(section_data.section_definition_id),
        "section_data": section_data.section_data
    }).fetchone()
    
    db.commit()
    
    if not result or not result.section_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create section"
        )
    
    # Fetch the created section
    section_query = text("""
        SELECT land_section_id, land_id, section_definition_id, section_data, created_at, updated_at
        FROM land_sections
        WHERE land_section_id = :section_id
    """)
    
    section_result = db.execute(section_query, {"section_id": result.section_id}).fetchone()
    
    return LandSection(
        land_section_id=section_result.land_section_id,
        land_id=section_result.land_id,
        section_definition_id=section_result.section_definition_id,
        section_data=section_result.section_data,
        created_at=section_result.created_at,
        updated_at=section_result.updated_at
    )

@router.get("/sections/definitions", response_model=List[SectionDefinition])
async def get_section_definitions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available section definitions."""
    query = text("""
        SELECT section_definition_id, section_name, section_type, is_required, created_at
        FROM section_definitions
        ORDER BY section_name
    """)
    
    results = db.execute(query).fetchall()
    
    return [
        SectionDefinition(
            section_definition_id=row.section_definition_id,
            section_name=row.section_name,
            section_type=row.section_type,
            is_required=row.is_required,
            created_at=row.created_at
        )
        for row in results
    ]