#!/usr/bin/env python3
"""
Database queries for the messaging system
"""
from sqlalchemy import text, func, desc, asc, and_, or_, case
from sqlalchemy.orm import Session
from models.messages import Message, MessageThread, MessageReaction
from models.users import User
from models.tasks import Task
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import uuid

class MessagingQueries:
    """Collection of database queries for the messaging system"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== MESSAGE QUERIES ====================
    
    def get_messages_for_task(self, task_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get messages for a specific task with sender information"""
        query = text("""
            SELECT 
                m.message_id,
                m.task_id,
                m.thread_id,
                m.sender_id,
                m.recipient_id,
                m.content,
                m.message_type,
                m.is_read,
                m.is_urgent,
                m.created_at,
                m.read_at,
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                s.email as sender_email,
                CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
                r.email as recipient_email,
                t.title as task_title
            FROM messages m
            LEFT JOIN "user" s ON m.sender_id = s.user_id
            LEFT JOIN "user" r ON m.recipient_id = r.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE m.task_id = :task_id
            ORDER BY m.created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = self.db.execute(query, {
            "task_id": task_id,
            "limit": limit,
            "offset": offset
        }).fetchall()
        
        return [dict(row._mapping) for row in result]
    
    def get_unread_messages_for_user(self, user_id: str) -> List[Dict]:
        """Get all unread messages for a specific user"""
        query = text("""
            SELECT 
                m.message_id,
                m.task_id,
                m.content,
                m.is_urgent,
                m.created_at,
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                t.title as task_title
            FROM messages m
            LEFT JOIN "user" s ON m.sender_id = s.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE (m.recipient_id = :user_id OR m.recipient_id IS NULL)
            AND m.is_read = FALSE
            AND m.sender_id != :user_id
            ORDER BY m.created_at DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in result]
    
    def get_message_count_by_task(self, task_id: str) -> Dict:
        """Get message statistics for a task"""
        query = text("""
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
                COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h
            FROM messages
            WHERE task_id = :task_id
        """)
        
        result = self.db.execute(query, {"task_id": task_id}).fetchone()
        return dict(result._mapping) if result else {}
    
    def get_recent_messages_for_user(self, user_id: str, hours: int = 24) -> List[Dict]:
        """Get recent messages for a user within specified hours"""
        query = text("""
            SELECT 
                m.message_id,
                m.task_id,
                m.content,
                m.is_urgent,
                m.created_at,
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                t.title as task_title,
                CASE 
                    WHEN m.sender_id = :user_id THEN 'sent'
                    ELSE 'received'
                END as message_direction
            FROM messages m
            LEFT JOIN "user" s ON m.sender_id = s.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE (m.sender_id = :user_id OR m.recipient_id = :user_id OR m.recipient_id IS NULL)
            AND m.created_at >= NOW() - INTERVAL ':hours hours'
            ORDER BY m.created_at DESC
        """)
        
        result = self.db.execute(query, {
            "user_id": user_id,
            "hours": hours
        }).fetchall()
        
        return [dict(row._mapping) for row in result]
    
    def search_messages(self, user_id: str, search_term: str, task_id: Optional[str] = None) -> List[Dict]:
        """Search messages by content"""
        base_query = """
            SELECT 
                m.message_id,
                m.task_id,
                m.content,
                m.is_urgent,
                m.created_at,
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                t.title as task_title
            FROM messages m
            LEFT JOIN "user" s ON m.sender_id = s.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE (m.sender_id = :user_id OR m.recipient_id = :user_id OR m.recipient_id IS NULL)
            AND m.content ILIKE :search_term
        """
        
        params = {
            "user_id": user_id,
            "search_term": f"%{search_term}%"
        }
        
        if task_id:
            base_query += " AND m.task_id = :task_id"
            params["task_id"] = task_id
        
        base_query += " ORDER BY m.created_at DESC"
        
        query = text(base_query)
        result = self.db.execute(query, params).fetchall()
        return [dict(row._mapping) for row in result]
    
    def get_urgent_messages_for_user(self, user_id: str) -> List[Dict]:
        """Get all urgent messages for a user"""
        query = text("""
            SELECT 
                m.message_id,
                m.task_id,
                m.content,
                m.created_at,
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                t.title as task_title
            FROM messages m
            LEFT JOIN "user" s ON m.sender_id = s.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE (m.recipient_id = :user_id OR m.recipient_id IS NULL)
            AND m.is_urgent = TRUE
            AND m.sender_id != :user_id
            ORDER BY m.created_at DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in result]
    
    # ==================== THREAD QUERIES ====================
    
    def get_threads_for_task(self, task_id: str) -> List[Dict]:
        """Get all message threads for a task"""
        query = text("""
            SELECT 
                mt.thread_id,
                mt.title,
                mt.is_active,
                mt.created_at,
                mt.updated_at,
                CONCAT(u.first_name, ' ', u.last_name) as creator_name,
                COUNT(m.message_id) as message_count,
                MAX(m.created_at) as last_message_at
            FROM message_threads mt
            LEFT JOIN "user" u ON mt.created_by = u.user_id
            LEFT JOIN messages m ON mt.thread_id = m.thread_id
            WHERE mt.task_id = :task_id
            GROUP BY mt.thread_id, mt.title, mt.is_active, mt.created_at, mt.updated_at, u.first_name, u.last_name
            ORDER BY mt.updated_at DESC
        """)
        
        result = self.db.execute(query, {"task_id": task_id}).fetchall()
        return [dict(row._mapping) for row in result]
    
    def get_messages_in_thread(self, thread_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get messages within a specific thread"""
        query = text("""
            SELECT 
                m.message_id,
                m.sender_id,
                m.recipient_id,
                m.content,
                m.message_type,
                m.is_read,
                m.is_urgent,
                m.created_at,
                m.read_at,
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                CONCAT(r.first_name, ' ', r.last_name) as recipient_name
            FROM messages m
            LEFT JOIN "user" s ON m.sender_id = s.user_id
            LEFT JOIN "user" r ON m.recipient_id = r.user_id
            WHERE m.thread_id = :thread_id
            ORDER BY m.created_at ASC
            LIMIT :limit OFFSET :offset
        """)
        
        result = self.db.execute(query, {
            "thread_id": thread_id,
            "limit": limit,
            "offset": offset
        }).fetchall()
        
        return [dict(row._mapping) for row in result]
    
    # ==================== USER ACTIVITY QUERIES ====================
    
    def get_user_message_stats(self, user_id: str) -> Dict:
        """Get message statistics for a user"""
        query = text("""
            SELECT 
                COUNT(CASE WHEN sender_id = :user_id THEN 1 END) as messages_sent,
                COUNT(CASE WHEN recipient_id = :user_id OR (recipient_id IS NULL AND sender_id != :user_id) THEN 1 END) as messages_received,
                COUNT(CASE WHEN is_urgent = TRUE AND sender_id = :user_id THEN 1 END) as urgent_sent,
                COUNT(CASE WHEN is_urgent = TRUE AND (recipient_id = :user_id OR (recipient_id IS NULL AND sender_id != :user_id)) THEN 1 END) as urgent_received,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' AND sender_id = :user_id THEN 1 END) as messages_sent_week,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' AND (recipient_id = :user_id OR (recipient_id IS NULL AND sender_id != :user_id)) THEN 1 END) as messages_received_week
            FROM messages
        """)
        
        result = self.db.execute(query, {"user_id": user_id}).fetchone()
        return dict(result._mapping) if result else {}
    
    def get_most_active_users(self, limit: int = 10) -> List[Dict]:
        """Get most active users by message count"""
        query = text("""
            SELECT 
                u.user_id,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email,
                COUNT(m.message_id) as message_count,
                COUNT(CASE WHEN m.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_week
            FROM user u
            LEFT JOIN messages m ON u.user_id = m.sender_id
            GROUP BY u.user_id, u.first_name, u.last_name, u.email
            ORDER BY message_count DESC
            LIMIT :limit
        """)
        
        result = self.db.execute(query, {"limit": limit}).fetchall()
        return [dict(row._mapping) for row in result]
    
    def get_user_tasks_with_messages(self, user_id: str) -> List[Dict]:
        """Get tasks that have messages for a user"""
        query = text("""
            SELECT DISTINCT
                t.task_id,
                t.title as task_title,
                t.status as task_status,
                COUNT(m.message_id) as message_count,
                MAX(m.created_at) as last_message_at,
                COUNT(CASE WHEN m.is_urgent = TRUE THEN 1 END) as urgent_count
            FROM tasks t
            LEFT JOIN messages m ON t.task_id = m.task_id
            WHERE (m.sender_id = :user_id OR m.recipient_id = :user_id OR m.recipient_id IS NULL)
            GROUP BY t.task_id, t.title, t.status
            HAVING COUNT(m.message_id) > 0
            ORDER BY last_message_at DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in result]
    
    # ==================== REACTION QUERIES ====================
    
    def get_message_reactions(self, message_id: str) -> List[Dict]:
        """Get reactions for a specific message"""
        query = text("""
            SELECT 
                mr.reaction_id,
                mr.reaction_type,
                mr.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as user_name
            FROM message_reactions mr
            LEFT JOIN "user" u ON mr.user_id = u.user_id
            WHERE mr.message_id = :message_id
            ORDER BY mr.created_at ASC
        """)
        
        result = self.db.execute(query, {"message_id": message_id}).fetchall()
        return [dict(row._mapping) for row in result]
    
    def get_reaction_summary(self, message_id: str) -> List[Dict]:
        """Get reaction summary for a message (count by type)"""
        query = text("""
            SELECT 
                reaction_type,
                COUNT(*) as count
            FROM message_reactions
            WHERE message_id = :message_id
            GROUP BY reaction_type
            ORDER BY count DESC
        """)
        
        result = self.db.execute(query, {"message_id": message_id}).fetchall()
        return [dict(row._mapping) for row in result]
    
    # ==================== ANALYTICS QUERIES ====================
    
    def get_messaging_analytics(self, days: int = 30) -> Dict:
        """Get messaging analytics for the last N days"""
        query = text("""
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
                COUNT(DISTINCT sender_id) as active_senders,
                COUNT(DISTINCT task_id) as tasks_with_messages,
                AVG(CASE WHEN read_at IS NOT NULL THEN EXTRACT(EPOCH FROM (read_at - created_at))/60 END) as avg_read_time_minutes,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as messages_today,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_week
            FROM messages
            WHERE created_at >= NOW() - INTERVAL ':days days'
        """)
        
        result = self.db.execute(query, {"days": days}).fetchone()
        return dict(result._mapping) if result else {}
    
    def get_daily_message_counts(self, days: int = 30) -> List[Dict]:
        """Get daily message counts for the last N days"""
        query = text("""
            SELECT 
                DATE(created_at) as message_date,
                COUNT(*) as message_count,
                COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_count
            FROM messages
            WHERE created_at >= NOW() - INTERVAL ':days days'
            GROUP BY DATE(created_at)
            ORDER BY message_date DESC
        """)
        
        result = self.db.execute(query, {"days": days}).fetchall()
        return [dict(row._mapping) for row in result]
    
    def get_task_message_activity(self, task_id: str) -> Dict:
        """Get message activity summary for a specific task"""
        query = text("""
            SELECT 
                COUNT(*) as total_messages,
                COUNT(DISTINCT sender_id) as unique_senders,
                COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
                MIN(created_at) as first_message,
                MAX(created_at) as last_message,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h
            FROM messages
            WHERE task_id = :task_id
        """)
        
        result = self.db.execute(query, {"task_id": task_id}).fetchone()
        return dict(result._mapping) if result else {}
    
    # ==================== CLEANUP QUERIES ====================
    
    def cleanup_old_messages(self, days: int = 90) -> int:
        """Delete messages older than specified days"""
        query = text("""
            DELETE FROM messages 
            WHERE created_at < NOW() - INTERVAL ':days days'
            AND message_type = 'system'
        """)
        
        result = self.db.execute(query, {"days": days})
        self.db.commit()
        return result.rowcount
    
    def get_conversation_between_users(self, user1_id: str, user2_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get conversation between two users"""
        try:
            query = text("""
                SELECT 
                    m.message_id,
                    m.task_id,
                    m.thread_id,
                    m.sender_id,
                    m.recipient_id,
                    m.content,
                    m.message_type,
                    m.is_read,
                    m.is_urgent,
                    m.created_at,
                    m.read_at,
                    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                    s.email as sender_email,
                    CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
                    r.email as recipient_email,
                    t.title as task_title
                FROM messages m
                LEFT JOIN "user" s ON m.sender_id = s.user_id
                LEFT JOIN "user" r ON m.recipient_id = r.user_id
                LEFT JOIN tasks t ON m.task_id = t.task_id
                WHERE (
                    (m.sender_id = :user1_id AND m.recipient_id = :user2_id) OR
                    (m.sender_id = :user2_id AND m.recipient_id = :user1_id)
                )
                ORDER BY m.created_at ASC
                LIMIT :limit OFFSET :offset
            """)
            
            result = self.db.execute(query, {
                "user1_id": user1_id,
                "user2_id": user2_id,
                "limit": limit,
                "offset": offset
            })
            
            messages = []
            for row in result:
                messages.append({
                    "message_id": str(row.message_id),
                    "task_id": str(row.task_id),
                    "thread_id": str(row.thread_id) if row.thread_id else None,
                    "sender_id": str(row.sender_id),
                    "recipient_id": str(row.recipient_id) if row.recipient_id else None,
                    "content": row.content,
                    "message_type": row.message_type,
                    "is_read": row.is_read,
                    "is_urgent": row.is_urgent,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "read_at": row.read_at.isoformat() if row.read_at else None,
                    "sender_name": row.sender_name,
                    "sender_email": row.sender_email,
                    "recipient_name": row.recipient_name,
                    "recipient_email": row.recipient_email,
                    "task_title": row.task_title
                })
            
            return messages
        except Exception as e:
            print(f"Error in get_conversation_between_users: {e}")
            return []
    
    def mark_messages_as_read(self, user_id: str, message_ids: List[str]) -> int:
        """Mark specific messages as read for a user"""
        if not message_ids:
            return 0
        
        query = text("""
            UPDATE messages 
            SET is_read = TRUE, read_at = NOW()
            WHERE message_id = ANY(:message_ids)
            AND (recipient_id = :user_id OR recipient_id IS NULL)
        """)
        
        result = self.db.execute(query, {
            "message_ids": message_ids,
            "user_id": user_id
        })
        self.db.commit()
        return result.rowcount
    
    def get_unread_count_for_user(self, user_id: str) -> int:
        """Get total unread message count for a user"""
        query = text("""
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE (recipient_id = :user_id OR recipient_id IS NULL)
            AND is_read = FALSE
            AND sender_id != :user_id
        """)
        
        result = self.db.execute(query, {"user_id": user_id}).fetchone()
        return result.unread_count if result else 0


# ==================== UTILITY FUNCTIONS ====================

def create_message_thread(db: Session, task_id: str, title: str, created_by: str) -> str:
    """Create a new message thread"""
    thread = MessageThread(
        task_id=uuid.UUID(task_id),
        title=title,
        created_by=uuid.UUID(created_by)
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return str(thread.thread_id)

def send_message(db: Session, task_id: str, sender_id: str, content: str, 
                recipient_id: Optional[str] = None, thread_id: Optional[str] = None,
                is_urgent: bool = False, message_type: str = 'text', land_id: Optional[str] = None) -> str:
    """Send a new message"""
    # If land_id is not provided, try to get it from the task
    if not land_id and task_id:
        from sqlalchemy import text
        try:
            result = db.execute(text("SELECT land_id FROM tasks WHERE task_id = :task_id"), {"task_id": task_id}).fetchone()
            if result:
                land_id = str(result.land_id)
        except Exception:
            pass
    
    # If still no land_id, use the task_id as land_id (for project-based messaging)
    if not land_id:
        land_id = task_id
    
    message = Message(
        land_id=uuid.UUID(land_id),
        task_id=None,  # No task_id for project-based messaging
        thread_id=uuid.UUID(thread_id) if thread_id else None,
        sender_id=uuid.UUID(sender_id),
        recipient_id=uuid.UUID(recipient_id) if recipient_id else uuid.UUID(sender_id),  # Default to sender if no recipient
        subject='',  # Default empty subject
        content=content,
        is_urgent=is_urgent,
        message_type=message_type
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return str(message.message_id)

def add_message_reaction(db: Session, message_id: str, user_id: str, reaction_type: str) -> str:
    """Add a reaction to a message"""
    reaction = MessageReaction(
        message_id=uuid.UUID(message_id),
        user_id=uuid.UUID(user_id),
        reaction_type=reaction_type
    )
    db.add(reaction)
    db.commit()
    db.refresh(reaction)
    return str(reaction.reaction_id)

def get_user_messaging_dashboard(db: Session, user_id: str) -> Dict:
    """Get comprehensive messaging dashboard data for a user"""
    queries = MessagingQueries(db)
    
    return {
        "unread_count": queries.get_unread_count_for_user(user_id),
        "unread_messages": queries.get_unread_messages_for_user(user_id),
        "urgent_messages": queries.get_urgent_messages_for_user(user_id),
        "recent_messages": queries.get_recent_messages_for_user(user_id, hours=24),
        "user_stats": queries.get_user_message_stats(user_id),
        "active_tasks": queries.get_user_tasks_with_messages(user_id)
    }
