#!/usr/bin/env python3
"""
Practical examples of messaging system database queries
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from messaging_queries import MessagingQueries
from database import get_db
import json
from typing import Dict, List

class MessagingQueryExamples:
    """Practical examples of how to use the messaging queries"""
    
    def __init__(self, db: Session):
        self.db = db
        self.queries = MessagingQueries(db)
    
    def example_get_user_dashboard(self, user_id: str) -> Dict:
        """Example: Get complete messaging dashboard for a user"""
        print(f"📊 Getting messaging dashboard for user: {user_id}")
        
        # Get unread count
        unread_count = self.queries.get_unread_count_for_user(user_id)
        print(f"   Unread messages: {unread_count}")
        
        # Get unread messages
        unread_messages = self.queries.get_unread_messages_for_user(user_id)
        print(f"   Unread messages details: {len(unread_messages)} messages")
        
        # Get urgent messages
        urgent_messages = self.queries.get_urgent_messages_for_user(user_id)
        print(f"   Urgent messages: {len(urgent_messages)} messages")
        
        # Get recent activity
        recent_messages = self.queries.get_recent_messages_for_user(user_id, hours=24)
        print(f"   Recent messages (24h): {len(recent_messages)} messages")
        
        # Get user statistics
        user_stats = self.queries.get_user_message_stats(user_id)
        print(f"   User stats: {user_stats}")
        
        # Get active tasks
        active_tasks = self.queries.get_user_tasks_with_messages(user_id)
        print(f"   Active tasks: {len(active_tasks)} tasks")
        
        return {
            "unread_count": unread_count,
            "unread_messages": unread_messages,
            "urgent_messages": urgent_messages,
            "recent_messages": recent_messages,
            "user_stats": user_stats,
            "active_tasks": active_tasks
        }
    
    def example_get_task_conversation(self, task_id: str) -> List[Dict]:
        """Example: Get complete conversation for a task"""
        print(f"💬 Getting conversation for task: {task_id}")
        
        # Get messages for the task
        messages = self.queries.get_messages_for_task(task_id, limit=100)
        print(f"   Found {len(messages)} messages")
        
        # Get message statistics
        stats = self.queries.get_message_count_by_task(task_id)
        print(f"   Task stats: {stats}")
        
        # Get threads for the task
        threads = self.queries.get_threads_for_task(task_id)
        print(f"   Threads: {len(threads)} threads")
        
        return {
            "messages": messages,
            "stats": stats,
            "threads": threads
        }
    
    def example_search_messages(self, user_id: str, search_term: str) -> List[Dict]:
        """Example: Search messages by content"""
        print(f"🔍 Searching messages for user {user_id} with term: '{search_term}'")
        
        # Search all messages
        results = self.queries.search_messages(user_id, search_term)
        print(f"   Found {len(results)} matching messages")
        
        # Search within specific task (if needed)
        # results = self.queries.search_messages(user_id, search_term, task_id="specific-task-id")
        
        return results
    
    def example_get_analytics(self, days: int = 30) -> Dict:
        """Example: Get messaging analytics"""
        print(f"📈 Getting messaging analytics for last {days} days")
        
        # Get overall analytics
        analytics = self.queries.get_messaging_analytics(days)
        print(f"   Analytics: {analytics}")
        
        # Get daily counts
        daily_counts = self.queries.get_daily_message_counts(days)
        print(f"   Daily counts: {len(daily_counts)} days of data")
        
        # Get most active users
        active_users = self.queries.get_most_active_users(limit=10)
        print(f"   Most active users: {len(active_users)} users")
        
        return {
            "analytics": analytics,
            "daily_counts": daily_counts,
            "active_users": active_users
        }
    
    def example_mark_messages_read(self, user_id: str, message_ids: List[str]) -> int:
        """Example: Mark messages as read"""
        print(f"✅ Marking {len(message_ids)} messages as read for user {user_id}")
        
        count = self.queries.mark_messages_as_read(user_id, message_ids)
        print(f"   Marked {count} messages as read")
        
        return count
    
    def example_get_message_reactions(self, message_id: str) -> Dict:
        """Example: Get reactions for a message"""
        print(f"👍 Getting reactions for message: {message_id}")
        
        # Get individual reactions
        reactions = self.queries.get_message_reactions(message_id)
        print(f"   Individual reactions: {len(reactions)} reactions")
        
        # Get reaction summary
        summary = self.queries.get_reaction_summary(message_id)
        print(f"   Reaction summary: {summary}")
        
        return {
            "reactions": reactions,
            "summary": summary
        }
    
    def example_get_task_activity(self, task_id: str) -> Dict:
        """Example: Get activity summary for a task"""
        print(f"📋 Getting activity for task: {task_id}")
        
        # Get task activity
        activity = self.queries.get_task_message_activity(task_id)
        print(f"   Task activity: {activity}")
        
        # Get messages for the task
        messages = self.queries.get_messages_for_task(task_id, limit=50)
        print(f"   Recent messages: {len(messages)} messages")
        
        return {
            "activity": activity,
            "messages": messages
        }
    
    def example_cleanup_old_messages(self, days: int = 90) -> int:
        """Example: Clean up old system messages"""
        print(f"🧹 Cleaning up messages older than {days} days")
        
        deleted_count = self.queries.cleanup_old_messages(days)
        print(f"   Deleted {deleted_count} old messages")
        
        return deleted_count

def run_examples():
    """Run all query examples"""
    print("🚀 Running Messaging Query Examples")
    print("=" * 50)
    
    # Get database session
    db = next(get_db())
    examples = MessagingQueryExamples(db)
    
    try:
        # Example 1: User dashboard
        print("\n1. User Dashboard Example")
        print("-" * 30)
        user_id = "your-user-id-here"  # Replace with actual user ID
        dashboard = examples.example_get_user_dashboard(user_id)
        
        # Example 2: Task conversation
        print("\n2. Task Conversation Example")
        print("-" * 30)
        task_id = "your-task-id-here"  # Replace with actual task ID
        conversation = examples.example_get_task_conversation(task_id)
        
        # Example 3: Search messages
        print("\n3. Search Messages Example")
        print("-" * 30)
        search_results = examples.example_search_messages(user_id, "urgent")
        
        # Example 4: Analytics
        print("\n4. Analytics Example")
        print("-" * 30)
        analytics = examples.example_get_analytics(30)
        
        # Example 5: Mark messages as read
        print("\n5. Mark Messages as Read Example")
        print("-" * 30)
        message_ids = ["message-id-1", "message-id-2"]  # Replace with actual message IDs
        read_count = examples.example_mark_messages_read(user_id, message_ids)
        
        # Example 6: Message reactions
        print("\n6. Message Reactions Example")
        print("-" * 30)
        message_id = "your-message-id-here"  # Replace with actual message ID
        reactions = examples.example_get_message_reactions(message_id)
        
        # Example 7: Task activity
        print("\n7. Task Activity Example")
        print("-" * 30)
        task_activity = examples.example_get_task_activity(task_id)
        
        # Example 8: Cleanup
        print("\n8. Cleanup Example")
        print("-" * 30)
        deleted_count = examples.example_cleanup_old_messages(90)
        
        print("\n✅ All examples completed successfully!")
        
    except Exception as e:
        print(f"❌ Error running examples: {e}")
    finally:
        db.close()

def get_common_queries():
    """Get commonly used query patterns"""
    return {
        "get_user_unread_count": """
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE (recipient_id = :user_id OR recipient_id IS NULL)
            AND is_read = FALSE
            AND sender_id != :user_id
        """,
        
        "get_task_messages": """
            SELECT m.*, 
                   CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                   CONCAT(r.first_name, ' ', r.last_name) as recipient_name
            FROM messages m
            LEFT JOIN user s ON m.sender_id = s.user_id
            LEFT JOIN user r ON m.recipient_id = r.user_id
            WHERE m.task_id = :task_id
            ORDER BY m.created_at DESC
            LIMIT :limit OFFSET :offset
        """,
        
        "get_user_recent_messages": """
            SELECT m.*, 
                   CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                   t.title as task_title
            FROM messages m
            LEFT JOIN user s ON m.sender_id = s.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE (m.sender_id = :user_id OR m.recipient_id = :user_id OR m.recipient_id IS NULL)
            AND m.created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY m.created_at DESC
        """,
        
        "get_urgent_messages": """
            SELECT m.*, 
                   CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                   t.title as task_title
            FROM messages m
            LEFT JOIN user s ON m.sender_id = s.user_id
            LEFT JOIN tasks t ON m.task_id = t.task_id
            WHERE (m.recipient_id = :user_id OR m.recipient_id IS NULL)
            AND m.is_urgent = TRUE
            AND m.sender_id != :user_id
            ORDER BY m.created_at DESC
        """,
        
        "mark_messages_read": """
            UPDATE messages 
            SET is_read = TRUE, read_at = NOW()
            WHERE message_id = ANY(:message_ids)
            AND (recipient_id = :user_id OR recipient_id IS NULL)
        """,
        
        "get_message_stats": """
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
                COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h
            FROM messages
            WHERE task_id = :task_id
        """
    }

if __name__ == "__main__":
    print("📚 Messaging Query Examples")
    print("=" * 40)
    print("\nThis script demonstrates how to use the messaging queries.")
    print("Update the user IDs and task IDs in the examples before running.")
    print("\nTo run examples:")
    print("python messaging_query_examples.py")
    print("\nTo get common query patterns:")
    print("queries = get_common_queries()")
    print("print(queries['get_user_unread_count'])")
