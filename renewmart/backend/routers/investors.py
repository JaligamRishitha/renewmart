from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import uuid

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    InterestCreate, InterestUpdate, InterestResponse,
    LandVisibilityUpdate, MessageResponse
)

router = APIRouter(prefix="/investors", tags=["investors"])

# Helper functions
def can_access_interest(user_roles: List[str], user_id: str, interest_data: dict) -> bool:
    """Check if user can access an interest record"""
    # Admin can access all interests
    if "administrator" in user_roles:
        return True
    
    # Investor can access their own interests
    if str(interest_data.get("investor_id")) == user_id:
        return True
    
    # Land owner can access interests for their land
    if str(interest_data.get("owner_id")) == user_id:
        return True
    
    return False

def can_manage_interest(user_roles: List[str], user_id: str, interest_data: dict) -> bool:
    """Check if user can manage (update/delete) an interest record"""
    # Admin can manage all interests
    if "administrator" in user_roles:
        return True
    
    # Investor can manage their own interests
    if str(interest_data.get("investor_id")) == user_id:
        return True
    
    # Land owner can update status of interests for their land
    if str(interest_data.get("owner_id")) == user_id:
        return True
    
    return False

# Interest management endpoints
@router.post("/interest", response_model=InterestResponse)
async def express_interest(
    interest_data: InterestCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Express interest in a land (investor only)."""
    user_roles = current_user.get("roles", [])
    
    # Check if user is an investor (temporarily disabled for testing)
    # if "investor" not in user_roles:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only investors can express interest in lands"
    #     )
    
    # Check if land exists and is published
    land_check = text("""
        SELECT landowner_id, status, title, location_text, energy_key
        FROM lands 
        WHERE land_id = :land_id
    """)
    
    land_result = db.execute(land_check, {"land_id": str(interest_data.land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    # Check if land is in appropriate status (published lands are available for investor interest)
    if land_result.status not in ["published", "ready_to_buy"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only express interest in published or ready-to-buy lands"
        )
    
    # Check if investor already expressed interest
    existing_check = text("""
        SELECT interest_id FROM investor_interests 
        WHERE investor_id = :investor_id AND land_id = :land_id
    """)
    
    existing_result = db.execute(existing_check, {
        "investor_id": current_user["user_id"],
        "land_id": str(interest_data.land_id)
    }).fetchone()
    
    if existing_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already expressed interest in this land"
        )
    
    try:
        # Create interest record
        interest_id = str(uuid.uuid4())
        
        create_query = text("""
            INSERT INTO investor_interests (
                interest_id, investor_id, land_id, status, comments, created_at
            ) VALUES (
                :interest_id, :investor_id, :land_id, 'pending', :comments, CURRENT_TIMESTAMP
            )
        """)
        
        db.execute(create_query, {
            "interest_id": interest_id,
            "investor_id": current_user["user_id"],
            "land_id": str(interest_data.land_id),
            "comments": interest_data.comments
        })
        
        db.commit()
        
        # Fetch the created interest
        return await get_interest(UUID(interest_id), current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to express interest: {str(e)}"
        )

@router.get("/interests", response_model=List[InterestResponse])
async def get_interests(
    land_id: Optional[UUID] = None,
    investor_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interests with optional filters."""
    user_roles = current_user.get("roles", [])
    
    # Build base query
    base_query = """
        SELECT ii.interest_id, ii.investor_id, ii.land_id, ii.status,
               ii.comments, ii.created_at, ii.updated_at,
               l.title as land_title, l.location_text as land_location, l.landowner_id as owner_id,
               u.first_name || ' ' || u.last_name as investor_name,
               u.email as investor_email
        FROM investor_interests ii
        JOIN lands l ON ii.land_id = l.land_id
        JOIN users u ON ii.investor_id = u.user_id
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    # Add filters
    if land_id:
        base_query += " AND ii.land_id = :land_id"
        params["land_id"] = str(land_id)
    
    if investor_id:
        base_query += " AND ii.investor_id = :investor_id"
        params["investor_id"] = str(investor_id)
    
    if status:
        base_query += " AND ii.status = :status"
        params["status"] = status
    
    # Add permission filter for non-admin users
    if "administrator" not in user_roles:
        base_query += """
            AND (ii.investor_id = :user_id OR l.owner_id = :user_id)
        """
        params["user_id"] = current_user["user_id"]
    
    base_query += " ORDER BY ii.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    return [
        InterestResponse(
            interest_id=row.interest_id,
            investor_id=row.investor_id,
            land_id=row.land_id,
            status=row.status,
            comments=row.comments,
            created_at=row.created_at,
            updated_at=row.updated_at,
            land_title=row.land_title,
            land_location=row.land_location,
            investor_name=row.investor_name,
            investor_email=row.investor_email
        )
        for row in results
    ]

@router.get("/interest/{interest_id}", response_model=InterestResponse)
async def get_interest(
    interest_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interest by ID."""
    query = text("""
        SELECT ii.interest_id, ii.investor_id, ii.land_id, ii.status,
               ii.comments, ii.created_at, ii.updated_at,
               l.title as land_title, l.location_text as land_location, l.landowner_id as owner_id,
               u.first_name || ' ' || u.last_name as investor_name,
               u.email as investor_email
        FROM investor_interests ii
        JOIN lands l ON ii.land_id = l.land_id
        JOIN users u ON ii.investor_id = u.user_id
        WHERE ii.interest_id = :interest_id
    """)
    
    result = db.execute(query, {"interest_id": str(interest_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    interest_data = {
        "investor_id": result.investor_id,
        "owner_id": result.owner_id
    }
    
    if not can_access_interest(user_roles, current_user["user_id"], interest_data):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this interest"
        )
    
    return InterestResponse(
        interest_id=result.interest_id,
        investor_id=result.investor_id,
        land_id=result.land_id,
        status=result.status,
        comments=result.comments,
        created_at=result.created_at,
        updated_at=result.updated_at,
        land_title=result.land_title,
        land_location=result.land_location,
        investor_name=result.investor_name,
        investor_email=result.investor_email
    )

@router.put("/interest/{interest_id}", response_model=InterestResponse)
async def update_interest(
    interest_id: UUID,
    interest_update: InterestUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update interest (investor or land owner only)."""
    # Check if interest exists and user has permission
    interest_check = text("""
        SELECT ii.investor_id, ii.status as current_status, l.owner_id
        FROM investor_interests ii
        JOIN lands l ON ii.land_id = l.land_id
        WHERE ii.interest_id = :interest_id
    """)
    
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    user_roles = current_user.get("roles", [])
    interest_data = {
        "investor_id": interest_result.investor_id,
        "owner_id": interest_result.owner_id
    }
    
    if not can_manage_interest(user_roles, current_user["user_id"], interest_data):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this interest"
        )
    
    try:
        # Build dynamic update query
        update_fields = []
        params = {"interest_id": str(interest_id)}
        
        update_data = interest_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field in ["status", "comments"]:
                # Land owners can only update status, investors can update comments
                if (field == "status" and str(interest_result.owner_id) == current_user["user_id"]) or \
                   (field == "comments" and str(interest_result.investor_id) == current_user["user_id"]) or \
                   "administrator" in user_roles:
                    # Comments field maps directly to comments column
                    update_fields.append(f"{field} = :{field}")
                    params[field] = value
        
        if update_fields:
            update_query = text(f"""
                UPDATE investor_interests 
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE interest_id = :interest_id
            """)
            
            db.execute(update_query, params)
            db.commit()
        
        return await get_interest(interest_id, current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update interest: {str(e)}"
        )

@router.delete("/interest/{interest_id}", response_model=MessageResponse)
async def withdraw_interest(
    interest_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Withdraw interest (investor only)."""
    # Check if interest exists and user has permission
    interest_check = text("""
        SELECT investor_id FROM investor_interests 
        WHERE interest_id = :interest_id
    """)
    
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    user_roles = current_user.get("roles", [])
    
    # Only the investor who expressed interest or admin can withdraw
    if (str(interest_result.investor_id) != current_user["user_id"] and 
        "administrator" not in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to withdraw this interest"
        )
    
    try:
        # Delete interest
        delete_query = text("DELETE FROM investor_interests WHERE interest_id = :interest_id")
        db.execute(delete_query, {"interest_id": str(interest_id)})
        
        db.commit()
        
        return MessageResponse(message="Interest withdrawn successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to withdraw interest: {str(e)}"
        )

@router.get("/my/interests")
async def get_my_interests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interests expressed by the current user."""
    user_roles = current_user.get("roles", [])
    
    # Check if user is an investor
    if "investor" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only investors can view their interests"
        )
    
    try:
        # Debug: Log user info
        user_id = current_user.get("user_id")
        print(f"[get_my_interests] User ID: {user_id}, Type: {type(user_id)}")
        print(f"[get_my_interests] User roles: {user_roles}")
        
        # First, let's check if there are any interests at all
        check_query = text("SELECT COUNT(*) as count FROM investor_interests")
        count_result = db.execute(check_query).fetchone()
        print(f"[get_my_interests] Total interests in DB: {count_result.count if count_result else 0}")
        
        # Check interests for this specific user
        check_user_query = text("""
            SELECT COUNT(*) as count 
            FROM investor_interests 
            WHERE investor_id::text = :user_id
        """)
        user_count_result = db.execute(check_user_query, {"user_id": str(user_id)}).fetchone()
        print(f"[get_my_interests] Interests for user {user_id}: {user_count_result.count if user_count_result else 0}")
        
        # Build main query - use CAST for UUID comparison to handle string vs UUID
        base_query = """
            SELECT 
                ii.interest_id, 
                ii.investor_id, 
                ii.land_id, 
                ii.status,
                ii.comments, 
                ii.created_at, 
                COALESCE(ii.updated_at, ii.created_at) as updated_at,
                l.title as project_title, 
                l.location_text as project_location, 
                l.landowner_id,
                l.energy_key as project_type,
                l.capacity_mw,
                l.price_per_mwh,
                l.status as land_status,
                TRIM(COALESCE(investor.first_name, '') || ' ' || COALESCE(investor.last_name, '')) as investor_name,
                investor.email as investor_email,
                TRIM(COALESCE(owner.first_name, '') || ' ' || COALESCE(owner.last_name, '')) as landowner_name,
                owner.email as landowner_email
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            JOIN "user" investor ON ii.investor_id = investor.user_id
            JOIN "user" owner ON l.landowner_id = owner.user_id
            WHERE ii.investor_id::text = :user_id
        """
        
        params = {"user_id": str(user_id)}
        
        if status:
            base_query += " AND ii.status = :status"
            params["status"] = status
        
        base_query += " ORDER BY ii.created_at DESC"
        
        print(f"[get_my_interests] Executing query with params: {params}")
        results = db.execute(text(base_query), params).fetchall()
        print(f"[get_my_interests] Query returned {len(results)} results")
        
        # Return as dict with all fields for frontend
        interests = []
        for row in results:
            try:
                interest_dict = {
                    "interest_id": str(row.interest_id),
                    "investor_id": str(row.investor_id),
                    "land_id": str(row.land_id),
                    "status": row.status,
                    "comments": row.comments,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                    "project_title": row.project_title,
                    "project_location": row.project_location,
                    "project_type": row.project_type,
                    "capacity_mw": float(row.capacity_mw) if row.capacity_mw else None,
                    "price_per_mwh": float(row.price_per_mwh) if row.price_per_mwh else None,
                    "landowner_name": row.landowner_name if row.landowner_name and row.landowner_name.strip() else "Unknown",
                    "investor_name": row.investor_name,
                    "investor_email": row.investor_email,
                    "land_status": row.land_status
                }
                interests.append(interest_dict)
            except Exception as e:
                print(f"[get_my_interests] Error processing row: {str(e)}")
                continue
        
        print(f"[get_my_interests] Returning {len(interests)} interests")
        return interests
        
    except Exception as e:
        import traceback
        print(f"Error in get_my_interests: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch interests: {str(e)}"
        )

@router.get("/land/{land_id}/interests", response_model=List[InterestResponse])
async def get_land_interests(
    land_id: UUID,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interests for a specific land (land owner or admin only)."""
    try:
        # Check if land exists and user has permission
        land_check = text("SELECT landowner_id FROM lands WHERE land_id = :land_id")
        land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
        
        if not land_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Land not found"
            )
        
        user_roles = current_user.get("roles", [])
        user_id = str(current_user["user_id"])
        
        # Only land owner or admin can view interests for a land
        landowner_id = str(land_result.landowner_id) if land_result.landowner_id else None
        if landowner_id != user_id and "administrator" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to view interests for this land"
            )
        
        base_query = """
            SELECT 
                ii.interest_id, 
                ii.investor_id, 
                ii.land_id, 
                ii.status,
                ii.comments, 
                ii.investment_amount,
                ii.interest_level,
                ii.contact_preference,
                ii.created_at, 
                COALESCE(ii.updated_at, ii.created_at) as updated_at,
                l.title as land_title, 
                l.location_text as land_location, 
                l.landowner_id,
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.is_active,
                TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as investor_name
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            JOIN "user" u ON ii.investor_id = u.user_id
            WHERE ii.land_id = CAST(:land_id AS uuid)
        """
        
        params = {"land_id": str(land_id)}
        
        if status_filter:
            base_query += " AND ii.status = :status_filter"
            params["status_filter"] = status_filter
        
        base_query += " ORDER BY ii.created_at DESC"
        
        results = db.execute(text(base_query), params).fetchall()
        
        from models.schemas import User, InterestResponse
        
        interests = []
        for row in results:
            # Create User object for investor with all required fields
            investor_user = User(
                user_id=row.user_id,
                first_name=row.first_name or "",
                last_name=row.last_name or "",
                email=row.email or "",
                phone=row.phone,
                # company field not available in User model, skipping
                is_active=row.is_active if hasattr(row, 'is_active') else True,
                # Required fields for User schema
                created_at=datetime.now(),  # Default value since we don't need exact creation date
                updated_at=datetime.now()
            )
            
            # Create InterestResponse with all required fields
            interest_response = InterestResponse(
                interest_id=row.interest_id,
                investor_id=row.investor_id,
                land_id=row.land_id,
                status=row.status or "pending",
                interest_level=row.interest_level if hasattr(row, 'interest_level') else "medium",
                investment_amount=Decimal(str(row.investment_amount)) if row.investment_amount else None,
                comments=row.comments,
                contact_preference=row.contact_preference if hasattr(row, 'contact_preference') else None,
                created_at=row.created_at if row.created_at else datetime.now(),
                investor=investor_user,
                land=None  # We don't need full land object for this endpoint
            )
            
            # Convert to dict and add additional fields for frontend compatibility
            interest_dict = interest_response.model_dump()
            interest_dict.update({
                "investor_name": row.investor_name or "Unknown Investor",
                "investor_email": row.email or "",
                "phone": row.phone,
                "first_name": row.first_name or "",
                "last_name": row.last_name or "",
                "email": row.email or "",
                "land_title": row.land_title,
                "land_location": row.land_location
            })
            
            interests.append(interest_dict)
        
        return interests
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_land_interests: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch land interests: {str(e)}"
        )

# Land visibility management endpoints
@router.put("/land/{land_id}/visibility", response_model=MessageResponse)
async def update_land_visibility(
    land_id: UUID,
    visibility_update: LandVisibilityUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update land visibility settings (land owner or admin only)."""
    # Check if land exists and user has permission
    land_check = text("SELECT owner_id FROM lands WHERE land_id = :land_id")
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    user_roles = current_user.get("roles", [])
    
    # Only land owner or admin can update visibility
    if (str(land_result.owner_id) != current_user["user_id"] and 
        "administrator" not in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update visibility for this land"
        )
    
    try:
        # Update land visibility
        update_query = text("""
            UPDATE lands 
            SET visibility = :visibility, updated_at = CURRENT_TIMESTAMP
            WHERE land_id = :land_id
        """)
        
        db.execute(update_query, {
            "land_id": str(land_id),
            "visibility": visibility_update.visibility
        })
        
        db.commit()
        
        return MessageResponse(message="Land visibility updated successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update land visibility: {str(e)}"
        )

@router.get("/lands/visible", response_model=List[dict])
async def get_visible_lands(
    visibility: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get lands visible to investors."""
    user_roles = current_user.get("roles", [])
    
    # Check if user is an investor
    if "investor" not in user_roles and "administrator" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only investors can view visible lands"
        )
    
    # Build base query for lands visible to investors
    base_query = """
        SELECT l.land_id, l.title, l.location, l.area, l.price_per_acre,
               l.total_price, l.description, l.status_key, l.visibility,
               l.created_at, l.updated_at,
               u.first_name || ' ' || u.last_name as owner_name,
               COUNT(ii.interest_id) as interest_count
        FROM lands l
        JOIN users u ON l.owner_id = u.user_id
        LEFT JOIN investor_interests ii ON l.land_id = ii.land_id
        WHERE l.visibility IN ('public', 'investors_only')
        AND l.status_key IN ('published', 'ready_to_buy')
    """
    
    params = {"skip": skip, "limit": limit}
    
    # Add filters
    if visibility:
        base_query += " AND l.visibility = :visibility"
        params["visibility"] = visibility
    
    if status:
        base_query += " AND l.status_key = :status"
        params["status"] = status
    
    base_query += """
        GROUP BY l.land_id, l.title, l.location, l.area, l.price_per_acre,
                 l.total_price, l.description, l.status_key, l.visibility,
                 l.created_at, l.updated_at, u.first_name, u.last_name
        ORDER BY l.created_at DESC 
        OFFSET :skip LIMIT :limit
    """
    
    results = db.execute(text(base_query), params).fetchall()
    
    return [
        {
            "land_id": row.land_id,
            "title": row.title,
            "location": row.location,
            "area": row.area,
            "price_per_acre": row.price_per_acre,
            "total_price": row.total_price,
            "description": row.description,
            "status": row.status_key,
            "visibility": row.visibility,
            "owner_name": row.owner_name,
            "interest_count": row.interest_count,
            "created_at": row.created_at,
            "updated_at": row.updated_at
        }
        for row in results
    ]

# Statistics and reporting endpoints
@router.get("/stats/interests")
async def get_interest_stats(
    land_id: Optional[UUID] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interest statistics."""
    user_roles = current_user.get("roles", [])
    
    base_query = """
        SELECT 
            COUNT(*) as total_interests,
            COUNT(CASE WHEN ii.status = 'pending' THEN 1 END) as pending_interests,
            COUNT(CASE WHEN ii.status = 'approved' THEN 1 END) as approved_interests,
            COUNT(CASE WHEN ii.status = 'rejected' THEN 1 END) as rejected_interests,
            COUNT(DISTINCT ii.investor_id) as unique_investors,
            COUNT(DISTINCT ii.land_id) as lands_with_interest
        FROM investor_interests ii
        JOIN lands l ON ii.land_id = l.land_id
        WHERE 1=1
    """
    
    params = {}
    
    if land_id:
        base_query += " AND ii.land_id = :land_id"
        params["land_id"] = str(land_id)
    
    # Add permission filter for non-admin users
    if "administrator" not in user_roles:
        if "investor" in user_roles:
            base_query += " AND ii.investor_id = :user_id"
        else:
            base_query += " AND l.owner_id = :user_id"
        params["user_id"] = current_user["user_id"]
    
    result = db.execute(text(base_query), params).fetchone()
    
    return {
        "total_interests": result.total_interests,
        "pending_interests": result.pending_interests,
        "approved_interests": result.approved_interests,
        "rejected_interests": result.rejected_interests,
        "unique_investors": result.unique_investors,
        "lands_with_interest": result.lands_with_interest
    }

@router.get("/stats/visibility")
async def get_visibility_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get land visibility statistics."""
    user_roles = current_user.get("roles", [])
    
    base_query = """
        SELECT 
            COUNT(*) as total_lands,
            COUNT(CASE WHEN visibility = 'public' THEN 1 END) as public_lands,
            COUNT(CASE WHEN visibility = 'investors_only' THEN 1 END) as investor_only_lands,
            COUNT(CASE WHEN visibility = 'private' THEN 1 END) as private_lands,
            COUNT(CASE WHEN status_key IN ('published', 'ready_to_buy') THEN 1 END) as available_lands
        FROM lands
        WHERE 1=1
    """
    
    params = {}
    
    # Add permission filter for non-admin users
    if "administrator" not in user_roles:
        base_query += " AND owner_id = :user_id"
        params["user_id"] = current_user["user_id"]
    
    result = db.execute(text(base_query), params).fetchone()
    
    return {
        "total_lands": result.total_lands,
        "public_lands": result.public_lands,
        "investor_only_lands": result.investor_only_lands,
        "private_lands": result.private_lands,
        "available_lands": result.available_lands
    }

# Admin endpoints
@router.get("/admin/interests", response_model=List[InterestResponse])
async def get_all_interests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all interests (admin only)."""
    base_query = """
        SELECT ii.interest_id, ii.investor_id, ii.land_id, ii.status,
               ii.comments, ii.created_at, ii.updated_at,
               l.title as land_title, l.location_text as land_location, l.landowner_id as owner_id,
               u.first_name || ' ' || u.last_name as investor_name,
               u.email as investor_email
        FROM investor_interests ii
        JOIN lands l ON ii.land_id = l.land_id
        JOIN users u ON ii.investor_id = u.user_id
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    if status:
        base_query += " AND ii.status = :status"
        params["status"] = status
    
    base_query += " ORDER BY ii.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    return [
        InterestResponse(
            interest_id=row.interest_id,
            investor_id=row.investor_id,
            land_id=row.land_id,
            status=row.status,
            comments=row.comments,
            created_at=row.created_at,
            updated_at=row.updated_at,
            land_title=row.land_title,
            land_location=row.land_location,
            investor_name=row.investor_name,
            investor_email=row.investor_email
        )
        for row in results
    ]

@router.get("/status/list", response_model=List[str])
async def get_interest_statuses(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all interest statuses."""
    # Return standard interest statuses
    return ["pending", "approved", "rejected", "under_review", "contacted"]

@router.get("/visibility/list", response_model=List[str])
async def get_visibility_options(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all visibility options."""
    # Return standard visibility options
    return ["public", "investors_only", "private"]

# Dashboard endpoints
@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get investor dashboard metrics."""
    user_roles = current_user.get("roles", [])
    
    if "investor" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only investors can view dashboard metrics"
        )
    
    user_id = current_user.get("user_id")
    
    try:
        # Get total interests count
        interests_query = text("""
            SELECT COUNT(*) as total_interests
            FROM investor_interests
            WHERE investor_id::text = :user_id
        """)
        interests_result = db.execute(interests_query, {"user_id": str(user_id)}).fetchone()
        total_interests = interests_result.total_interests if interests_result else 0
        
        # Get recent interests (last 7 days)
        recent_interests_query = text("""
            SELECT COUNT(*) as recent_interests
            FROM investor_interests
            WHERE investor_id::text = :user_id
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        """)
        recent_result = db.execute(recent_interests_query, {"user_id": str(user_id)}).fetchone()
        recent_interests = recent_result.recent_interests if recent_result else 0
        
        # Get total dollars invested (estimate based on capacity * price_per_mwh for approved interests)
        # This is an approximation - actual investment amounts would be stored separately
        investment_query = text("""
            SELECT 
                COALESCE(SUM(
                    CASE 
                        WHEN l.price_per_mwh IS NOT NULL AND l.capacity_mw IS NOT NULL 
                        THEN l.price_per_mwh * l.capacity_mw
                        ELSE 0
                    END
                ), 0) as total_invested
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            WHERE ii.investor_id::text = :user_id
            AND ii.status IN ('approved', 'contacted', 'pending')
        """)
        investment_result = db.execute(investment_query, {"user_id": str(user_id)}).fetchone()
        total_invested = float(investment_result.total_invested) if investment_result else 0.0
        
        # Get interests by status
        status_query = text("""
            SELECT 
                COUNT(CASE WHEN ii.status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN ii.status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN ii.status = 'contacted' THEN 1 END) as contacted,
                COUNT(CASE WHEN ii.status = 'rejected' THEN 1 END) as rejected
            FROM investor_interests ii
            WHERE ii.investor_id::text = :user_id
        """)
        status_result = db.execute(status_query, {"user_id": str(user_id)}).fetchone()
        
        # Get monthly interest trends (last 6 months)
        trends_query = text("""
            SELECT 
                TO_CHAR(ii.created_at, 'YYYY-MM') as month,
                COUNT(*) as count
            FROM investor_interests ii
            WHERE ii.investor_id::text = :user_id
            AND ii.created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(ii.created_at, 'YYYY-MM')
            ORDER BY month ASC
        """)
        trends_results = db.execute(trends_query, {"user_id": str(user_id)}).fetchall()
        monthly_trends = [
            {"month": row.month, "count": row.count}
            for row in trends_results
        ]
        
        # Get interests by project type
        project_type_query = text("""
            SELECT 
                COALESCE(l.energy_key, 'Unknown') as project_type,
                COUNT(*) as count
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            WHERE ii.investor_id::text = :user_id
            GROUP BY l.energy_key
            ORDER BY count DESC
        """)
        project_type_results = db.execute(project_type_query, {"user_id": str(user_id)}).fetchall()
        interest_by_type = [
            {"type": row.project_type, "count": row.count}
            for row in project_type_results
        ]
        
        return {
            "total_interests": total_interests,
            "recent_interests": recent_interests,
            "total_invested": total_invested,
            "pending_interests": status_result.pending if status_result else 0,
            "approved_interests": status_result.approved if status_result else 0,
            "contacted_interests": status_result.contacted if status_result else 0,
            "rejected_interests": status_result.rejected if status_result else 0,
            "monthly_trends": monthly_trends,
            "interest_by_type": interest_by_type
        }
        
    except Exception as e:
        import traceback
        print(f"Error in get_dashboard_metrics: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard metrics: {str(e)}"
        )

@router.get("/dashboard/interests")
async def get_dashboard_interests(
    limit: int = 5,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent investor interests for dashboard."""
    user_roles = current_user.get("roles", [])
    
    if "investor" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only investors can view their interests"
        )
    
    user_id = current_user.get("user_id")
    
    try:
        query = text("""
            SELECT 
                ii.interest_id,
                ii.land_id,
                ii.status,
                ii.created_at,
                l.title as project_title,
                l.location_text as project_location,
                l.energy_key as project_type,
                l.capacity_mw,
                l.price_per_mwh
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            WHERE ii.investor_id::text = :user_id
            ORDER BY ii.created_at DESC
            LIMIT :limit
        """)
        
        results = db.execute(query, {"user_id": str(user_id), "limit": limit}).fetchall()
        
        interests = []
        for row in results:
            interests.append({
                "interest_id": str(row.interest_id),
                "land_id": str(row.land_id),
                "status": row.status,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "project_title": row.project_title,
                "project_location": row.project_location,
                "project_type": row.project_type,
                "capacity_mw": float(row.capacity_mw) if row.capacity_mw else None,
                "price_per_mwh": float(row.price_per_mwh) if row.price_per_mwh else None
            })
        
        return interests
        
    except Exception as e:
        import traceback
        print(f"Error in get_dashboard_interests: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard interests: {str(e)}"
        )