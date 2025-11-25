from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class InvestmentOpportunity(Base):
    """Investment Opportunity model - stores investor expectations and requirements"""
    __tablename__ = "investment_opportunities"
    
    opportunity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investor_id = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    
    # Investor expectations/requirements
    min_capacity_mw = Column(Numeric(12, 2))  # Minimum generation capacity required
    max_capacity_mw = Column(Numeric(12, 2))  # Maximum generation capacity required
    preferred_energy_types = Column(JSONB)  # Array of preferred energy types (solar, wind, hydro, etc.)
    preferred_regions = Column(JSONB)  # Array of preferred regions/locations
    min_area_acres = Column(Numeric(10, 2))  # Minimum land area
    max_area_acres = Column(Numeric(10, 2))  # Maximum land area
    max_price_per_mwh = Column(Numeric(12, 2))  # Maximum price per MWh willing to pay
    min_contract_term_years = Column(Integer)  # Minimum contract term
    max_contract_term_years = Column(Integer)  # Maximum contract term
    
    # Investment details
    budget_min = Column(Numeric(15, 2))  # Minimum investment budget
    budget_max = Column(Numeric(15, 2))  # Maximum investment budget
    timeline_months = Column(Integer)  # Expected timeline for project completion
    
    # Additional preferences
    additional_requirements = Column(Text)  # Any additional requirements or notes
    preferred_project_stage = Column(String)  # Preferred stage: early, mid, late, ready
    
    # Status and tracking
    status = Column(String, default='active')  # active, matched, closed, cancelled
    priority = Column(String, default='medium')  # low, medium, high, urgent
    
    # Matching and notifications
    auto_match_enabled = Column(Boolean, default=True)  # Enable automatic matching with land parcels
    notification_enabled = Column(Boolean, default=True)  # Enable notifications for new matches
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    investor = relationship("User", back_populates="investment_opportunities")
    matches = relationship("OpportunityMatch", back_populates="opportunity", cascade="all, delete-orphan")


class OpportunityMatch(Base):
    """Tracks matches between investment opportunities and land parcels"""
    __tablename__ = "opportunity_matches"
    
    match_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("investment_opportunities.opportunity_id", ondelete="CASCADE"), nullable=False)
    land_id = Column(UUID(as_uuid=True), ForeignKey("lands.land_id", ondelete="CASCADE"), nullable=False)
    
    # Match scoring and details
    match_score = Column(Numeric(5, 2))  # Match score (0-100)
    match_details = Column(JSONB)  # Details about why this is a match
    
    # Status tracking
    status = Column(String, default='suggested')  # suggested, viewed, interested, rejected, proposal_created
    investor_notes = Column(Text)  # Notes from investor about this match
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    status_updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    opportunity = relationship("InvestmentOpportunity", back_populates="matches")
    land = relationship("Land", back_populates="opportunity_matches")
