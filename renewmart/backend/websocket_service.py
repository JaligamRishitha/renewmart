import json
import asyncio
import logging
import time
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.messages import Message, MessageThread, MessageReaction
from models.users import User
from models.tasks import Task
from auth import get_current_user_websocket
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time messaging"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, WebSocket] = {}
        # Store user sessions by connection
        self.connection_sessions: Dict[WebSocket, Dict[str, Any]] = {}
        # Store task-specific connections
        self.task_connections: Dict[str, Set[str]] = {}  # task_id -> set of user_ids
        
    async def connect(self, websocket: WebSocket, user_id: str, user_info: Dict[str, Any]):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Store connection
        self.active_connections[user_id] = websocket
        self.connection_sessions[websocket] = {
            "user_id": user_id,
            "user_info": user_info,
            "connected_at": datetime.now(),
            "last_ping": datetime.now()
        }
        
        logger.info(f"User {user_id} connected to WebSocket")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "message": "Connected to messaging service",
            "timestamp": datetime.now().isoformat()
        }, user_id)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.connection_sessions:
            session = self.connection_sessions[websocket]
            user_id = session["user_id"]
            
            # Remove from active connections
            if user_id in self.active_connections:
                del self.active_connections[user_id]
            
            # Remove from task connections
            for task_id, user_set in self.task_connections.items():
                user_set.discard(user_id)
                if not user_set:  # Remove empty task sets
                    del self.task_connections[task_id]
            
            # Remove session
            del self.connection_sessions[websocket]
            
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                # Remove broken connection
                self.disconnect(websocket)
    
    async def send_to_task_participants(self, message: Dict[str, Any], task_id: str, exclude_user: Optional[str] = None):
        """Send a message to all participants of a specific task"""
        if task_id in self.task_connections:
            for user_id in self.task_connections[task_id]:
                if exclude_user and user_id == exclude_user:
                    continue
                await self.send_personal_message(message, user_id)
    
    async def broadcast_to_all(self, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast a message to all connected users"""
        for user_id in self.active_connections:
            if exclude_user and user_id == exclude_user:
                continue
            await self.send_personal_message(message, user_id)
    
    def join_task(self, user_id: str, task_id: str):
        """Add a user to a task's connection group"""
        if task_id not in self.task_connections:
            self.task_connections[task_id] = set()
        self.task_connections[task_id].add(user_id)
        logger.info(f"User {user_id} joined task {task_id}")
    
    def leave_task(self, user_id: str, task_id: str):
        """Remove a user from a task's connection group"""
        if task_id in self.task_connections:
            self.task_connections[task_id].discard(user_id)
            if not self.task_connections[task_id]:
                del self.task_connections[task_id]
        logger.info(f"User {user_id} left task {task_id}")
    
    async def ping_all_connections(self):
        """Ping all connections to check if they're alive"""
        dead_connections = []
        
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.ping()
            except Exception:
                dead_connections.append(websocket)
        
        # Remove dead connections
        for websocket in dead_connections:
            self.disconnect(websocket)


# Global connection manager instance
manager = ConnectionManager()


class MessageService:
    """Service for handling message operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_message(self, task_id: str, sender_id: str, content: str, 
                           recipient_id: Optional[str] = None, message_type: str = "text",
                           is_urgent: bool = False, thread_id: Optional[str] = None) -> Message:
        """Create a new message"""
        try:
            message = Message(
                task_id=uuid.UUID(task_id),
                thread_id=uuid.UUID(thread_id) if thread_id else None,
                sender_id=uuid.UUID(sender_id),
                recipient_id=uuid.UUID(recipient_id) if recipient_id else None,
                content=content,
                message_type=message_type,
                is_urgent=is_urgent
            )
            
            self.db.add(message)
            self.db.commit()
            self.db.refresh(message)
            
            logger.info(f"Message created: {message.message_id}")
            return message
            
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            self.db.rollback()
            raise
    
    async def get_messages_for_task(self, task_id: str, limit: int = 50, offset: int = 0) -> List[Message]:
        """Get messages for a specific task"""
        try:
            messages = self.db.query(Message)\
                .filter(Message.task_id == uuid.UUID(task_id))\
                .order_by(Message.created_at.desc())\
                .limit(limit)\
                .offset(offset)\
                .all()
            
            return messages
            
        except Exception as e:
            logger.error(f"Error fetching messages for task {task_id}: {e}")
            return []
    
    async def mark_message_as_read(self, message_id: str, user_id: str):
        """Mark a message as read"""
        try:
            message = self.db.query(Message).filter(
                Message.message_id == uuid.UUID(message_id),
                Message.recipient_id == uuid.UUID(user_id)
            ).first()
            
            if message:
                message.is_read = True
                message.read_at = datetime.now()
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
            self.db.rollback()
    
    async def create_thread(self, task_id: str, title: str, created_by: str) -> MessageThread:
        """Create a new message thread"""
        try:
            thread = MessageThread(
                task_id=uuid.UUID(task_id),
                title=title,
                created_by=uuid.UUID(created_by)
            )
            
            self.db.add(thread)
            self.db.commit()
            self.db.refresh(thread)
            
            return thread
            
        except Exception as e:
            logger.error(f"Error creating thread: {e}")
            self.db.rollback()
            raise


async def handle_websocket_connection(websocket: WebSocket, token: str):
    """Handle WebSocket connection and message processing"""
    db = next(get_db())
    user_info = None
    
    try:
        # Authenticate user
        user_info = await get_current_user_websocket(token)
        user_id = str(user_info["user_id"])
        
        # Connect user
        await manager.connect(websocket, user_id, user_info)
        
        # Join user to their assigned tasks
        tasks = db.query(Task).filter(Task.assigned_to == uuid.UUID(user_id)).all()
        for task in tasks:
            manager.join_task(user_id, str(task.task_id))
        
        # Main message handling loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle different message types
                await handle_message(db, user_id, message_data)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, user_id)
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Error processing message"
                }, user_id)
    
    except HTTPException as e:
        await websocket.close(code=4001, reason="Authentication failed")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=4000, reason="Connection error")
    finally:
        if websocket in manager.connection_sessions:
            manager.disconnect(websocket)
        db.close()


async def handle_message(db: Session, sender_id: str, message_data: Dict[str, Any]):
    """Handle incoming WebSocket messages"""
    message_service = MessageService(db)
    message_type = message_data.get("type")
    
    try:
        if message_type == "send_message":
            # Create and send a new message
            task_id = message_data.get("task_id")
            content = message_data.get("content")
            recipient_id = message_data.get("recipient_id")
            is_urgent = message_data.get("is_urgent", False)
            thread_id = message_data.get("thread_id")
            
            if not task_id or not content:
                return
            
            # Check if messages table exists
            try:
                db.execute(text("SELECT 1 FROM messages LIMIT 1"))
            except Exception:
                # Messages table doesn't exist, just broadcast without saving
                logger.warning("Messages table doesn't exist, broadcasting without persistence")
                # Get sender info
                sender = db.query(User).filter(User.user_id == uuid.UUID(sender_id)).first()
                
                # Prepare message for broadcasting (without persistence)
                broadcast_message = {
                    "type": "new_message",
                    "message": {
                        "message_id": f"temp-{int(time.time() * 1000)}",
                        "task_id": task_id,
                        "sender_id": sender_id,
                        "sender_name": f"{sender.first_name} {sender.last_name}" if sender else "Unknown",
                        "content": content,
                        "message_type": "text",
                        "is_urgent": is_urgent,
                        "created_at": datetime.now().isoformat(),
                        "thread_id": thread_id
                    }
                }
                
                # Send to task participants
                await manager.send_to_task_participants(
                    task_id, 
                    broadcast_message
                )
                return
            
            # Create message
            message = await message_service.create_message(
                task_id=task_id,
                sender_id=sender_id,
                content=content,
                recipient_id=recipient_id,
                is_urgent=is_urgent,
                thread_id=thread_id
            )
            
            # Get sender info
            sender = db.query(User).filter(User.user_id == uuid.UUID(sender_id)).first()
            
            # Prepare message for broadcasting
            broadcast_message = {
                "type": "new_message",
                "message": {
                    "message_id": str(message.message_id),
                    "task_id": str(message.task_id),
                    "sender_id": str(message.sender_id),
                    "sender_name": f"{sender.first_name} {sender.last_name}" if sender else "Unknown",
                    "content": message.content,
                    "message_type": message.message_type,
                    "is_urgent": message.is_urgent,
                    "created_at": message.created_at.isoformat(),
                    "thread_id": str(message.thread_id) if message.thread_id else None
                }
            }
            
            # Send to task participants
            await manager.send_to_task_participants(
                broadcast_message, 
                task_id, 
                exclude_user=sender_id
            )
            
            # Send confirmation to sender
            await manager.send_personal_message({
                "type": "message_sent",
                "message_id": str(message.message_id)
            }, sender_id)
        
        elif message_type == "join_task":
            # User wants to join a task's messaging
            task_id = message_data.get("task_id")
            if task_id:
                manager.join_task(sender_id, task_id)
                await manager.send_personal_message({
                    "type": "joined_task",
                    "task_id": task_id
                }, sender_id)
        
        elif message_type == "leave_task":
            # User wants to leave a task's messaging
            task_id = message_data.get("task_id")
            if task_id:
                manager.leave_task(sender_id, task_id)
                await manager.send_personal_message({
                    "type": "left_task",
                    "task_id": task_id
                }, sender_id)
        
        elif message_type == "mark_read":
            # Mark a message as read
            message_id = message_data.get("message_id")
            if message_id:
                await message_service.mark_message_as_read(message_id, sender_id)
        
        elif message_type == "get_messages":
            # Get messages for a task
            task_id = message_data.get("task_id")
            limit = message_data.get("limit", 50)
            offset = message_data.get("offset", 0)
            
            if task_id:
                messages = await message_service.get_messages_for_task(task_id, limit, offset)
                
                # Format messages for sending
                formatted_messages = []
                for msg in messages:
                    sender = db.query(User).filter(User.user_id == msg.sender_id).first()
                    formatted_messages.append({
                        "message_id": str(msg.message_id),
                        "task_id": str(msg.task_id),
                        "sender_id": str(msg.sender_id),
                        "sender_name": f"{sender.first_name} {sender.last_name}" if sender else "Unknown",
                        "content": msg.content,
                        "message_type": msg.message_type,
                        "is_urgent": msg.is_urgent,
                        "is_read": msg.is_read,
                        "created_at": msg.created_at.isoformat(),
                        "thread_id": str(msg.thread_id) if msg.thread_id else None
                    })
                
                await manager.send_personal_message({
                    "type": "messages_history",
                    "task_id": task_id,
                    "messages": formatted_messages
                }, sender_id)
        
        elif message_type == "ping":
            # Handle ping for connection health
            await manager.send_personal_message({
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            }, sender_id)
    
    except Exception as e:
        logger.error(f"Error handling message type {message_type}: {e}")
        await manager.send_personal_message({
            "type": "error",
            "message": f"Error processing {message_type} request"
        }, sender_id)
