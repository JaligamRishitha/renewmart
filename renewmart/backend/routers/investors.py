from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
import uuid

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    InterestCreate, InterestUpdate, InterestResponse,
    LandVisibilityUpdate, MessageResponse, MasterSalesAdvisorAssign
)

router = APIRouter(prefix="/investors", tags=["investors"])

# Withdrawal request model
class WithdrawalRequest(BaseModel):
    reason: str = Field(..., min_length=10, description="Reason for withdrawal (minimum 10 characters)")

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
        # Check if project is locked by another investor
        if land_result.status == "interest_locked":
            # Check if current investor has an active interest
            check_own_interest = text("""
                SELECT interest_id FROM investor_interests 
                WHERE investor_id = :investor_id AND land_id = :land_id
                AND (
                    withdrawal_requested = FALSE 
                    OR withdrawal_status IS NULL 
                    OR withdrawal_status != 'approved'
                )
                AND status != 'rejected'
            """)
            own_interest = db.execute(check_own_interest, {
                "investor_id": current_user["user_id"],
                "land_id": str(interest_data.land_id)
            }).fetchone()
            
            if not own_interest:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This project is currently locked as another investor has expressed interest. Please try again later."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only express interest in published or ready-to-buy lands"
            )
    
    # Check if investor already expressed interest
    existing_check = text("""
        SELECT interest_id, status, approved_at 
        FROM investor_interests 
        WHERE investor_id = :investor_id AND land_id = :land_id
    """)
    
    existing_result = db.execute(existing_check, {
        "investor_id": current_user["user_id"],
        "land_id": str(interest_data.land_id)
    }).fetchone()
    
    if existing_result:
        # Check if this investor was rejected within the last week
        if existing_result.status == 'rejected' and existing_result.approved_at:
            from datetime import datetime, timedelta, timezone
            
            rejection_date = existing_result.approved_at
            # Handle both datetime objects and strings
            if isinstance(rejection_date, str):
                try:
                    rejection_date = datetime.fromisoformat(rejection_date.replace('Z', '+00:00'))
                except:
                    rejection_date = datetime.fromisoformat(rejection_date)
            
            # Ensure timezone-aware datetime
            if rejection_date.tzinfo is None:
                rejection_date = rejection_date.replace(tzinfo=timezone.utc)
            
            # Check if rejection was less than 1 week ago
            now = datetime.now(timezone.utc)
            one_week_ago = now - timedelta(days=7)
            
            if rejection_date > one_week_ago:
                days_remaining = ((rejection_date + timedelta(days=7)) - now).days + 1
                if days_remaining < 0:
                    days_remaining = 0
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You cannot express interest in this project yet. Your previous interest was rejected. You can express interest again in {days_remaining} day(s)."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already expressed interest in this land"
            )
    
    # Validate that both NDA and CTA are accepted
    if not getattr(interest_data, 'nda_accepted', False) or not getattr(interest_data, 'cta_accepted', False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both NDA (Non-Disclosure Agreement) and CTA (Consent to Assign) must be accepted to express interest"
        )
    
    try:
        # Get master sales advisor for this land (if assigned)
        master_advisor_query = text("""
            SELECT sales_advisor_id 
            FROM master_sales_advisor_assignments 
            WHERE land_id = :land_id AND is_active = TRUE 
            LIMIT 1
        """)
        master_advisor_result = db.execute(master_advisor_query, {"land_id": str(interest_data.land_id)}).fetchone()
        master_advisor_id = master_advisor_result.sales_advisor_id if master_advisor_result else None
        
        # Create interest record
        interest_id = str(uuid.uuid4())
        
        create_query = text("""
            INSERT INTO investor_interests (
                interest_id, investor_id, land_id, status, comments, 
                nda_accepted, cta_accepted, master_sales_advisor_id, created_at
            ) VALUES (
                :interest_id, :investor_id, :land_id, 'pending', :comments,
                :nda_accepted, :cta_accepted, :master_advisor_id, CURRENT_TIMESTAMP
            )
        """)
        
        db.execute(create_query, {
            "interest_id": interest_id,
            "investor_id": current_user["user_id"],
            "land_id": str(interest_data.land_id),
            "comments": getattr(interest_data, 'comments', None),
            "nda_accepted": getattr(interest_data, 'nda_accepted', False),
            "cta_accepted": getattr(interest_data, 'cta_accepted', False),
            "master_advisor_id": str(master_advisor_id) if master_advisor_id else None
        })
        
        # Lock the project - update land status to interest_locked
        lock_land_query = text("""
            UPDATE lands 
            SET 
                status = 'interest_locked',
                interest_locked_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE land_id = :land_id
            AND status IN ('published', 'ready_to_buy')
        """)
        
        db.execute(lock_land_query, {
            "land_id": str(interest_data.land_id)
        })
        
        db.commit()
        
        # Fetch the created interest
        return await get_interest(UUID(interest_id), current_user, db)
        
    except HTTPException:
        raise
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
               ii.nda_accepted, ii.cta_accepted, 
               ii.master_sales_advisor_id, ii.approved_by, ii.approved_at,
               l.title as land_title, l.location_text as land_location, l.landowner_id as owner_id,
               u.first_name || ' ' || u.last_name as investor_name,
               u.email as investor_email
        FROM investor_interests ii
        JOIN lands l ON ii.land_id = l.land_id
        JOIN "user" u ON ii.investor_id = u.user_id
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
        comments=getattr(result, 'comments', None),
        nda_accepted=getattr(result, 'nda_accepted', False),
        cta_accepted=getattr(result, 'cta_accepted', False),
        master_sales_advisor_id=getattr(result, 'master_sales_advisor_id', None),
        approved_by=getattr(result, 'approved_by', None),
        approved_at=getattr(result, 'approved_at', None),
        created_at=result.created_at,
        updated_at=getattr(result, 'updated_at', None),
        land_title=getattr(result, 'land_title', None),
        land_location=getattr(result, 'land_location', None),
        investor_name=getattr(result, 'investor_name', None),
        investor_email=getattr(result, 'investor_email', None)
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

@router.post("/interest/{interest_id}/withdraw", response_model=MessageResponse)
async def request_withdraw_interest(
    interest_id: UUID,
    withdrawal_reason: WithdrawalRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request to withdraw interest (investor only). Requires reason and approval from master sale advisor."""
    reason = withdrawal_reason.reason.strip()
    
    if not reason or len(reason) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal reason is required and must be at least 10 characters"
        )
    
    # Check if withdrawal columns exist in the database
    check_columns_query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'investor_interests' 
        AND column_name IN ('withdrawal_requested', 'withdrawal_status')
    """)
    column_check = db.execute(check_columns_query).fetchall()
    has_withdrawal_fields = len(column_check) >= 2
    
    # Check if interest exists and user has permission
    if has_withdrawal_fields:
        interest_check = text("""
            SELECT 
                ii.investor_id, 
                ii.master_sales_advisor_id,
                ii.withdrawal_requested,
                ii.withdrawal_status
            FROM investor_interests ii
            WHERE ii.interest_id = :interest_id
        """)
    else:
        interest_check = text("""
            SELECT 
                ii.investor_id, 
                ii.master_sales_advisor_id
            FROM investor_interests ii
            WHERE ii.interest_id = :interest_id
        """)
    
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    user_roles = current_user.get("roles", [])
    
    # Only the investor who expressed interest or admin can request withdrawal
    if (str(interest_result.investor_id) != str(current_user["user_id"]) and 
        "administrator" not in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to withdraw this interest"
        )
    
    # Check if withdrawal already requested (only if columns exist)
    if has_withdrawal_fields:
        withdrawal_requested = getattr(interest_result, 'withdrawal_requested', False)
        withdrawal_status = getattr(interest_result, 'withdrawal_status', None)
        
        if withdrawal_requested:
            if withdrawal_status == 'pending':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Withdrawal request is already pending approval"
                )
            elif withdrawal_status == 'approved':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Withdrawal has already been approved"
                )
    
    try:
        if has_withdrawal_fields:
            # Update interest with withdrawal request
            update_query = text("""
                UPDATE investor_interests 
                SET 
                    withdrawal_requested = TRUE,
                    withdrawal_reason = :reason,
                    withdrawal_status = 'pending',
                    withdrawal_requested_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE interest_id = :interest_id
            """)
        else:
            # If migration hasn't run, return error asking to run migration first
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Withdrawal functionality requires database migration. Please contact administrator."
            )
        
        db.execute(update_query, {
            "interest_id": str(interest_id),
            "reason": reason
        })
        
        db.commit()
        
        return MessageResponse(message="Withdrawal request submitted. Awaiting approval from master sales advisor.")
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"[request_withdraw_interest] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit withdrawal request: {str(e)}"
        )

@router.post("/interest/{interest_id}/withdraw/approve", response_model=MessageResponse)
async def approve_withdrawal(
    interest_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve withdrawal request (Master Sales Advisor only)."""
    user_roles = current_user.get("roles", [])
    user_id = current_user.get("user_id")
    
    # Check if interest exists and has withdrawal request
    interest_check = text("""
        SELECT 
            ii.master_sales_advisor_id,
            ii.withdrawal_requested,
            ii.withdrawal_status,
            ii.investor_id
        FROM investor_interests ii
        WHERE ii.interest_id = :interest_id
    """)
    
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    if not interest_result.withdrawal_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No withdrawal request found for this interest"
        )
    
    if interest_result.withdrawal_status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Withdrawal request is not pending (current status: {interest_result.withdrawal_status})"
        )
    
    # Allow admin or assigned master sales advisor to approve
    if ("administrator" not in user_roles and 
        (str(interest_result.master_sales_advisor_id) != str(user_id) or 
         "re_sales_advisor" not in user_roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned master sales advisor or admin can approve withdrawals"
        )
    
    try:
        # Update withdrawal status to approved
        update_query = text("""
            UPDATE investor_interests 
            SET 
                withdrawal_status = 'approved',
                withdrawal_approved_by = :approved_by,
                withdrawal_approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE interest_id = :interest_id
        """)
        
        db.execute(update_query, {
            "interest_id": str(interest_id),
            "approved_by": str(user_id)
        })
        
        # Check if there are any other active interests (not withdrawn) for this land
        check_other_interests_query = text("""
            SELECT COUNT(*) as active_count
            FROM investor_interests
            WHERE land_id = (
                SELECT land_id FROM investor_interests WHERE interest_id = :interest_id
            )
            AND (
                withdrawal_requested = FALSE 
                OR withdrawal_status IS NULL 
                OR withdrawal_status != 'approved'
            )
        """)
        
        other_interests_result = db.execute(check_other_interests_query, {
            "interest_id": str(interest_id)
        }).fetchone()
        
        # If no other active interests, unlock the project
        if other_interests_result and other_interests_result.active_count == 0:
            unlock_land_query = text("""
                UPDATE lands 
                SET 
                    status = 'published',
                    interest_locked_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE land_id = (
                    SELECT land_id FROM investor_interests WHERE interest_id = :interest_id
                )
                AND status = 'interest_locked'
            """)
            
            db.execute(unlock_land_query, {
                "interest_id": str(interest_id)
            })
        
        db.commit()
        
        return MessageResponse(message="Withdrawal approved successfully. Interest will be removed from investor's list.")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve withdrawal: {str(e)}"
        )

@router.post("/interest/{interest_id}/withdraw/reject", response_model=MessageResponse)
async def reject_withdrawal(
    interest_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject withdrawal request (Master Sales Advisor only)."""
    user_roles = current_user.get("roles", [])
    user_id = current_user.get("user_id")
    
    # Check if interest exists and has withdrawal request
    interest_check = text("""
        SELECT 
            ii.master_sales_advisor_id,
            ii.withdrawal_requested,
            ii.withdrawal_status
        FROM investor_interests ii
        WHERE ii.interest_id = :interest_id
    """)
    
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    if not interest_result.withdrawal_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No withdrawal request found for this interest"
        )
    
    if interest_result.withdrawal_status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Withdrawal request is not pending (current status: {interest_result.withdrawal_status})"
        )
    
    # Allow admin or assigned master sales advisor to reject
    if ("administrator" not in user_roles and 
        (str(interest_result.master_sales_advisor_id) != str(user_id) or 
         "re_sales_advisor" not in user_roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned master sales advisor or admin can reject withdrawals"
        )
    
    try:
        # Update withdrawal status to rejected and clear withdrawal request
        update_query = text("""
            UPDATE investor_interests 
            SET 
                withdrawal_status = 'rejected',
                withdrawal_approved_by = :rejected_by,
                withdrawal_approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE interest_id = :interest_id
        """)
        
        db.execute(update_query, {
            "interest_id": str(interest_id),
            "rejected_by": str(user_id)
        })
        
        db.commit()
        
        return MessageResponse(message="Withdrawal request rejected.")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject withdrawal: {str(e)}"
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
        
        # Check if withdrawal columns exist in the database
        check_columns_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'investor_interests' 
            AND column_name IN ('withdrawal_requested', 'withdrawal_status')
        """)
        column_check = db.execute(check_columns_query).fetchall()
        has_withdrawal_fields = len(column_check) >= 2
        
        # Build main query - use CAST for UUID comparison to handle string vs UUID
        # Exclude interests with approved withdrawals (if withdrawal fields exist)
        if has_withdrawal_fields:
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
                    owner.email as landowner_email,
                    COALESCE(ii.withdrawal_requested, FALSE) as withdrawal_requested,
                    ii.withdrawal_reason,
                    ii.withdrawal_status,
                    ii.withdrawal_requested_at,
                    ii.withdrawal_approved_at
                FROM investor_interests ii
                JOIN lands l ON ii.land_id = l.land_id
                JOIN "user" investor ON ii.investor_id = investor.user_id
                JOIN "user" owner ON l.landowner_id = owner.user_id
                WHERE ii.investor_id::text = :user_id
                AND (COALESCE(ii.withdrawal_requested, FALSE) = FALSE OR COALESCE(ii.withdrawal_status, '') != 'approved')
            """
        else:
            # Fallback query without withdrawal fields
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
                
                # Add withdrawal fields if they exist
                if has_withdrawal_fields:
                    interest_dict.update({
                        "withdrawal_requested": getattr(row, 'withdrawal_requested', False),
                        "withdrawal_reason": getattr(row, 'withdrawal_reason', None),
                        "withdrawal_status": getattr(row, 'withdrawal_status', None),
                        "withdrawal_requested_at": getattr(row, 'withdrawal_requested_at', None).isoformat() if getattr(row, 'withdrawal_requested_at', None) else None,
                        "withdrawal_approved_at": getattr(row, 'withdrawal_approved_at', None).isoformat() if getattr(row, 'withdrawal_approved_at', None) else None
                    })
                else:
                    # Default values if migration hasn't run
                    interest_dict.update({
                        "withdrawal_requested": False,
                        "withdrawal_reason": None,
                        "withdrawal_status": None,
                        "withdrawal_requested_at": None,
                        "withdrawal_approved_at": None
                    })
                
                interests.append(interest_dict)
            except Exception as e:
                print(f"[get_my_interests] Error processing row: {str(e)}")
                import traceback
                print(traceback.format_exc())
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
        
        # Check if withdrawal columns exist
        check_columns_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'investor_interests' 
            AND column_name IN ('withdrawal_requested', 'withdrawal_status')
        """)
        column_check = db.execute(check_columns_query).fetchall()
        has_withdrawal_fields = len(column_check) >= 2
        
        if has_withdrawal_fields:
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
                    l.energy_key,
                    l.capacity_mw,
                    l.price_per_mwh,
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    u.is_active,
                    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as investor_name,
                    COALESCE(ii.withdrawal_requested, FALSE) as withdrawal_requested,
                    ii.withdrawal_reason,
                    ii.withdrawal_status,
                    ii.withdrawal_requested_at,
                    ii.withdrawal_approved_at
                FROM investor_interests ii
                JOIN lands l ON ii.land_id = l.land_id
                JOIN "user" u ON ii.investor_id = u.user_id
                WHERE ii.land_id = CAST(:land_id AS uuid)
            """
        else:
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
                    l.energy_key,
                    l.capacity_mw,
                    l.price_per_mwh,
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
            
            # Add withdrawal fields if they exist
            if has_withdrawal_fields:
                interest_dict.update({
                    "withdrawal_requested": getattr(row, 'withdrawal_requested', False),
                    "withdrawal_reason": getattr(row, 'withdrawal_reason', None),
                    "withdrawal_status": getattr(row, 'withdrawal_status', None),
                    "withdrawal_requested_at": getattr(row, 'withdrawal_requested_at', None).isoformat() if getattr(row, 'withdrawal_requested_at', None) else None,
                    "withdrawal_approved_at": getattr(row, 'withdrawal_approved_at', None).isoformat() if getattr(row, 'withdrawal_approved_at', None) else None
                })
            else:
                interest_dict.update({
                    "withdrawal_requested": False,
                    "withdrawal_reason": None,
                    "withdrawal_status": None,
                    "withdrawal_requested_at": None,
                    "withdrawal_approved_at": None
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
@router.get("/admin/interests")
async def get_all_interests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all interests (admin only). Returns data in camelCase format for frontend."""
    # Check if withdrawal columns exist
    check_columns_query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'investor_interests' 
        AND column_name IN ('withdrawal_requested', 'withdrawal_status')
    """)
    column_check = db.execute(check_columns_query).fetchall()
    has_withdrawal_fields = len(column_check) >= 2
    
    if has_withdrawal_fields:
        base_query = """
            SELECT 
                ii.interest_id, 
                ii.investor_id, 
                ii.land_id, 
                ii.status,
                ii.comments, 
                ii.created_at, 
                ii.updated_at,
                l.title as land_title, 
                l.location_text as land_location, 
                l.landowner_id as owner_id,
                l.energy_key,
                l.capacity_mw,
                l.price_per_mwh,
                u.first_name || ' ' || u.last_name as investor_name,
                u.email as investor_email,
                u.phone as investor_phone,
                COALESCE(ii.withdrawal_requested, FALSE) as withdrawal_requested,
                ii.withdrawal_reason,
                ii.withdrawal_status,
                ii.withdrawal_requested_at,
                ii.withdrawal_approved_at
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            JOIN "user" u ON ii.investor_id = u.user_id
            WHERE 1=1
        """
    else:
        base_query = """
            SELECT 
                ii.interest_id, 
                ii.investor_id, 
                ii.land_id, 
                ii.status,
                ii.comments, 
                ii.created_at, 
                ii.updated_at,
                l.title as land_title, 
                l.location_text as land_location, 
                l.landowner_id as owner_id,
                l.energy_key,
                l.capacity_mw,
                l.price_per_mwh,
                u.first_name || ' ' || u.last_name as investor_name,
                u.email as investor_email,
                u.phone as investor_phone
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            JOIN "user" u ON ii.investor_id = u.user_id
            WHERE 1=1
        """
    
    params = {"skip": skip, "limit": limit}
    
    if status:
        base_query += " AND ii.status = :status"
        params["status"] = status
    
    base_query += " ORDER BY ii.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    # Transform to camelCase format expected by frontend
    interests = []
    for row in results:
        interest_dict = {
            "interestId": str(row.interest_id),
            "investorId": str(row.investor_id),
            "landId": str(row.land_id),
            "status": row.status or "pending",
            "comments": row.comments,
            "createdAt": row.created_at.isoformat() if row.created_at else None,
            "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
            "projectTitle": row.land_title or "Untitled Project",
            "projectLocation": row.land_location or "Location not specified",
            "projectType": row.energy_key or "N/A",
            "projectCapacity": f"{row.capacity_mw} MW" if row.capacity_mw else None,
            "projectPrice": float(row.price_per_mwh) if row.price_per_mwh else None,
            "investorName": row.investor_name or "Unknown Investor",
            "investorEmail": row.investor_email or "",
            "investorPhone": row.investor_phone or None
        }
        
        # Add withdrawal fields if they exist
        if has_withdrawal_fields:
            interest_dict.update({
                "withdrawal_requested": getattr(row, 'withdrawal_requested', False),
                "withdrawal_reason": getattr(row, 'withdrawal_reason', None),
                "withdrawal_status": getattr(row, 'withdrawal_status', None),
                "withdrawal_requested_at": getattr(row, 'withdrawal_requested_at', None).isoformat() if getattr(row, 'withdrawal_requested_at', None) else None,
                "withdrawal_approved_at": getattr(row, 'withdrawal_approved_at', None).isoformat() if getattr(row, 'withdrawal_approved_at', None) else None
            })
        else:
            interest_dict.update({
                "withdrawal_requested": False,
                "withdrawal_reason": None,
                "withdrawal_status": None,
                "withdrawal_requested_at": None,
                "withdrawal_approved_at": None
            })
        
        interests.append(interest_dict)
    
    return interests

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
        # Filter to exclude withdrawn interests (withdrawal_status = 'approved')
        # This filter will be used in all queries
        withdrawal_filter = """
            AND (ii.withdrawal_requested = FALSE 
                 OR ii.withdrawal_status IS NULL 
                 OR ii.withdrawal_status != 'approved')
        """
        
        # Get total interests count (excluding withdrawn)
        interests_query = text(f"""
            SELECT COUNT(*) as total_interests
            FROM investor_interests ii
            WHERE ii.investor_id::text = :user_id
            {withdrawal_filter}
        """)
        interests_result = db.execute(interests_query, {"user_id": str(user_id)}).fetchone()
        total_interests = interests_result.total_interests if interests_result else 0
        
        # Get recent interests (last 7 days, excluding withdrawn)
        recent_interests_query = text(f"""
            SELECT COUNT(*) as recent_interests
            FROM investor_interests ii
            WHERE ii.investor_id::text = :user_id
            AND ii.created_at >= CURRENT_DATE - INTERVAL '7 days'
            {withdrawal_filter}
        """)
        recent_result = db.execute(recent_interests_query, {"user_id": str(user_id)}).fetchone()
        recent_interests = recent_result.recent_interests if recent_result else 0
        
        # Get total dollars invested (estimate based on capacity * price_per_mwh for approved interests)
        # This is an approximation - actual investment amounts would be stored separately
        # Exclude withdrawn interests
        investment_query = text(f"""
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
            {withdrawal_filter}
        """)
        investment_result = db.execute(investment_query, {"user_id": str(user_id)}).fetchone()
        total_invested = float(investment_result.total_invested) if investment_result else 0.0
        
        # Get interests by status (excluding withdrawn)
        status_query = text(f"""
            SELECT 
                COUNT(CASE WHEN ii.status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN ii.status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN ii.status = 'contacted' THEN 1 END) as contacted,
                COUNT(CASE WHEN ii.status = 'rejected' THEN 1 END) as rejected
            FROM investor_interests ii
            WHERE ii.investor_id::text = :user_id
            {withdrawal_filter}
        """)
        status_result = db.execute(status_query, {"user_id": str(user_id)}).fetchone()
        
        # Get monthly interest trends (last 6 months, excluding withdrawn)
        trends_query = text(f"""
            SELECT 
                TO_CHAR(ii.created_at, 'YYYY-MM') as month,
                COUNT(*) as count
            FROM investor_interests ii
            WHERE ii.investor_id::text = :user_id
            AND ii.created_at >= CURRENT_DATE - INTERVAL '6 months'
            {withdrawal_filter}
            GROUP BY TO_CHAR(ii.created_at, 'YYYY-MM')
            ORDER BY month ASC
        """)
        trends_results = db.execute(trends_query, {"user_id": str(user_id)}).fetchall()
        monthly_trends = [
            {"month": row.month, "count": row.count}
            for row in trends_results
        ]
        
        # Get interests by project type (excluding withdrawn)
        project_type_query = text(f"""
            SELECT 
                COALESCE(l.energy_key, 'Unknown') as project_type,
                COUNT(*) as count
            FROM investor_interests ii
            JOIN lands l ON ii.land_id = l.land_id
            WHERE ii.investor_id::text = :user_id
            {withdrawal_filter}
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
        # Exclude withdrawn interests (withdrawal_status = 'approved')
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
            AND (ii.withdrawal_requested = FALSE 
                 OR ii.withdrawal_status IS NULL 
                 OR ii.withdrawal_status != 'approved')
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

# ============================================================================
# MASTER SALES ADVISOR ENDPOINTS
# ============================================================================

@router.post("/master-advisor/assign")
async def assign_master_sales_advisor(
    assignment_data: MasterSalesAdvisorAssign,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign a master sales advisor to a land/project (Admin only)."""
    land_id = assignment_data.land_id
    sales_advisor_id = assignment_data.sales_advisor_id
    
    # Check if land exists
    land_check = text("SELECT land_id FROM lands WHERE land_id = :land_id")
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    # Check if user is a sales advisor
    advisor_check = text("""
        SELECT u.user_id 
        FROM "user" u
        JOIN user_roles ur ON u.user_id = ur.user_id
        WHERE u.user_id = :advisor_id AND ur.role_key = 're_sales_advisor' AND u.is_active = TRUE
    """)
    advisor_result = db.execute(advisor_check, {"advisor_id": str(sales_advisor_id)}).fetchone()
    
    if not advisor_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an active sales advisor"
        )
    
    try:
        # Deactivate existing assignments for this land
        deactivate_query = text("""
            UPDATE master_sales_advisor_assignments 
            SET is_active = FALSE 
            WHERE land_id = :land_id AND is_active = TRUE
        """)
        db.execute(deactivate_query, {"land_id": str(land_id)})
        
        # Create new assignment
        assignment_id = str(uuid.uuid4())
        assign_query = text("""
            INSERT INTO master_sales_advisor_assignments (
                assignment_id, land_id, sales_advisor_id, assigned_by, assigned_at, is_active
            ) VALUES (
                :assignment_id, :land_id, :sales_advisor_id, :assigned_by, CURRENT_TIMESTAMP, TRUE
            )
        """)
        db.execute(assign_query, {
            "assignment_id": assignment_id,
            "land_id": str(land_id),
            "sales_advisor_id": str(sales_advisor_id),
            "assigned_by": str(current_user["user_id"])
        })
        
        # Update existing pending interests for this land to assign them to the master advisor
        update_interests_query = text("""
            UPDATE investor_interests 
            SET master_sales_advisor_id = :advisor_id
            WHERE land_id = :land_id AND status = 'pending' AND master_sales_advisor_id IS NULL
        """)
        db.execute(update_interests_query, {
            "advisor_id": str(sales_advisor_id),
            "land_id": str(land_id)
        })
        
        db.commit()
        
        return MessageResponse(message="Master sales advisor assigned successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign master sales advisor: {str(e)}"
        )

@router.get("/master-advisor/assignment/{land_id}")
async def get_master_advisor_assignment(
    land_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current master sales advisor assignment for a land/project."""
    try:
        # Check if there's an active assignment for this land
        assignment_query = text("""
            SELECT 
                msa.assignment_id,
                msa.land_id,
                msa.sales_advisor_id,
                msa.assigned_by,
                msa.assigned_at,
                msa.is_active,
                u.first_name || ' ' || u.last_name as advisor_name,
                u.email as advisor_email
            FROM master_sales_advisor_assignments msa
            JOIN "user" u ON msa.sales_advisor_id = u.user_id
            WHERE msa.land_id = :land_id AND msa.is_active = TRUE
            ORDER BY msa.assigned_at DESC
            LIMIT 1
        """)
        
        result = db.execute(assignment_query, {"land_id": str(land_id)}).fetchone()
        
        if not result:
            return {"assigned": False, "assignment": None}
        
        return {
            "assigned": True,
            "assignment": {
                "assignment_id": str(result.assignment_id),
                "land_id": str(result.land_id),
                "sales_advisor_id": str(result.sales_advisor_id),
                "assigned_by": str(result.assigned_by),
                "assigned_at": result.assigned_at.isoformat() if result.assigned_at else None,
                "advisor_name": result.advisor_name,
                "advisor_email": result.advisor_email
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch master advisor assignment: {str(e)}"
        )

@router.get("/master-advisor/interests")
async def get_master_advisor_interests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interests assigned to the current user as master sales advisor."""
    user_roles = current_user.get("roles", [])
    
    if "re_sales_advisor" not in user_roles and "administrator" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sales advisors and admins can view assigned interests"
        )
    
    user_id = current_user.get("user_id")
    
    try:
        # Check if withdrawal columns exist
        check_columns_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'investor_interests' 
            AND column_name IN ('withdrawal_requested', 'withdrawal_status')
        """)
        column_check = db.execute(check_columns_query).fetchall()
        has_withdrawal_fields = len(column_check) >= 2
        
        # Build query with optional status filter
        if has_withdrawal_fields:
            base_query = """
                SELECT 
                    ii.interest_id,
                    ii.land_id,
                    ii.investor_id,
                    ii.status,
                    ii.nda_accepted,
                    ii.cta_accepted,
                    ii.created_at,
                    ii.updated_at,
                    ii.approved_at,
                    l.title as land_title,
                    l.location_text as land_location,
                    l.energy_key as energy_type,
                    u.first_name || ' ' || u.last_name as investor_name,
                    u.email as investor_email,
                    COALESCE(ii.withdrawal_requested, FALSE) as withdrawal_requested,
                    ii.withdrawal_reason,
                    ii.withdrawal_status,
                    ii.withdrawal_requested_at,
                    ii.withdrawal_approved_at
                FROM investor_interests ii
                JOIN lands l ON ii.land_id = l.land_id
                JOIN "user" u ON ii.investor_id = u.user_id
                WHERE ii.master_sales_advisor_id = :user_id
            """
        else:
            base_query = """
                SELECT 
                    ii.interest_id,
                    ii.land_id,
                    ii.investor_id,
                    ii.status,
                    ii.nda_accepted,
                    ii.cta_accepted,
                    ii.created_at,
                    ii.updated_at,
                    ii.approved_at,
                    l.title as land_title,
                    l.location_text as land_location,
                    l.energy_key as energy_type,
                    u.first_name || ' ' || u.last_name as investor_name,
                    u.email as investor_email
                FROM investor_interests ii
                JOIN lands l ON ii.land_id = l.land_id
                JOIN "user" u ON ii.investor_id = u.user_id
                WHERE ii.master_sales_advisor_id = :user_id
            """
        
        params = {"user_id": str(user_id)}
        
        if status:
            base_query += " AND ii.status = :status"
            params["status"] = status
        
        base_query += " ORDER BY ii.created_at DESC"
        
        query = text(base_query)
        results = db.execute(query, params).fetchall()
        
        interests = []
        for row in results:
            interest_dict = {
                "interest_id": str(row.interest_id),
                "land_id": str(row.land_id),
                "investor_id": str(row.investor_id),
                "status": row.status,
                "nda_accepted": row.nda_accepted if hasattr(row, 'nda_accepted') else False,
                "cta_accepted": row.cta_accepted if hasattr(row, 'cta_accepted') else False,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "approved_at": getattr(row, 'approved_at', None).isoformat() if getattr(row, 'approved_at', None) else None,
                "land_title": row.land_title,
                "land_location": row.land_location,
                "energy_type": row.energy_type,
                "investor_name": row.investor_name,
                "investor_email": row.investor_email
            }
            
            # Add withdrawal fields if they exist
            if has_withdrawal_fields:
                interest_dict.update({
                    "withdrawal_requested": getattr(row, 'withdrawal_requested', False),
                    "withdrawal_reason": getattr(row, 'withdrawal_reason', None),
                    "withdrawal_status": getattr(row, 'withdrawal_status', None),
                    "withdrawal_requested_at": getattr(row, 'withdrawal_requested_at', None).isoformat() if getattr(row, 'withdrawal_requested_at', None) else None,
                    "withdrawal_approved_at": getattr(row, 'withdrawal_approved_at', None).isoformat() if getattr(row, 'withdrawal_approved_at', None) else None
                })
            else:
                interest_dict.update({
                    "withdrawal_requested": False,
                    "withdrawal_reason": None,
                    "withdrawal_status": None,
                    "withdrawal_requested_at": None,
                    "withdrawal_approved_at": None
                })
            
            interests.append(interest_dict)
        
        return interests
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch interests: {str(e)}"
        )

@router.post("/interest/{interest_id}/approve")
async def approve_interest(
    interest_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve an investor interest (Master Sales Advisor only)."""
    user_roles = current_user.get("roles", [])
    user_id = current_user.get("user_id")
    
    # Check if interest exists and user is the assigned master advisor
    interest_check = text("""
        SELECT master_sales_advisor_id, status
        FROM investor_interests 
        WHERE interest_id = :interest_id
    """)
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    # Allow admin or assigned master sales advisor to approve
    if ("administrator" not in user_roles and 
        (str(interest_result.master_sales_advisor_id) != str(user_id) or 
         "re_sales_advisor" not in user_roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned master sales advisor or admin can approve interests"
        )
    
    if interest_result.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve interest with status: {interest_result.status}"
        )
    
    try:
        # Get land_id before updating
        land_id_query = text("""
            SELECT land_id FROM investor_interests WHERE interest_id = :interest_id
        """)
        land_id_result = db.execute(land_id_query, {"interest_id": str(interest_id)}).fetchone()
        land_id = land_id_result.land_id if land_id_result else None
        
        # Update interest status to approved
        update_query = text("""
            UPDATE investor_interests 
            SET status = 'approved',
                approved_by = :approved_by,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE interest_id = :interest_id
        """)
        db.execute(update_query, {
            "interest_id": str(interest_id),
            "approved_by": str(user_id)
        })
        
        # Ensure project stays locked when interest is approved
        if land_id:
            lock_land_query = text("""
                UPDATE lands 
                SET 
                    status = 'interest_locked',
                    interest_locked_at = COALESCE(interest_locked_at, CURRENT_TIMESTAMP),
                    updated_at = CURRENT_TIMESTAMP
                WHERE land_id = :land_id
                AND status IN ('published', 'interest_locked')
            """)
            
            db.execute(lock_land_query, {
                "land_id": str(land_id)
            })
        
        db.commit()
        
        return MessageResponse(message="Interest approved successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve interest: {str(e)}"
        )

@router.post("/interest/{interest_id}/reject")
async def reject_interest(
    interest_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject an investor interest (Master Sales Advisor only)."""
    user_roles = current_user.get("roles", [])
    user_id = current_user.get("user_id")
    
    # Check if interest exists and user is the assigned master advisor
    interest_check = text("""
        SELECT master_sales_advisor_id, status
        FROM investor_interests 
        WHERE interest_id = :interest_id
    """)
    interest_result = db.execute(interest_check, {"interest_id": str(interest_id)}).fetchone()
    
    if not interest_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest not found"
        )
    
    # Allow admin or assigned master sales advisor to reject
    if ("administrator" not in user_roles and 
        (str(interest_result.master_sales_advisor_id) != str(user_id) or 
         "re_sales_advisor" not in user_roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned master sales advisor or admin can reject interests"
        )
    
    if interest_result.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject interest with status: {interest_result.status}"
        )
    
    try:
        # Get land_id before updating
        land_id_query = text("""
            SELECT land_id FROM investor_interests WHERE interest_id = :interest_id
        """)
        land_id_result = db.execute(land_id_query, {"interest_id": str(interest_id)}).fetchone()
        land_id = land_id_result.land_id if land_id_result else None
        
        # Update interest status to rejected
        update_query = text("""
            UPDATE investor_interests 
            SET status = 'rejected',
                approved_by = :approved_by,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE interest_id = :interest_id
        """)
        db.execute(update_query, {
            "interest_id": str(interest_id),
            "approved_by": str(user_id)
        })
        
        # Unlock the project - check if there are any other active interests (not rejected/withdrawn)
        if land_id:
            check_other_interests_query = text("""
                SELECT COUNT(*) as active_count
                FROM investor_interests
                WHERE land_id = :land_id
                AND interest_id != :interest_id
                AND status = 'pending'
                AND (
                    withdrawal_requested = FALSE 
                    OR withdrawal_status IS NULL 
                    OR withdrawal_status != 'approved'
                )
            """)
            
            other_interests_result = db.execute(check_other_interests_query, {
                "land_id": str(land_id),
                "interest_id": str(interest_id)
            }).fetchone()
            
            # If no other active interests, unlock the project
            if other_interests_result and other_interests_result.active_count == 0:
                unlock_land_query = text("""
                    UPDATE lands 
                    SET 
                        status = 'published',
                        interest_locked_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE land_id = :land_id
                    AND status = 'interest_locked'
                """)
                
                db.execute(unlock_land_query, {
                    "land_id": str(land_id)
                })
        
        db.commit()
        
        return MessageResponse(message="Interest rejected successfully. Project has been unlocked and is now available to all investors.")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject interest: {str(e)}"
        )