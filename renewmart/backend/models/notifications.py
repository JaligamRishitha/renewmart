"""Notification models"""
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base
import uuid

class Notification(Base):
    """Notification model for user notifications"""
    __tablename__ = "notifications"
    
    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # task_assigned, project_uploaded, document_version, etc.
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String)  # task, project, document, system, etc.
    data = Column(JSON)  # Additional data (land_id, task_id, document_id, etc.)
    read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def to_dict(self):
        return {
            "notification_id": str(self.notification_id),
            "user_id": str(self.user_id),
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "category": self.category,
            "data": self.data,
            "read": self.read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

