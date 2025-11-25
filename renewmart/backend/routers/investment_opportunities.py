from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import uuid

from database import get_db
from auth import get_current_user
from models.investment_opportunity_schemas import (
    InvestmentOpportunityCreate,
    InvestmentOpportunityUpdate,
    InvestmentOpportunityResponse,
    OpportunityMatchCreate,
    OpportunityMatchUpdate,
    OpportunityMatchResponse,
    MatchingCriteria
)

router = APIRouter(prefix="/investment-opportunities", tags=["investment-opportunities"])


# Helper function to calculate match score
def calculate_match_score(opportunity: dict, land: dict) -> tuple[Decimal, dict]:
    """Calculate match score between opportunity and land parcel"""
    score = Decimal(0)
    max_score = Decimal(0)
    details = {}
    
    # Capacity matching (weight: 25)
    if opportunity.get('min_capacity_mw') or opportunity.get('max_capacity_mw'):
        max_score += 25
        land_capacity = land.get('capacity_mw')
        if land_capacity:
            min_cap = opportunity.get('min_capacity_mw', 0)
            max_cap = opportunity.get('max_capacity_mw', float('inf'))
            if min_cap <= land_capacity <= max_cap:
                score += 25
                details['capacity_match'] = 'perfect'
            elif land_capacity < min_cap:
                # Partial score if close
                ratio = float(land_capacity / min_cap) if min_cap > 0 else 0
                partial = min(ratio * 25, 15)
                score += Decimal(partial)
                details['capacity_match'] = 'below_minimum'
            else:
                ratio = float(max_cap / land_capacity) if land_capacity > 0 else 0
                partial = min(ratio * 25, 15)
                score += Decimal(partial)
                details['capacity_match'] = 'above_maximum'
    
    # Energy type matching (weight: 20)
    if opportunity.get('preferred_energy_types'):
        max_score += 20
        land_energy = land.get('energy_key')
        if land_energy and land_energy in opportunity['preferred_energy_types']:
            score += 20
            details['energy_type_match'] = 'perfect'
        else:
            details['energy_type_match'] = 'no_match'
    
    # Region matching (weight: 15)
    if opportunity.get('preferred_regions'):
        max_score += 15
        land_location = land.get('location_text', '').lower()
        matched_region = False
        for region in opportunity['preferred_regions']:
            if region.lower() in land_location:
                score += 15
                details['region_match'] = 'perfect'
                matched_region = True
                break
        if not matched_region:
            details['region_match'] = 'no_match'
    
    # Area matching (weight: 15)
    if opportunity.get('min_area_acres') or opportunity.get('max_area_acres'):
        max_score += 15
        land_area = land.get('area_acres')
        if land_area:
            min_area = opportunity.get('min_area_acres', 0)
            max_area = opportunity.get('max_area_acres', float('inf'))
            if min_area <= land_area <= max_area:
                score += 15
                details['area_match'] = 'perfect'
            else:
                details['area_match'] = 'out_of_range'
    
    # Price matching (weight: 15)
    if opportunity.get('max_price_per_mwh'):
        max_score += 15
        land_price = land.get('price_per_mwh')
        if land_price:
            if land_price <= opportunity['max_price_per_mwh']:
                score += 15
                details['price_match'] = 'within_budget'
            else:
                details['price_match'] = 'above_budget'
    
    # Contract term matching (weight: 10)
    if opportunity.get('min_contract_term_years') or opportunity.get('max_contract_term_years'):
        max_score += 10
        land_term = land.get('contract_term_years')
        if land_term:
            min_term = opportunity.get('min_contract_term_years', 0)
            max_term = opportunity.get('max_contract_term_years', float('inf'))
            if min_term <= land_term <= max_term:
                score += 10
                details['contract_term_match'] = 'perfect'
            else:
                details['contract_term_match'] = 'out_of_range'
    
    # Normalize score to 0-100
    if max_score > 0:
        final_score = (score / max_score) * 100
    else:
        final_score = Decimal(0)
    
    return final_score, details


@router.post("", response_model=InvestmentOpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_investment_opportunity(
    opportunity_data: InvestmentOpportunityCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new investment opportunity (investor only)"""
    user_roles = current_user.get("roles", [])
    
    # Check if user is an investor
    if "investor" not in user_roles and "administrator" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only investors can create investment opportunities"
        )
    
    try:
        opportunity_id = str(uuid.uuid4())
        
        # Convert lists to JSON strings for database
        preferred_energy_types = opportunity_data.preferred_energy_types
        preferred_regions = opportunity_data.preferred_regions
        
        insert_query = text("""
            INSERT INTO investment_opportunities (
                opportunity_id, investor_id, title, description,
                min_capacity_mw, max_capacity_mw, preferred_energy_types, preferred_regions,
                min_area_acres, max_area_acres, max_price_per_mwh,
                min_contract_term_years, max_contract_term_years,
                budget_min, budget_max, timeline_months,
                additional_requirements, preferred_project_stage,
                status, priority, auto_match_enabled, notification_enabled,
                created_at, updated_at
            ) VALUES (
                :opportunity_id, :investor_id, :title, :description,
                :min_capacity_mw, :max_capacity_mw, :preferred_energy_types::jsonb, :preferred_regions::jsonb,
                :min_area_acres, :max_area_acres, :max_price_per_mwh,
                :min_contract_term_years, :max_contract_term_years,
                :budget_min, :budget_max, :timeline_months,
                :additional_requirements, :preferred_project_stage,
                :status, :priority, :auto_match_enabled, :notification_enabled,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """)
        
        import json
        db.execute(insert_query, {
            "opportunity_id": opportunity_id,
            "investor_id": str(current_user["user_id"]),
            "title": opportunity_data.title,
            "description": opportunity_data.description,
            "min_capacity_mw": float(opportunity_data.min_capacity_mw) if opportunity_data.min_capacity_mw else None,
            "max_capacity_mw": float(opportunity_data.max_capacity_mw) if opportunity_data.max_capacity_mw else None,
            "preferred_energy_types": json.dumps(preferred_energy_types) if preferred_energy_types else None,
            "preferred_regions": json.dumps(preferred_regions) if preferred_regions else None,
            "min_area_acres": float(opportunity_data.min_area_acres) if opportunity_data.min_area_acres else None,
            "max_area_acres": float(opportunity_data.max_area_acres) if opportunity_data.max_area_acres else None,
            "max_price_per_mwh": float(opportunity_data.max_price_per_mwh) if opportunity_data.max_price_per_mwh else None,
            "min_contract_term_years": opportunity_data.min_contract_term_years,
            "max_contract_term_years": opportunity_data.max_contract_term_years,
            "budget_min": float(opportunity_data.budget_min) if opportunity_data.budget_min else None,
            "budget_max": float(opportunity_data.budget_max) if opportunity_data.budget_max else None,
            "timeline_months": opportunity_data.timeline_months,
            "additional_requirements": opportunity_data.additional_requirements,
            "preferred_project_stage": opportunity_data.preferred_project_stage,
            "status": "active",
            "priority": opportunity_data.priority or "medium",
            "auto_match_enabled": opportunity_data.auto_match_enabled if opportunity_data.auto_match_enabled is not None else True,
            "notification_enabled": opportunity_data.notification_enabled if opportunity_data.notification_enabled is not None else True
        })
        
        db.commit()
        
        # Fetch and return the created opportunity
        return await get_investment_opportunity(UUID(opportunity_id), current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create investment opportunity: {str(e)}"
        )


@router.get("", response_model=List[InvestmentOpportunityResponse])
async def get_investment_opportunities(
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get investment opportunities with optional filters"""
    user_roles = current_user.get("roles", [])
    
    # Build query
    query = """
        SELECT 
            io.*,
            u.first_name || ' ' || u.last_name as investor_name,
            u.email as investor_email,
            (SELECT COUNT(*) FROM opportunity_matches WHERE opportunity_id = io.opportunity_id) as match_count
        FROM investment_opportunities io
        JOIN "user" u ON io.investor_id = u.user_id
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    # Non-admin users can only see their own opportunities
    if "administrator" not in user_roles:
        query += " AND io.investor_id = :user_id"
        params["user_id"] = str(current_user["user_id"])
    
    if status:
        query += " AND io.status = :status"
        params["status"] = status
    
    if priority:
        query += " AND io.priority = :priority"
        params["priority"] = priority
    
    query += " ORDER BY io.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(query), params).fetchall()
    
    opportunities = []
    for row in results:
        import json
        opp_dict = dict(row._mapping)
        
        # Parse JSON fields
        if opp_dict.get('preferred_energy_types'):
            try:
                opp_dict['preferred_energy_types'] = json.loads(opp_dict['preferred_energy_types']) if isinstance(opp_dict['preferred_energy_types'], str) else opp_dict['preferred_energy_types']
            except:
                opp_dict['preferred_energy_types'] = []
        
        if opp_dict.get('preferred_regions'):
            try:
                opp_dict['preferred_regions'] = json.loads(opp_dict['preferred_regions']) if isinstance(opp_dict['preferred_regions'], str) else opp_dict['preferred_regions']
            except:
                opp_dict['preferred_regions'] = []
        
        opportunities.append(InvestmentOpportunityResponse(**opp_dict))
    
    return opportunities


@router.get("/{opportunity_id}", response_model=InvestmentOpportunityResponse)
async def get_investment_opportunity(
    opportunity_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get investment opportunity by ID"""
    query = text("""
        SELECT 
            io.*,
            u.first_name || ' ' || u.last_name as investor_name,
            u.email as investor_email,
            (SELECT COUNT(*) FROM opportunity_matches WHERE opportunity_id = io.opportunity_id) as match_count
        FROM investment_opportunities io
        JOIN "user" u ON io.investor_id = u.user_id
        WHERE io.opportunity_id = :opportunity_id
    """)
    
    result = db.execute(query, {"opportunity_id": str(opportunity_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment opportunity not found"
        )
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles and str(result.investor_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this opportunity"
        )
    
    import json
    opp_dict = dict(result._mapping)
    
    # Parse JSON fields
    if opp_dict.get('preferred_energy_types'):
        try:
            opp_dict['preferred_energy_types'] = json.loads(opp_dict['preferred_energy_types']) if isinstance(opp_dict['preferred_energy_types'], str) else opp_dict['preferred_energy_types']
        except:
            opp_dict['preferred_energy_types'] = []
    
    if opp_dict.get('preferred_regions'):
        try:
            opp_dict['preferred_regions'] = json.loads(opp_dict['preferred_regions']) if isinstance(opp_dict['preferred_regions'], str) else opp_dict['preferred_regions']
        except:
            opp_dict['preferred_regions'] = []
    
    return InvestmentOpportunityResponse(**opp_dict)


@router.put("/{opportunity_id}", response_model=InvestmentOpportunityResponse)
async def update_investment_opportunity(
    opportunity_id: UUID,
    opportunity_update: InvestmentOpportunityUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update investment opportunity"""
    # Check if opportunity exists and user has permission
    check_query = text("""
        SELECT investor_id FROM investment_opportunities
        WHERE opportunity_id = :opportunity_id
    """)
    
    result = db.execute(check_query, {"opportunity_id": str(opportunity_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment opportunity not found"
        )
    
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles and str(result.investor_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this opportunity"
        )
    
    try:
        # Build dynamic update query
        update_fields = []
        params = {"opportunity_id": str(opportunity_id)}
        
        update_data = opportunity_update.dict(exclude_unset=True)
        
        import json
        for field, value in update_data.items():
            if value is not None:
                if field in ['preferred_energy_types', 'preferred_regions']:
                    update_fields.append(f"{field} = :{field}::jsonb")
                    params[field] = json.dumps(value)
                else:
                    update_fields.append(f"{field} = :{field}")
                    if isinstance(value, Decimal):
                        params[field] = float(value)
                    else:
                        params[field] = value
        
        if update_fields:
            update_query = text(f"""
                UPDATE investment_opportunities 
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE opportunity_id = :opportunity_id
            """)
            
            db.execute(update_query, params)
            db.commit()
        
        return await get_investment_opportunity(opportunity_id, current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update investment opportunity: {str(e)}"
        )


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investment_opportunity(
    opportunity_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete investment opportunity"""
    # Check if opportunity exists and user has permission
    check_query = text("""
        SELECT investor_id FROM investment_opportunities
        WHERE opportunity_id = :opportunity_id
    """)
    
    result = db.execute(check_query, {"opportunity_id": str(opportunity_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment opportunity not found"
        )
    
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles and str(result.investor_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this opportunity"
        )
    
    try:
        delete_query = text("""
            DELETE FROM investment_opportunities
            WHERE opportunity_id = :opportunity_id
        """)
        
        db.execute(delete_query, {"opportunity_id": str(opportunity_id)})
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete investment opportunity: {str(e)}"
        )


@router.post("/{opportunity_id}/find-matches", response_model=List[OpportunityMatchResponse])
async def find_matches_for_opportunity(
    opportunity_id: UUID,
    criteria: MatchingCriteria = MatchingCriteria(),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find matching land parcels for an investment opportunity"""
    # Check if opportunity exists and user has permission
    opp_query = text("""
        SELECT * FROM investment_opportunities
        WHERE opportunity_id = :opportunity_id
    """)
    
    opp_result = db.execute(opp_query, {"opportunity_id": str(opportunity_id)}).fetchone()
    
    if not opp_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment opportunity not found"
        )
    
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles and str(opp_result.investor_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to find matches for this opportunity"
        )
    
    try:
        # Get all published lands
        lands_query = text("""
            SELECT * FROM lands
            WHERE status IN ('published', 'ready_to_buy')
            ORDER BY created_at DESC
        """)
        
        lands = db.execute(lands_query).fetchall()
        
        # Convert opportunity to dict
        import json
        opp_dict = dict(opp_result._mapping)
        if opp_dict.get('preferred_energy_types'):
            try:
                opp_dict['preferred_energy_types'] = json.loads(opp_dict['preferred_energy_types']) if isinstance(opp_dict['preferred_energy_types'], str) else opp_dict['preferred_energy_types']
            except:
                opp_dict['preferred_energy_types'] = []
        if opp_dict.get('preferred_regions'):
            try:
                opp_dict['preferred_regions'] = json.loads(opp_dict['preferred_regions']) if isinstance(opp_dict['preferred_regions'], str) else opp_dict['preferred_regions']
            except:
                opp_dict['preferred_regions'] = []
        
        # Calculate match scores
        matches = []
        for land in lands:
            land_dict = dict(land._mapping)
            match_score, match_details = calculate_match_score(opp_dict, land_dict)
            
            if match_score >= criteria.min_match_score:
                # Check if match already exists
                existing_match_query = text("""
                    SELECT match_id FROM opportunity_matches
                    WHERE opportunity_id = :opportunity_id AND land_id = :land_id
                """)
                existing = db.execute(existing_match_query, {
                    "opportunity_id": str(opportunity_id),
                    "land_id": str(land.land_id)
                }).fetchone()
                
                if not existing:
                    # Create new match
                    match_id = str(uuid.uuid4())
                    insert_match_query = text("""
                        INSERT INTO opportunity_matches (
                            match_id, opportunity_id, land_id, match_score, match_details,
                            status, created_at
                        ) VALUES (
                            :match_id, :opportunity_id, :land_id, :match_score, :match_details::jsonb,
                            'suggested', CURRENT_TIMESTAMP
                        )
                    """)
                    
                    db.execute(insert_match_query, {
                        "match_id": match_id,
                        "opportunity_id": str(opportunity_id),
                        "land_id": str(land.land_id),
                        "match_score": float(match_score),
                        "match_details": json.dumps(match_details)
                    })
                    
                    matches.append({
                        "match_id": match_id,
                        "opportunity_id": str(opportunity_id),
                        "land_id": str(land.land_id),
                        "match_score": match_score,
                        "match_details": match_details,
                        "status": "suggested",
                        "created_at": datetime.now(),
                        "viewed_at": None,
                        "status_updated_at": None,
                        "investor_notes": None,
                        "land_title": land_dict.get('title'),
                        "land_location": land_dict.get('location_text'),
                        "land_capacity_mw": land_dict.get('capacity_mw'),
                        "land_energy_type": land_dict.get('energy_key'),
                        "land_area_acres": land_dict.get('area_acres'),
                        "land_price_per_mwh": land_dict.get('price_per_mwh'),
                        "land_status": land_dict.get('status')
                    })
        
        db.commit()
        
        # Sort by match score descending and limit
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        matches = matches[:criteria.limit]
        
        return [OpportunityMatchResponse(**match) for match in matches]
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find matches: {str(e)}"
        )


@router.get("/{opportunity_id}/matches", response_model=List[OpportunityMatchResponse])
async def get_opportunity_matches(
    opportunity_id: UUID,
    status: Optional[str] = Query(None, description="Filter by match status"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all matches for an investment opportunity"""
    # Check if opportunity exists and user has permission
    opp_query = text("""
        SELECT investor_id FROM investment_opportunities
        WHERE opportunity_id = :opportunity_id
    """)
    
    opp_result = db.execute(opp_query, {"opportunity_id": str(opportunity_id)}).fetchone()
    
    if not opp_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment opportunity not found"
        )
    
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles and str(opp_result.investor_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view matches for this opportunity"
        )
    
    # Build query
    query = """
        SELECT 
            om.*,
            l.title as land_title,
            l.location_text as land_location,
            l.capacity_mw as land_capacity_mw,
            l.energy_key as land_energy_type,
            l.area_acres as land_area_acres,
            l.price_per_mwh as land_price_per_mwh,
            l.status as land_status
        FROM opportunity_matches om
        JOIN lands l ON om.land_id = l.land_id
        WHERE om.opportunity_id = :opportunity_id
    """
    
    params = {"opportunity_id": str(opportunity_id)}
    
    if status:
        query += " AND om.status = :status"
        params["status"] = status
    
    query += " ORDER BY om.match_score DESC, om.created_at DESC"
    
    results = db.execute(text(query), params).fetchall()
    
    matches = []
    for row in results:
        import json
        match_dict = dict(row._mapping)
        
        # Parse JSON fields
        if match_dict.get('match_details'):
            try:
                match_dict['match_details'] = json.loads(match_dict['match_details']) if isinstance(match_dict['match_details'], str) else match_dict['match_details']
            except:
                match_dict['match_details'] = {}
        
        matches.append(OpportunityMatchResponse(**match_dict))
    
    return matches


@router.put("/matches/{match_id}", response_model=OpportunityMatchResponse)
async def update_opportunity_match(
    match_id: UUID,
    match_update: OpportunityMatchUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an opportunity match (e.g., mark as viewed, interested, rejected)"""
    # Check if match exists and user has permission
    check_query = text("""
        SELECT om.*, io.investor_id
        FROM opportunity_matches om
        JOIN investment_opportunities io ON om.opportunity_id = io.opportunity_id
        WHERE om.match_id = :match_id
    """)
    
    result = db.execute(check_query, {"match_id": str(match_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    user_roles = current_user.get("roles", [])
    if "administrator" not in user_roles and str(result.investor_id) != str(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this match"
        )
    
    try:
        # Build dynamic update query
        update_fields = []
        params = {"match_id": str(match_id)}
        
        update_data = match_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if value is not None:
                update_fields.append(f"{field} = :{field}")
                params[field] = value
        
        # Add status_updated_at if status is being updated
        if 'status' in update_data:
            update_fields.append("status_updated_at = CURRENT_TIMESTAMP")
            
            # Mark as viewed if status is being changed from suggested
            if result.status == 'suggested' and not result.viewed_at:
                update_fields.append("viewed_at = CURRENT_TIMESTAMP")
        
        if update_fields:
            update_query = text(f"""
                UPDATE opportunity_matches 
                SET {', '.join(update_fields)}
                WHERE match_id = :match_id
            """)
            
            db.execute(update_query, params)
            db.commit()
        
        # Fetch and return updated match
        fetch_query = text("""
            SELECT 
                om.*,
                l.title as land_title,
                l.location_text as land_location,
                l.capacity_mw as land_capacity_mw,
                l.energy_key as land_energy_type,
                l.area_acres as land_area_acres,
                l.price_per_mwh as land_price_per_mwh,
                l.status as land_status
            FROM opportunity_matches om
            JOIN lands l ON om.land_id = l.land_id
            WHERE om.match_id = :match_id
        """)
        
        updated_result = db.execute(fetch_query, {"match_id": str(match_id)}).fetchone()
        
        import json
        match_dict = dict(updated_result._mapping)
        
        # Parse JSON fields
        if match_dict.get('match_details'):
            try:
                match_dict['match_details'] = json.loads(match_dict['match_details']) if isinstance(match_dict['match_details'], str) else match_dict['match_details']
            except:
                match_dict['match_details'] = {}
        
        return OpportunityMatchResponse(**match_dict)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update match: {str(e)}"
        )
