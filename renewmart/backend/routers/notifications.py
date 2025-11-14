"""
Notification endpoints for user notifications
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID

from database import get_db
from auth import get_current_user
from models.schemas import MessageResponse

router = APIRouter()

# Schema for creating notifications
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class NotificationCreate(BaseModel):
    user_id: UUID = Field(..., description="User ID to send notification to")
    type: str = Field(..., description="Notification type (task_assigned, subtask_assigned, etc.)")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    category: Optional[str] = Field(None, description="Notification category (task, project, document, collaboration)")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional JSON data")

@router.post("", response_model=dict)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new notification (admin only or for own user)"""
    try:
        from utils.notifications import create_notification
        
        user_id = str(current_user["user_id"])
        target_user_id = str(notification_data.user_id)
        user_roles = current_user.get("roles", [])
        
        # Only admin can create notifications for other users
        # Users can create notifications for themselves (for testing)
        if target_user_id != user_id and "administrator" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create notifications for other users"
            )
        
        print(f"DEBUG: Creating notification via POST endpoint for user {target_user_id}")
        
        notification_id = create_notification(
            db=db,
            user_id=target_user_id,
            notification_type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            category=notification_data.category,
            data=notification_data.data
        )
        
        print(f"DEBUG: Committing notification {notification_id}...")
        db.commit()
        print(f"DEBUG: Notification {notification_id} committed successfully")
        
        # Return the created notification - using direct query since we need specific fields
        fetch_query = text("""
            SELECT 
                notification_id,
                user_id,
                type,
                title,
                message,
                category,
                data,
                read,
                read_at,
                created_at
            FROM notifications
            WHERE notification_id = CAST(:notification_id AS uuid)
        """)
        
        result = db.execute(fetch_query, {"notification_id": notification_id}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Notification created but could not be retrieved"
            )
        
        return {
            "notification_id": str(result.notification_id),
            "user_id": str(result.user_id),
            "type": result.type,
            "title": result.title,
            "message": result.message,
            "category": result.category,
            "data": result.data if result.data else {},
            "read": result.read,
            "read_at": result.read_at.isoformat() if result.read_at else None,
            "created_at": result.created_at.isoformat() if result.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating notification: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )

@router.get("", response_model=List[dict])
async def get_notifications(
    unread_only: Optional[bool] = Query(False, alias="unread_only"),
    limit: Optional[int] = Query(50, ge=1, le=100),
    offset: Optional[int] = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user"""
    try:
        user_id = str(current_user["user_id"])
        
        # Check if notifications table exists using stored procedure
        try:
            table_exists = db.execute(
                text("SELECT check_notifications_table_exists()")
            ).fetchone()
            if not table_exists or not table_exists[0]:
                print("WARNING: notifications table does not exist. Run database setup script.")
                return []
        except Exception as e:
            print(f"Error checking notifications table: {str(e)}")
            return []
        
        query = text("""
            SELECT 
                notification_id,
                user_id,
                type,
                title,
                message,
                category,
                data,
                read,
                read_at,
                created_at
            FROM notifications
            WHERE user_id = CAST(:user_id AS uuid)
        """)
        
        params = {"user_id": user_id}
        
        if unread_only:
            query = text("""
                SELECT 
                    notification_id,
                    user_id,
                    type,
                    title,
                    message,
                    category,
                    data,
                    read,
                    read_at,
                    created_at
                FROM notifications
                WHERE user_id = CAST(:user_id AS uuid) AND read = false
            """)
        
        query = text(str(query).replace('SELECT', 'SELECT', 1) + 
                    f" ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
        params.update({"limit": limit, "offset": offset})
        
        # Execute with proper query format
        base_query = """
            SELECT 
                notification_id,
                user_id,
                type,
                title,
                message,
                category,
                data,
                read,
                read_at,
                created_at
            FROM notifications
            WHERE user_id = CAST(:user_id AS uuid)
        """
        
        if unread_only:
            base_query += " AND read = false"
        
        base_query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        
        results = db.execute(text(base_query), params).fetchall()
        
        notifications = []
        for row in results:
            notifications.append({
                "notification_id": str(row.notification_id),
                "user_id": str(row.user_id),
                "type": row.type,
                "title": row.title,
                "message": row.message,
                "category": row.category,
                "data": row.data if row.data else {},
                "read": row.read,
                "read_at": row.read_at.isoformat() if row.read_at else None,
                "created_at": row.created_at.isoformat() if row.created_at else None
            })
        
        return notifications
    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notifications: {str(e)}"
        )

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread notification count for current user"""
    try:
        user_id = str(current_user["user_id"])
        
        # Check if notifications table exists using stored procedure
        try:
            table_exists = db.execute(
                text("SELECT check_notifications_table_exists()")
            ).fetchone()
            if not table_exists or not table_exists[0]:
                print("WARNING: notifications table does not exist. Return 0 count.")
                return {"count": 0, "table_exists": False}
        except Exception as table_check_error:
            print(f"Error checking notifications table: {str(table_check_error)}")
            return {"count": 0, "table_exists": False}
        
        # Get notification count using stored procedure
        result = db.execute(
            text("SELECT * FROM get_notification_count(CAST(:user_id AS uuid))"),
            {"user_id": user_id}
        ).fetchone()
        count = result.unread_count if result else 0
        total = result.total_count if result else 0
        
        print(f"Notification count - User: {user_id}, Unread: {count}, Total: {total}")
        
        return {"count": count}
    except Exception as e:
        print(f"Error fetching unread count: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unread count: {str(e)}"
        )

@router.put("/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        user_id = str(current_user["user_id"])
        
        # Verify notification belongs to user
        check_query = text("""
            SELECT notification_id, user_id
            FROM notifications
            WHERE notification_id = CAST(:notification_id AS uuid)
        """)
        
        notification = db.execute(check_query, {"notification_id": str(notification_id)}).fetchone()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        if str(notification.user_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this notification"
            )
        
        # Update notification using stored procedure
        db.execute(
            text("""
                SELECT mark_notification_as_read(
                    CAST(:notification_id AS uuid),
                    CAST(:user_id AS uuid)
                )
            """),
            {
                "notification_id": str(notification_id),
                "user_id": user_id
            }
        )
        db.commit()
        
        return {"message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error marking notification as read: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}"
        )

@router.put("/read-all", response_model=MessageResponse)
async def mark_all_notifications_as_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user"""
    try:
        user_id = str(current_user["user_id"])
        
        # Mark all notifications as read using stored procedure
        db.execute(
            text("SELECT mark_all_notifications_as_read(CAST(:user_id AS uuid))"),
            {"user_id": user_id}
        )
        db.commit()
        
        return {"message": "All notifications marked as read"}
    except Exception as e:
        db.rollback()
        print(f"Error marking all notifications as read: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all notifications as read: {str(e)}"
        )

@router.delete("/{notification_id}", response_model=MessageResponse)
async def delete_notification(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    try:
        user_id = str(current_user["user_id"])
        
        # Verify notification belongs to user
        check_query = text("""
            SELECT notification_id, user_id
            FROM notifications
            WHERE notification_id = CAST(:notification_id AS uuid)
        """)
        
        notification = db.execute(check_query, {"notification_id": str(notification_id)}).fetchone()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        if str(notification.user_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this notification"
            )
        
        # Delete notification
        delete_query = text("""
            DELETE FROM notifications
            WHERE notification_id = CAST(:notification_id AS uuid)
        """)
        
        db.execute(delete_query, {"notification_id": str(notification_id)})
        db.commit()
        
        return {"message": "Notification deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting notification: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}"
        )

