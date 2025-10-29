"""
Utility functions for creating notifications
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
from datetime import datetime
import json


def create_notification(
    db: Session,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    category: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None
) -> str:
    """Create a single notification for a user
    
    Note: This function does NOT commit the transaction.
    The caller must commit after calling this function.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    notification_id = str(uuid.uuid4())
    
    print(f"DEBUG: create_notification - ID: {notification_id}, User: {user_id}, Type: {notification_type}")
    
    # Check if notifications table exists
    try:
        table_check = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'notifications'
            )
        """)
        table_exists = db.execute(table_check).fetchone()
        if not table_exists or not table_exists[0]:
            error_msg = "ERROR: notifications table does not exist. Run database setup script."
            print(f"DEBUG: {error_msg}")
            logger.error(error_msg)
            raise ValueError(error_msg)
    except Exception as table_check_error:
        error_msg = f"Error checking notifications table: {str(table_check_error)}"
        print(f"DEBUG: {error_msg}")
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    query = text("""
        INSERT INTO notifications (
            notification_id, user_id, type, title, message, category, data, read, created_at
        ) VALUES (
            CAST(:notification_id AS uuid),
            CAST(:user_id AS uuid),
            :type,
            :title,
            :message,
            :category,
            CAST(:data AS jsonb),
            false,
            now()
        )
    """)
    
    try:
        print(f"DEBUG: Executing INSERT query with data: user_id={user_id}, type={notification_type}, title={title[:50]}")
        db.execute(query, {
            "notification_id": notification_id,
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "category": category,
            "data": json.dumps(data) if data else None
        })
        print(f"DEBUG: INSERT query executed successfully for notification {notification_id}")
        logger.info(f"Notification {notification_id} inserted successfully (awaiting commit)")
        return notification_id
    except Exception as e:
        error_msg = f"Error executing notification INSERT: {str(e)}"
        print(f"DEBUG: {error_msg}")
        logger.error(error_msg, exc_info=True)
        import traceback
        traceback.print_exc()
        raise


def create_notification_for_users(
    db: Session,
    user_ids: List[str],
    notification_type: str,
    title: str,
    message: str,
    category: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None
) -> List[str]:
    """Create notifications for multiple users"""
    notification_ids = []
    
    for user_id in user_ids:
        notification_id = create_notification(
            db, user_id, notification_type, title, message, category, data
        )
        notification_ids.append(notification_id)
    
    db.commit()
    return notification_ids


def notify_task_assigned(
    db: Session,
    task_id: str,
    assigned_to: str,
    task_title: str,
    land_id: Optional[str] = None,
    assigned_by: Optional[str] = None
):
    """Create notification when a task is assigned"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        print(f"DEBUG: notify_task_assigned called: task_id={task_id}, assigned_to={assigned_to}")
        logger.info(f"notify_task_assigned called: task_id={task_id}, assigned_to={assigned_to}, title={task_title}, land_id={land_id}, assigned_by={assigned_by}")
        
        # Verify user exists
        from sqlalchemy import text
        print(f"DEBUG: Checking if user {assigned_to} exists...")
        user_check = text("SELECT user_id FROM \"user\" WHERE user_id = CAST(:user_id AS uuid)")
        user_result = db.execute(user_check, {"user_id": assigned_to}).fetchone()
        
        if not user_result:
            print(f"DEBUG: ERROR - User {assigned_to} not found!")
            logger.error(f"Cannot create notification: User {assigned_to} not found")
            raise ValueError(f"User {assigned_to} not found")
        
        print(f"DEBUG: User {assigned_to} exists, creating notification...")
        title = f"New Task Assigned: {task_title}"
        message = f"You have been assigned a new task: {task_title}"
        if land_id:
            message += f". Click to view details."
        
        logger.info(f"Creating notification for user {assigned_to}: {title}")
        
        print(f"DEBUG: Calling create_notification...")
        notification_id = create_notification(
            db=db,
            user_id=assigned_to,
            notification_type="task_assigned",
            title=title,
            message=message,
            category="task",
            data={
                "task_id": task_id,
                "land_id": land_id,
                "assigned_by": assigned_by
            }
        )
        
        print(f"DEBUG: Notification created with ID {notification_id}, committing...")
        logger.info(f"Notification {notification_id} created, committing...")
        db.commit()
        print(f"DEBUG: Notification {notification_id} committed successfully")
        logger.info(f"Notification {notification_id} committed successfully")
        
    except Exception as e:
        logger.error(f"Error in notify_task_assigned: {str(e)}", exc_info=True)
        try:
            db.rollback()
        except:
            pass
        raise e


def notify_project_submitted(
    db: Session,
    land_id: str,
    project_title: str,
    landowner_id: str,
    admin_user_ids: List[str]
):
    """Create notifications when a project is submitted"""
    # Notify landowner
    create_notification(
        db=db,
        user_id=landowner_id,
        notification_type="project_submitted",
        title=f"Project Submitted: {project_title}",
        message=f"Your project '{project_title}' has been submitted for review.",
        category="project",
        data={"land_id": land_id, "project_title": project_title}
    )
    
    # Notify admins
    for admin_id in admin_user_ids:
        create_notification(
            db=db,
            user_id=admin_id,
            notification_type="project_uploaded",
            title=f"New Project Submitted: {project_title}",
            message=f"A new project '{project_title}' has been submitted and requires review.",
            category="project",
            data={"land_id": land_id, "project_title": project_title, "landowner_id": landowner_id}
        )
    
    db.commit()


def notify_document_uploaded(
    db: Session,
    document_id: str,
    land_id: str,
    document_type: str,
    uploaded_by: str,
    reviewer_ids: List[str],
    admin_user_ids: List[str]
):
    """Create notifications when a document is uploaded"""
    title = f"New Document Version: {document_type}"
    message = f"A new version of {document_type} has been uploaded"
    
    # Notify reviewers
    for reviewer_id in reviewer_ids:
        create_notification(
            db=db,
            user_id=reviewer_id,
            notification_type="document_version",
            title=title,
            message=f"{message} and requires your review.",
            category="document",
            data={
                "document_id": document_id,
                "land_id": land_id,
                "document_type": document_type,
                "uploaded_by": uploaded_by
            }
        )
    
    # Notify admins
    for admin_id in admin_user_ids:
        create_notification(
            db=db,
            user_id=admin_id,
            notification_type="document_uploaded",
            title=title,
            message=f"{message}.",
            category="document",
            data={
                "document_id": document_id,
                "land_id": land_id,
                "document_type": document_type,
                "uploaded_by": uploaded_by
            }
        )
    
    db.commit()


def notify_subtask_assigned(
    db: Session,
    subtask_id: str,
    task_id: str,
    subtask_title: str,
    assigned_to: str,
    land_id: Optional[str] = None
):
    """Create notification when a subtask is assigned (for collaboration)"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        print(f"DEBUG: notify_subtask_assigned called: subtask_id={subtask_id}, task_id={task_id}, assigned_to={assigned_to}")
        logger.info(f"notify_subtask_assigned called: subtask_id={subtask_id}, task_id={task_id}, title={subtask_title}, assigned_to={assigned_to}, land_id={land_id}")
        
        # Verify user exists
        from sqlalchemy import text
        print(f"DEBUG: Checking if user {assigned_to} exists...")
        user_check = text("SELECT user_id FROM \"user\" WHERE user_id = CAST(:user_id AS uuid)")
        user_result = db.execute(user_check, {"user_id": assigned_to}).fetchone()
        
        if not user_result:
            print(f"DEBUG: ERROR - User {assigned_to} not found!")
            logger.error(f"Cannot create notification: User {assigned_to} not found")
            raise ValueError(f"User {assigned_to} not found")
        
        print(f"DEBUG: User {assigned_to} exists, creating notification...")
        title = f"New Subtask Assigned: {subtask_title}"
        message = f"You have been assigned a new subtask: {subtask_title}"
        
        logger.info(f"Creating notification for user {assigned_to}: {title}")
        
        print(f"DEBUG: Calling create_notification...")
        notification_id = create_notification(
            db=db,
            user_id=assigned_to,
            notification_type="subtask_assigned",
            title=title,
            message=message,
            category="collaboration",
            data={
                "subtask_id": subtask_id,
                "task_id": task_id,
                "land_id": land_id
            }
        )
        
        print(f"DEBUG: Notification created with ID {notification_id}, committing...")
        logger.info(f"Notification {notification_id} created, committing...")
        db.commit()
        print(f"DEBUG: Notification {notification_id} committed successfully")
        logger.info(f"Notification {notification_id} committed successfully")
        
    except Exception as e:
        # Rollback notification transaction if it fails
        logger.error(f"Error in notify_subtask_assigned: {str(e)}", exc_info=True)
        try:
            db.rollback()
        except:
            pass
        raise e

