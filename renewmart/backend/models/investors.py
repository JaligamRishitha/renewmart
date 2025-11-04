from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class InvestorInterest(Base):
    """Investor interest model"""
    __tablename__ = "investor_interests"
    
    interest_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    land_id = Column(UUID(as_uuid=True), ForeignKey("lands.land_id", ondelete="CASCADE"), nullable=False)
    investor_id = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=False)
    investment_amount = Column(Numeric(15, 2))
    message = Column(Text)
    status = Column(String, default='pending')
    nda_accepted = Column(Boolean, default=False, nullable=False)
    cta_accepted = Column(Boolean, default=False, nullable=False)
    master_sales_advisor_id = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    withdrawal_requested = Column(Boolean, default=False, nullable=False)
    withdrawal_reason = Column(Text, nullable=True)
    withdrawal_status = Column(String, nullable=True)
    withdrawal_requested_at = Column(DateTime(timezone=True), nullable=True)
    withdrawal_approved_by = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=True)
    withdrawal_approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    land = relationship("Land", back_populates="investor_interests")
    investor = relationship("User", foreign_keys=[investor_id], back_populates="investor_interests")
    master_sales_advisor = relationship("User", foreign_keys=[master_sales_advisor_id])
    approver = relationship("User", foreign_keys=[approved_by])
    withdrawal_approver = relationship("User", foreign_keys=[withdrawal_approved_by])


class MasterSalesAdvisorAssignment(Base):
    """Master sales advisor assignment model"""
    __tablename__ = "master_sales_advisor_assignments"
    
    assignment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    land_id = Column(UUID(as_uuid=True), ForeignKey("lands.land_id", ondelete="CASCADE"), nullable=False)
    sales_advisor_id = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    land = relationship("Land")
    sales_advisor = relationship("User", foreign_keys=[sales_advisor_id])
    assigner = relationship("User", foreign_keys=[assigned_by])