"""
Notification service for document version updates and status changes
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import json
import uuid

class NotificationService:
    """Service for handling document version notifications"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_document_version_notification(
        self,
        land_id: str,
        document_type: str,
        version_number: int,
        uploaded_by: str,
        change_type: str,  # 'new_version', 'status_change', 'review_assigned'
        details: Dict[str, Any] = None
    ) -> str:
        """Create a notification for document version changes"""
        
        notification_id = str(uuid.uuid4())
        
        # Get landowner and admin users to notify
        users_to_notify = self._get_users_to_notify(land_id)
        
        for user_id in users_to_notify:
            notification_data = {
                "notification_id": notification_id,
                "user_id": user_id,
                "type": "document_version_update",
                "title": self._get_notification_title(change_type, document_type, version_number),
                "message": self._get_notification_message(change_type, document_type, version_number, details),
                "data": {
                    "land_id": land_id,
                    "document_type": document_type,
                    "version_number": version_number,
                    "change_type": change_type,
                    "uploaded_by": uploaded_by,
                    "details": details or {}
                },
                "created_at": datetime.utcnow(),
                "read": False
            }
            
            # Insert notification into database
            self._insert_notification(notification_data)
        
        return notification_id
    
    def _get_users_to_notify(self, land_id: str) -> List[str]:
        """Get list of user IDs to notify about document changes"""
        query = text("""
            SELECT DISTINCT u.user_id
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            LEFT JOIN lands l ON l.landowner_id = u.user_id
            WHERE l.land_id = :land_id
            OR ur.role_key IN ('administrator', 're_analyst', 're_governance_lead')
        """)
        
        result = self.db.execute(query, {"land_id": land_id}).fetchall()
        return [str(row[0]) for row in result]
    
    def _get_notification_title(self, change_type: str, document_type: str, version_number: int) -> str:
        """Generate notification title based on change type"""
        titles = {
            'new_version': f"New Version Uploaded: {document_type} v{version_number}",
            'status_change': f"Document Status Updated: {document_type} v{version_number}",
            'review_assigned': f"Document Assigned for Review: {document_type} v{version_number}",
            'review_locked': f"Document Locked for Review: {document_type} v{version_number}"
        }
        return titles.get(change_type, f"Document Update: {document_type} v{version_number}")
    
    def _get_notification_message(self, change_type: str, document_type: str, version_number: int, details: Dict[str, Any]) -> str:
        """Generate notification message based on change type"""
        messages = {
            'new_version': f"A new version (v{version_number}) of {document_type} has been uploaded. Previous versions remain available for review.",
            'status_change': f"The status of {document_type} v{version_number} has been updated.",
            'review_assigned': f"{document_type} v{version_number} has been assigned for review.",
            'review_locked': f"{document_type} v{version_number} is now locked for review and cannot be modified."
        }
        
        base_message = messages.get(change_type, f"{document_type} v{version_number} has been updated.")
        
        if details and 'reason' in details:
            base_message += f" Reason: {details['reason']}"
        
        return base_message
    
    def _insert_notification(self, notification_data: Dict[str, Any]):
        """Insert notification into database"""
        query = text("""
            INSERT INTO notifications (
                notification_id, user_id, type, title, message, 
                data, created_at, read
            ) VALUES (
                :notification_id, :user_id, :type, :title, :message,
                :data, :created_at, :read
            )
        """)
        
        self.db.execute(query, {
            "notification_id": notification_data["notification_id"],
            "user_id": notification_data["user_id"],
            "type": notification_data["type"],
            "title": notification_data["title"],
            "message": notification_data["message"],
            "data": json.dumps(notification_data["data"]),
            "created_at": notification_data["created_at"],
            "read": notification_data["read"]
        })
        self.db.commit()
    
    def notify_version_upload(self, land_id: str, document_type: str, version_number: int, uploaded_by: str, reason: str = None):
        """Notify about new version upload"""
        details = {"reason": reason} if reason else {}
        return self.create_document_version_notification(
            land_id, document_type, version_number, uploaded_by, 'new_version', details
        )
    
    def notify_status_change(self, land_id: str, document_type: str, version_number: int, uploaded_by: str, new_status: str, reason: str = None):
        """Notify about status change"""
        details = {"new_status": new_status, "reason": reason} if reason else {"new_status": new_status}
        return self.create_document_version_notification(
            land_id, document_type, version_number, uploaded_by, 'status_change', details
        )
    
    def notify_review_assignment(self, land_id: str, document_type: str, version_number: int, reviewer_id: str, assigned_by: str):
        """Notify about review assignment"""
        details = {"reviewer_id": reviewer_id, "assigned_by": assigned_by}
        return self.create_document_version_notification(
            land_id, document_type, version_number, assigned_by, 'review_assigned', details
        )
    
    def notify_review_lock(self, land_id: str, document_type: str, version_number: int, locked_by: str, reason: str = None):
        """Notify about review lock"""
        details = {"reason": reason} if reason else {}
        return self.create_document_version_notification(
            land_id, document_type, version_number, locked_by, 'review_locked', details
        )
