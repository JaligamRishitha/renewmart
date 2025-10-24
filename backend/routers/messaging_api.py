"""
REST API endpoints for messaging system using the query classes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from messaging_queries import MessagingQueries, get_user_messaging_dashboard, send_message as create_message
from auth import get_current_user
from typing import List, Optional, Dict
from pydantic import BaseModel
import uuid

router = APIRouter()

# Pydantic models for request/response
class MessageResponse(BaseModel):
    message_id: str
    task_id: str
    thread_id: Optional[str]
    sender_id: str
    recipient_id: Optional[str]
    content: str
    message_type: str
    is_read: bool
    is_urgent: bool
    created_at: str
    read_at: Optional[str]
    sender_name: Optional[str]
    recipient_name: Optional[str]
    task_title: Optional[str]

class SendMessageRequest(BaseModel):
    task_id: str
    content: str
    recipient_id: Optional[str] = None
    thread_id: Optional[str] = None
    is_urgent: bool = False
    message_type: str = "text"

class MessageStats(BaseModel):
    total_messages: int
    urgent_messages: int
    unread_messages: int
    messages_last_24h: int

class UserStats(BaseModel):
    messages_sent: int
    messages_received: int
    urgent_sent: int
    urgent_received: int
    messages_sent_week: int
    messages_received_week: int

class DashboardResponse(BaseModel):
    unread_count: int
    unread_messages: List[MessageResponse]
    urgent_messages: List[MessageResponse]
    recent_messages: List[MessageResponse]
    user_stats: UserStats
    active_tasks: List[Dict]

# ==================== MESSAGE ENDPOINTS ====================

@router.post("/messages/send", response_model=MessageResponse)
async def send_message(
    message_request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a new message"""
    try:
        # Create the message
        message_id = create_message(
            db=db,
            task_id=message_request.task_id,
            sender_id=current_user["user_id"],
            content=message_request.content,
            recipient_id=message_request.recipient_id,
            thread_id=message_request.thread_id,
            is_urgent=message_request.is_urgent,
            message_type=message_request.message_type
        )
        
        # Get the created message with full details
        queries = MessagingQueries(db)
        messages = queries.get_messages_for_task(message_request.task_id, limit=1, offset=0)
        
        if messages:
            return messages[0]
        else:
            raise HTTPException(status_code=500, detail="Message created but could not retrieve details")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@router.post("/messages/send-simple")
async def send_message_simple(
    message_request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a new message (simple response)"""
    try:
        # Create the message
        message_id = create_message(
            db=db,
            task_id=message_request.task_id,
            sender_id=current_user["user_id"],
            content=message_request.content,
            recipient_id=message_request.recipient_id,
            thread_id=message_request.thread_id,
            is_urgent=message_request.is_urgent,
            message_type=message_request.message_type
        )
        
        return {
            "message_id": message_id,
            "status": "sent",
            "task_id": message_request.task_id,
            "content": message_request.content,
            "sender_id": current_user["user_id"],
            "recipient_id": message_request.recipient_id,
            "is_urgent": message_request.is_urgent
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@router.get("/messages/task/{task_id}", response_model=List[MessageResponse])
async def get_task_messages(
    task_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a specific task"""
    try:
        queries = MessagingQueries(db)
        messages = queries.get_messages_for_task(task_id, limit, offset)
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")

@router.get("/messages/unread", response_model=List[MessageResponse])
async def get_unread_messages(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread messages for current user"""
    try:
        queries = MessagingQueries(db)
        messages = queries.get_unread_messages_for_user(current_user["user_id"])
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unread messages: {str(e)}")

@router.get("/messages/urgent", response_model=List[MessageResponse])
async def get_urgent_messages(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get urgent messages for current user"""
    try:
        queries = MessagingQueries(db)
        messages = queries.get_urgent_messages_for_user(current_user["user_id"])
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching urgent messages: {str(e)}")

@router.get("/messages/recent", response_model=List[MessageResponse])
async def get_recent_messages(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent messages for current user"""
    try:
        queries = MessagingQueries(db)
        messages = queries.get_recent_messages_for_user(current_user["user_id"], hours)
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent messages: {str(e)}")

@router.get("/messages/search", response_model=List[MessageResponse])
async def search_messages(
    q: str = Query(..., min_length=1),
    task_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search messages by content"""
    try:
        queries = MessagingQueries(db)
        messages = queries.search_messages(current_user["user_id"], q, task_id)
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching messages: {str(e)}")

# ==================== STATISTICS ENDPOINTS ====================

@router.get("/messages/stats/task/{task_id}", response_model=MessageStats)
async def get_task_message_stats(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get message statistics for a task"""
    try:
        queries = MessagingQueries(db)
        stats = queries.get_message_count_by_task(task_id)
        return MessageStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching task stats: {str(e)}")

@router.get("/messages/stats/user", response_model=UserStats)
async def get_user_message_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get message statistics for current user"""
    try:
        queries = MessagingQueries(db)
        stats = queries.get_user_message_stats(current_user["user_id"])
        return UserStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user stats: {str(e)}")

@router.get("/messages/stats/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread message count for current user"""
    try:
        queries = MessagingQueries(db)
        count = queries.get_unread_count_for_user(current_user["user_id"])
        return {"unread_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unread count: {str(e)}")

# ==================== DASHBOARD ENDPOINTS ====================

@router.get("/dashboard", response_model=DashboardResponse)
async def get_messaging_dashboard(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete messaging dashboard for current user"""
    try:
        dashboard_data = get_user_messaging_dashboard(db, current_user["user_id"])
        return DashboardResponse(**dashboard_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard: {str(e)}")

# ==================== THREAD ENDPOINTS ====================

@router.get("/threads/task/{task_id}")
async def get_task_threads(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get message threads for a task"""
    try:
        queries = MessagingQueries(db)
        threads = queries.get_threads_for_task(task_id)
        return threads
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching threads: {str(e)}")

@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
async def get_thread_messages(
    thread_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages within a specific thread"""
    try:
        queries = MessagingQueries(db)
        messages = queries.get_messages_in_thread(thread_id, limit, offset)
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching thread messages: {str(e)}")

# ==================== REACTION ENDPOINTS ====================

@router.get("/messages/{message_id}/reactions")
async def get_message_reactions(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reactions for a specific message"""
    try:
        queries = MessagingQueries(db)
        reactions = queries.get_message_reactions(message_id)
        return reactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reactions: {str(e)}")

@router.get("/messages/{message_id}/reactions/summary")
async def get_message_reaction_summary(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reaction summary for a message"""
    try:
        queries = MessagingQueries(db)
        summary = queries.get_reaction_summary(message_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reaction summary: {str(e)}")

# ==================== ACTION ENDPOINTS ====================

@router.post("/messages/mark-read")
async def mark_messages_as_read(
    message_ids: List[str],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark specific messages as read"""
    try:
        queries = MessagingQueries(db)
        count = queries.mark_messages_as_read(current_user["user_id"], message_ids)
        return {"marked_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking messages as read: {str(e)}")

# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/overview")
async def get_messaging_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messaging analytics overview"""
    try:
        queries = MessagingQueries(db)
        analytics = queries.get_messaging_analytics(days)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")

@router.get("/analytics/daily")
async def get_daily_message_counts(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily message counts"""
    try:
        queries = MessagingQueries(db)
        daily_counts = queries.get_daily_message_counts(days)
        return daily_counts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching daily counts: {str(e)}")

@router.get("/analytics/active-users")
async def get_active_users(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get most active users"""
    try:
        queries = MessagingQueries(db)
        active_users = queries.get_most_active_users(limit)
        return active_users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching active users: {str(e)}")

# ==================== USER ACTIVITY ENDPOINTS ====================

@router.get("/user/tasks")
async def get_user_tasks_with_messages(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks that have messages for current user"""
    try:
        queries = MessagingQueries(db)
        tasks = queries.get_user_tasks_with_messages(current_user["user_id"])
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user tasks: {str(e)}")

@router.get("/project/{land_id}/participants")
async def get_project_participants(
    land_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all participants associated with a project (land)"""
    try:
        # Get users who are assigned to tasks for this specific land/project
        # Including admin users and landowner as default team members
        query = text("""
            WITH project_landowner AS (
                SELECT l.landowner_id
                FROM lands l
                WHERE l.land_id = :land_id
            ),
            project_admin AS (
                SELECT DISTINCT t.created_by as admin_id
                FROM tasks t
                WHERE t.land_id = :land_id
                AND t.created_by IN (
                    SELECT u.user_id
                    FROM "user" u
                    INNER JOIN user_roles ur ON u.user_id = ur.user_id
                    WHERE ur.role_key = 'administrator'
                    AND u.is_active = true
                )
                LIMIT 1
            ),
            directly_assigned_users AS (
                SELECT DISTINCT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.is_active,
                    ur.role_key,
                    t.assigned_to,
                    t.assigned_role
                FROM "user" u
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
                INNER JOIN tasks t ON t.land_id = :land_id
                WHERE u.is_active = true
                AND t.assigned_to = u.user_id  -- Only directly assigned users
            )
            SELECT DISTINCT
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.is_active,
                ur.role_key,
                COALESCE(dau.assigned_to, NULL) as assigned_to,
                COALESCE(dau.assigned_role, NULL) as assigned_role,
                CASE 
                    WHEN u.user_id = pl.landowner_id THEN 'landowner'
                    WHEN u.user_id = pa.admin_id THEN 'admin'
                    WHEN u.user_id = :current_user_id THEN 'current_user'
                    WHEN dau.user_id IS NOT NULL THEN 'directly_assigned'
                    ELSE 'other'
                END as participation_type,
                CASE 
                    WHEN u.user_id = pl.landowner_id THEN 1  -- Landowner first
                    WHEN u.user_id = pa.admin_id THEN 2      -- Project admin second
                    WHEN u.user_id = :current_user_id THEN 3  -- Current user third
                    ELSE 4                                    -- Other participants last
                END as sort_order
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            LEFT JOIN project_landowner pl ON u.user_id = pl.landowner_id
            LEFT JOIN project_admin pa ON u.user_id = pa.admin_id
            LEFT JOIN directly_assigned_users dau ON u.user_id = dau.user_id
            WHERE u.is_active = true
            AND (
                u.user_id = pl.landowner_id  -- Include landowner
                OR u.user_id = pa.admin_id   -- Include project admin
                OR u.user_id = :current_user_id  -- Include current user
                OR dau.user_id IS NOT NULL   -- Include directly assigned users only
            )
            ORDER BY sort_order, u.first_name, u.last_name
        """)
        
        result = db.execute(query, {
            "land_id": land_id,
            "current_user_id": current_user["user_id"]
        }).fetchall()
        
        participants = []
        seen_users = set()
        
        for row in result:
            user_id = str(row.user_id)
            if user_id not in seen_users:
                seen_users.add(user_id)
                
                # Determine role display name
                role_display = row.role_key or "User"
                if row.participation_type == 'landowner':
                    role_display = "Landowner"
                elif row.participation_type == 'admin':
                    role_display = "Administrator"
                
                participants.append({
                    "user_id": user_id,
                    "name": f"{row.first_name} {row.last_name}",
                    "email": row.email,
                    "role": role_display,
                    "is_active": row.is_active,
                    "participation_type": row.participation_type,
                    "avatar": f"{row.first_name[0]}{row.last_name[0]}".upper(),
                    "status": "online",
                    "last_seen": "Unknown",
                    "unreadCount": 0
                })
        
        return participants
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching participants: {str(e)}")

@router.get("/conversations/{user_id}")
async def get_conversation_with_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation between current user and another user"""
    try:
        # Check if messages table exists
        try:
            db.execute(text("SELECT 1 FROM messages LIMIT 1"))
        except Exception:
            # Messages table doesn't exist, return empty array
            return []
        
        queries = MessagingQueries(db)
        # Get messages between current user and the specified user
        messages = queries.get_conversation_between_users(current_user["user_id"], user_id)
        return messages
    except Exception as e:
        print(f"Error fetching conversation: {str(e)}")
        # Return empty array instead of error to allow frontend to work
        return []

@router.get("/user/activity")
async def get_user_activity(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity for current user"""
    try:
        queries = MessagingQueries(db)
        activity = queries.get_recent_messages_for_user(current_user["user_id"], hours)
        return activity
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user activity: {str(e)}")

# ==================== MAINTENANCE ENDPOINTS ====================

@router.delete("/messages/cleanup")
async def cleanup_old_messages(
    days: int = Query(90, ge=30, le=365),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clean up old system messages (admin only)"""
    # Check if user is admin
    if "administrator" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        queries = MessagingQueries(db)
        deleted_count = queries.cleanup_old_messages(days)
        return {"deleted_count": deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up messages: {str(e)}")
