from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class InvestmentOpportunityBase(BaseModel):
    """Base schema for Investment Opportunity"""
    title: str = Field(..., min_length=5, max_length=200, description="Title of the investment opportunity")
    description: Optional[str] = Field(None, description="Detailed description of investment requirements")
    
    # Capacity requirements
    min_capacity_mw: Optional[Decimal] = Field(None, ge=0, description="Minimum generation capacity in MW")
    max_capacity_mw: Optional[Decimal] = Field(None, ge=0, description="Maximum generation capacity in MW")
    
    # Energy and location preferences
    preferred_energy_types: Optional[List[str]] = Field(
        None, 
        description="Preferred energy types (solar, wind, hydroelectric, biomass, geothermal, hybrid)"
    )
    preferred_regions: Optional[List[str]] = Field(
        None, 
        description="Preferred regions or locations"
    )
    
    # Area requirements
    min_area_acres: Optional[Decimal] = Field(None, ge=0, description="Minimum land area in acres")
    max_area_acres: Optional[Decimal] = Field(None, ge=0, description="Maximum land area in acres")
    
    # Financial requirements
    max_price_per_mwh: Optional[Decimal] = Field(None, ge=0, description="Maximum price per MWh willing to pay")
    budget_min: Optional[Decimal] = Field(None, ge=0, description="Minimum investment budget")
    budget_max: Optional[Decimal] = Field(None, ge=0, description="Maximum investment budget")
    
    # Contract terms
    min_contract_term_years: Optional[int] = Field(None, ge=1, le=50, description="Minimum contract term in years")
    max_contract_term_years: Optional[int] = Field(None, ge=1, le=50, description="Maximum contract term in years")
    
    # Timeline
    timeline_months: Optional[int] = Field(None, ge=1, description="Expected timeline for project completion in months")
    
    # Additional preferences
    additional_requirements: Optional[str] = Field(None, description="Additional requirements or notes")
    preferred_project_stage: Optional[str] = Field(
        None, 
        description="Preferred project stage: early, mid, late, ready"
    )
    
    # Settings
    priority: Optional[str] = Field(
        "medium", 
        description="Priority level: low, medium, high, urgent"
    )
    auto_match_enabled: Optional[bool] = Field(
        True, 
        description="Enable automatic matching with land parcels"
    )
    notification_enabled: Optional[bool] = Field(
        True, 
        description="Enable notifications for new matches"
    )
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('max_capacity_mw')
    def validate_capacity_range(cls, v, values):
        if v is not None and 'min_capacity_mw' in values and values['min_capacity_mw'] is not None:
            if v < values['min_capacity_mw']:
                raise ValueError('max_capacity_mw must be greater than or equal to min_capacity_mw')
        return v
    
    @validator('max_area_acres')
    def validate_area_range(cls, v, values):
        if v is not None and 'min_area_acres' in values and values['min_area_acres'] is not None:
            if v < values['min_area_acres']:
                raise ValueError('max_area_acres must be greater than or equal to min_area_acres')
        return v
    
    @validator('budget_max')
    def validate_budget_range(cls, v, values):
        if v is not None and 'budget_min' in values and values['budget_min'] is not None:
            if v < values['budget_min']:
                raise ValueError('budget_max must be greater than or equal to budget_min')
        return v
    
    @validator('max_contract_term_years')
    def validate_contract_term_range(cls, v, values):
        if v is not None and 'min_contract_term_years' in values and values['min_contract_term_years'] is not None:
            if v < values['min_contract_term_years']:
                raise ValueError('max_contract_term_years must be greater than or equal to min_contract_term_years')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        if v and v not in ['low', 'medium', 'high', 'urgent']:
            raise ValueError('priority must be one of: low, medium, high, urgent')
        return v
    
    @validator('preferred_project_stage')
    def validate_project_stage(cls, v):
        if v and v not in ['early', 'mid', 'late', 'ready']:
            raise ValueError('preferred_project_stage must be one of: early, mid, late, ready')
        return v


class InvestmentOpportunityCreate(InvestmentOpportunityBase):
    """Schema for creating an investment opportunity"""
    pass


class InvestmentOpportunityUpdate(BaseModel):
    """Schema for updating an investment opportunity"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = None
    min_capacity_mw: Optional[Decimal] = Field(None, ge=0)
    max_capacity_mw: Optional[Decimal] = Field(None, ge=0)
    preferred_energy_types: Optional[List[str]] = None
    preferred_regions: Optional[List[str]] = None
    min_area_acres: Optional[Decimal] = Field(None, ge=0)
    max_area_acres: Optional[Decimal] = Field(None, ge=0)
    max_price_per_mwh: Optional[Decimal] = Field(None, ge=0)
    budget_min: Optional[Decimal] = Field(None, ge=0)
    budget_max: Optional[Decimal] = Field(None, ge=0)
    min_contract_term_years: Optional[int] = Field(None, ge=1, le=50)
    max_contract_term_years: Optional[int] = Field(None, ge=1, le=50)
    timeline_months: Optional[int] = Field(None, ge=1)
    additional_requirements: Optional[str] = None
    preferred_project_stage: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    auto_match_enabled: Optional[bool] = None
    notification_enabled: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)


class InvestmentOpportunityResponse(InvestmentOpportunityBase):
    """Schema for investment opportunity response"""
    opportunity_id: UUID
    investor_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    
    # Additional computed fields
    investor_name: Optional[str] = None
    investor_email: Optional[str] = None
    match_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)


class OpportunityMatchBase(BaseModel):
    """Base schema for opportunity match"""
    match_score: Optional[Decimal] = Field(None, ge=0, le=100, description="Match score (0-100)")
    match_details: Optional[Dict[str, Any]] = Field(None, description="Details about the match")
    investor_notes: Optional[str] = Field(None, description="Notes from investor")
    
    model_config = ConfigDict(from_attributes=True)


class OpportunityMatchCreate(OpportunityMatchBase):
    """Schema for creating an opportunity match"""
    opportunity_id: UUID
    land_id: UUID


class OpportunityMatchUpdate(BaseModel):
    """Schema for updating an opportunity match"""
    status: Optional[str] = Field(None, description="Match status: suggested, viewed, interested, rejected, proposal_created")
    investor_notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('status')
    def validate_status(cls, v):
        if v and v not in ['suggested', 'viewed', 'interested', 'rejected', 'proposal_created']:
            raise ValueError('status must be one of: suggested, viewed, interested, rejected, proposal_created')
        return v


class OpportunityMatchResponse(OpportunityMatchBase):
    """Schema for opportunity match response"""
    match_id: UUID
    opportunity_id: UUID
    land_id: UUID
    status: str
    created_at: datetime
    viewed_at: Optional[datetime] = None
    status_updated_at: Optional[datetime] = None
    
    # Land details
    land_title: Optional[str] = None
    land_location: Optional[str] = None
    land_capacity_mw: Optional[Decimal] = None
    land_energy_type: Optional[str] = None
    land_area_acres: Optional[Decimal] = None
    land_price_per_mwh: Optional[Decimal] = None
    land_status: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class MatchingCriteria(BaseModel):
    """Schema for matching criteria when finding matches"""
    min_match_score: Optional[Decimal] = Field(70, ge=0, le=100, description="Minimum match score threshold")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Maximum number of matches to return")
    
    model_config = ConfigDict(from_attributes=True)
