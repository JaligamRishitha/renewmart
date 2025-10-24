from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, BYTEA
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class Document(Base):
    """Document model - stores documents as binary data in database"""
    __tablename__ = "documents"
    
    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    land_id = Column(UUID(as_uuid=True), ForeignKey("lands.land_id", ondelete="CASCADE"))
    land_section_id = Column(UUID(as_uuid=True), ForeignKey("land_sections.land_section_id", ondelete="CASCADE"))
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=True)  # For task-specific documents
    subtask_id = Column(UUID(as_uuid=True), ForeignKey("subtasks.subtask_id", ondelete="CASCADE"), nullable=True)  # For subtask-specific documents
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("user.user_id"))
    document_type = Column(Text)
    file_name = Column(Text, nullable=False)
    file_path = Column(Text, nullable=True)  # Legacy field, now nullable
    file_data = Column(BYTEA, nullable=True)  # Binary data stored in database
    file_size = Column(Integer)
    mime_type = Column(Text)
    is_draft = Column(Boolean, default=True)
    status = Column(String(50), default='pending')  # pending, approved, rejected
    approved_by = Column(UUID(as_uuid=True), ForeignKey("user.user_id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    admin_comments = Column(Text, nullable=True)
    version_number = Column(Integer, default=1)
    is_latest_version = Column(Boolean, default=True)
    parent_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id"), nullable=True)
    version_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    land = relationship("Land", back_populates="documents")
    land_section = relationship("LandSection", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_documents")
    approver = relationship("User", foreign_keys=[approved_by])