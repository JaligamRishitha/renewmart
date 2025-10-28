from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class DocumentAssignment(Base):
    """Document assignment model - tracks which document versions are assigned to which reviewers"""
    __tablename__ = "document_assignments"
    
    assignment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    land_id = Column(UUID(as_uuid=True), ForeignKey("lands.land_id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    reviewer_role = Column(String(50), nullable=False)  # re_sales_advisor, re_analyst, re_governance_lead
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=True)
    assignment_status = Column(String(50), default='assigned')  # assigned, in_progress, completed, cancelled
    assignment_notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    priority = Column(String(20), default='medium')  # low, medium, high, urgent
    is_locked = Column(Boolean, default=True)  # Documents are locked when assigned
    lock_reason = Column(Text, nullable=True)
    
    # Relationships
    document = relationship("Document", back_populates="assignments")
    land = relationship("Land")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_documents")
    assigner = relationship("User", foreign_keys=[assigned_by])
    task = relationship("Task", back_populates="document_assignments")
    
    def __repr__(self):
        return f"<DocumentAssignment(assignment_id={self.assignment_id}, document_id={self.document_id}, assigned_to={self.assigned_to})>"
