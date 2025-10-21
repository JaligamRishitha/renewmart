from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import uuid

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskHistoryResponse,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    MessageResponse
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Helper functions
async def create_default_subtasks_for_task(task_id: str, assigned_role: str, created_by: str, db: Session):
    """Helper function to create default subtasks for a task based on the assigned role."""
    # Get default subtask templates
    default_subtasks = {
        "re_sales_advisor": [
            {"title": "Location accessibility and infrastructure", "section": "Market Viability", "order": 0},
            {"title": "Proximity to transmission lines", "section": "Market Viability", "order": 1},
            {"title": "Local energy demand assessment", "section": "Market Viability", "order": 2},
            {"title": "Competition analysis in the region", "section": "Market Viability", "order": 3},
            {"title": "Market price competitiveness", "section": "Market Viability", "order": 4},
            {"title": "Revenue projection accuracy", "section": "Commercial Feasibility", "order": 5},
            {"title": "Contract terms evaluation", "section": "Commercial Feasibility", "order": 6},
            {"title": "Risk assessment completeness", "section": "Commercial Feasibility", "order": 7},
            {"title": "ROI calculations verification", "section": "Commercial Feasibility", "order": 8},
            {"title": "Market timing considerations", "section": "Commercial Feasibility", "order": 9}
        ],
        "re_analyst": [
            {"title": "Land suitability for renewable energy", "section": "Technical Analysis", "order": 0},
            {"title": "Topographical survey accuracy", "section": "Technical Analysis", "order": 1},
            {"title": "Grid connectivity feasibility", "section": "Technical Analysis", "order": 2},
            {"title": "Environmental impact assessment", "section": "Technical Analysis", "order": 3},
            {"title": "Technical specifications compliance", "section": "Technical Analysis", "order": 4},
            {"title": "Financial model accuracy", "section": "Financial Analysis", "order": 5},
            {"title": "Cost estimation validation", "section": "Financial Analysis", "order": 6},
            {"title": "Revenue projections review", "section": "Financial Analysis", "order": 7},
            {"title": "Cash flow analysis", "section": "Financial Analysis", "order": 8},
            {"title": "Financing structure evaluation", "section": "Financial Analysis", "order": 9}
        ],
        "re_governance_lead": [
            {"title": "Land ownership documentation", "section": "Legal Compliance", "order": 0},
            {"title": "Zoning and permits verification", "section": "Legal Compliance", "order": 1},
            {"title": "Environmental clearances", "section": "Legal Compliance", "order": 2},
            {"title": "Government NOC validation", "section": "Legal Compliance", "order": 3},
            {"title": "Legal title verification", "section": "Legal Compliance", "order": 4},
            {"title": "Industry standards compliance", "section": "Regulatory Requirements", "order": 5},
            {"title": "Safety regulations adherence", "section": "Regulatory Requirements", "order": 6},
            {"title": "Environmental regulations", "section": "Regulatory Requirements", "order": 7},
            {"title": "Local authority approvals", "section": "Regulatory Requirements", "order": 8},
            {"title": "Regulatory timeline compliance", "section": "Regulatory Requirements", "order": 9}
        ]
    }
    
    templates = default_subtasks.get(assigned_role, [])
    
    if not templates:
        print(f"No default subtasks found for role: {assigned_role}")
        return
    
    # Create subtasks in bulk
    for template in templates:
        try:
            subtask_id = uuid.uuid4()
            insert_query = text("""
                INSERT INTO subtasks (
                    subtask_id, task_id, title, description, status,
                    created_by, order_index
                ) VALUES (
                    CAST(:subtask_id AS uuid), CAST(:task_id AS uuid), :title, :description, :status,
                    CAST(:created_by AS uuid), :order_index
                )
            """)
            
            db.execute(insert_query, {
                "subtask_id": str(subtask_id),
                "task_id": task_id,
                "title": template["title"],
                "description": f"{template['section']} - {template['title']}",
                "status": "pending",
                "created_by": created_by,
                "order_index": template["order"]
            })
        except Exception as e:
            print(f"Error creating subtask {template['title']}: {str(e)}")
            # Continue with other subtasks even if one fails
            continue
    
    db.commit()
    print(f"Created {len(templates)} default subtasks for task {task_id}")

def can_access_task(user_roles: List[str], user_id: str, task_data: dict) -> bool:
    """Check if user can access a task"""
    # Admin can access all tasks
    if "administrator" in user_roles:
        return True
    
    # Task creator can access
    if str(task_data.get("assigned_by")) == user_id:
        return True
    
    # Assigned user can access their tasks
    if task_data.get("assigned_to") and str(task_data.get("assigned_to")) == user_id:
        return True
    
    # Land owner can access tasks for their land
    if str(task_data.get("landowner_id")) == user_id:
        return True
    
    return False

def can_manage_task(user_roles: List[str], user_id: str, task_data: dict) -> bool:
    """Check if user can manage (create/update/delete) a task"""
    # Admin can manage all tasks
    if "administrator" in user_roles:
        return True
    
    # Task creator can manage
    if str(task_data.get("assigned_by")) == user_id:
        return True
    
    # Land owner can manage tasks for their land
    if str(task_data.get("landowner_id")) == user_id:
        return True
    
    return False

# Task endpoints
@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task (admin or land owner only)."""
    # Check if land exists and user has permission
    land_check = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    
    land_result = db.execute(land_check, {"land_id": str(task_data.land_id)}).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Land not found"
        )
    
    user_roles = current_user.get("roles", [])
    if ("administrator" not in user_roles and 
        str(land_result.landowner_id) != current_user["user_id"]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create tasks for this land"
        )
    
    # Validate assigned_to user if provided
    if task_data.assigned_to:
        user_check = text("SELECT user_id FROM \"user\" WHERE user_id = :user_id")
        user_result = db.execute(user_check, {"user_id": str(task_data.assigned_to)}).fetchone()
        
        if not user_result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Assigned user not found"
            )
    
    try:
        # Generate new task ID
        task_id = str(uuid.uuid4())
        
        # Direct INSERT into tasks table (matching actual schema)
        insert_query = text("""
            INSERT INTO tasks (
                task_id, land_id, title, description,
                assigned_to, assigned_role, created_by, status, priority,
                due_date, created_at, updated_at
            ) VALUES (
                :task_id, :land_id, :title, :description,
                :assigned_to, :assigned_role, :created_by, 'pending', :priority,
                :due_date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """)
        
        db.execute(insert_query, {
            "task_id": task_id,
            "land_id": str(task_data.land_id),
            "title": task_data.task_type.replace('_', ' ').title(),  # Convert task_type to title
            "description": task_data.description,
            "assigned_to": str(task_data.assigned_to) if task_data.assigned_to else None,
            "assigned_role": task_data.assigned_role,
            "created_by": str(current_user["user_id"]),
            "priority": task_data.priority or "medium",
            "due_date": task_data.due_date
        })
        
        db.commit()
        
        # Auto-create default subtasks if task has assigned_role
        if task_data.assigned_role:
            await create_default_subtasks_for_task(task_id, task_data.assigned_role, str(current_user["user_id"]), db)
        
        # Fetch the created task
        return await get_task(UUID(task_id), current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    land_id: Optional[UUID] = None,
    assigned_to: Optional[UUID] = None,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks with optional filters."""
    user_roles = current_user.get("roles", [])
    
    # Build base query (matching actual schema)
    base_query = """
        SELECT t.task_id, t.land_id, t.title as task_type, t.description,
               t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
               t.assigned_role, t.start_date, t.end_date, t.due_date,
               t.completion_notes, t.created_at, t.updated_at,
               l.title as land_title, l.landowner_id,
               u1.first_name || ' ' || u1.last_name as assigned_to_name,
               u2.first_name || ' ' || u2.last_name as assigned_by_name
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
        LEFT JOIN "user" u2 ON t.created_by = u2.user_id
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    # Add filters
    if land_id:
        base_query += " AND t.land_id = :land_id"
        params["land_id"] = str(land_id)
    
    if assigned_to:
        base_query += " AND t.assigned_to = :assigned_to"
        params["assigned_to"] = str(assigned_to)
    
    if status:
        base_query += " AND t.status = :status"
        params["status"] = status
    
    if task_type:
        base_query += " AND t.task_type = :task_type"
        params["task_type"] = task_type
    
    # Add permission filter for non-admin users
    if "administrator" not in user_roles:
        base_query += """
            AND (t.assigned_to = :user_id 
                 OR t.created_by = :user_id 
                 OR l.landowner_id = :user_id)
        """
        params["user_id"] = current_user["user_id"]
    
    base_query += " ORDER BY t.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    return [
        TaskResponse(
            task_id=row.task_id,
            land_id=row.land_id,
            task_type=row.task_type,
            description=row.description,
            assigned_to=row.assigned_to,
            assigned_by=row.assigned_by,
            status=row.status,
            priority=row.priority,
            due_date=row.due_date,
            completion_notes=row.completion_notes,
            created_at=row.created_at,
            updated_at=row.updated_at,
            land_title=row.land_title,
            assigned_to_name=row.assigned_to_name,
            assigned_by_name=row.assigned_by_name
        )
        for row in results
    ]

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task by ID."""
    query = text("""
        SELECT t.task_id, t.land_id, t.title as task_type, t.description,
               t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
               t.due_date, t.completion_notes, t.created_at, t.updated_at,
               l.title as land_title, l.landowner_id,
               u1.first_name || ' ' || u1.last_name as assigned_to_name,
               u2.first_name || ' ' || u2.last_name as assigned_by_name
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
        LEFT JOIN "user" u2 ON t.created_by = u2.user_id
        WHERE t.task_id = :task_id
    """)
    
    result = db.execute(query, {"task_id": str(task_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions
    user_roles = current_user.get("roles", [])
    task_data = {
        "assigned_by": result.assigned_by,
        "assigned_to": result.assigned_to,
        "landowner_id": result.landowner_id
    }
    
    if not can_access_task(user_roles, current_user["user_id"], task_data):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this task"
        )
    
    return TaskResponse(
        task_id=result.task_id,
        land_id=result.land_id,
        task_type=result.task_type,
        description=result.description,
        assigned_to=result.assigned_to,
        assigned_by=result.assigned_by,
        status=result.status,
        priority=result.priority,
        due_date=result.due_date,
        completion_notes=result.completion_notes,
        created_at=result.created_at,
        updated_at=result.updated_at,
        land_title=result.land_title,
        assigned_to_name=result.assigned_to_name,
        assigned_by_name=result.assigned_by_name
    )

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_update: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update task (assigned user, creator, or admin only)."""
    # Check if task exists and user has permission
    task_check = text("""
        SELECT t.assigned_to, t.created_by as assigned_by, t.status as current_status, l.landowner_id
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        WHERE t.task_id = :task_id
    """)
    
    task_result = db.execute(task_check, {"task_id": str(task_id)}).fetchone()
    
    if not task_result:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    user_roles = current_user.get("roles", [])
    task_data = {
        "assigned_by": task_result.assigned_by,
        "assigned_to": task_result.assigned_to,
        "landowner_id": task_result.landowner_id
    }
    
    # Check if user can update task (assigned user can only update status and completion_notes)
    can_full_update = can_manage_task(user_roles, current_user["user_id"], task_data)
    can_status_update = (str(task_result.assigned_to) == current_user["user_id"] if task_result.assigned_to else False)
    
    if not (can_full_update or can_status_update):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this task"
        )
    
    # Validate assigned_to user if provided
    if task_update.assigned_to:
        user_check = text("SELECT user_id FROM \"user\" WHERE user_id = :user_id")
        user_result = db.execute(user_check, {"user_id": str(task_update.assigned_to)}).fetchone()
        
        if not user_result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Assigned user not found"
            )
    
    try:
        # If status is being updated, update it and create history entry
        if task_update.status and task_update.status != task_result.current_status:
            # Update task status
            status_update = text("""
                UPDATE tasks 
                SET status = :new_status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE task_id = :task_id
            """)
            
            db.execute(status_update, {
                "task_id": str(task_id),
                "new_status": task_update.status
            })
            
            # Create task history entry
            history_insert = text("""
                INSERT INTO task_history (
                    history_id, task_id, from_status, to_status,
                    changed_by, note, changed_at
                ) VALUES (
                    :history_id, :task_id, :from_status, :to_status,
                    :changed_by, :note, CURRENT_TIMESTAMP
                )
            """)
            
            db.execute(history_insert, {
                "history_id": str(uuid.uuid4()),
                "task_id": str(task_id),
                "from_status": task_result.current_status,
                "to_status": task_update.status,
                "changed_by": str(current_user["user_id"]),
                "note": "Status updated"
            })
        
        # Build dynamic update query for other fields
        update_fields = []
        params = {"task_id": str(task_id)}
        
        update_data = task_update.dict(exclude_unset=True, exclude={"status"})
        
        # Map frontend field names to database column names
        field_mapping = {
            "task_type": "title"
        }
        
        for field, value in update_data.items():
            if can_full_update:
                db_field = field_mapping.get(field, field)  # Use mapping or keep original
                
                if field == "assigned_to" and value:
                    update_fields.append(f"{db_field} = :{field}")
                    params[field] = str(value)
                elif field in ["task_type", "description", "due_date", "priority"]:
                    update_fields.append(f"{db_field} = :{field}")
                    params[field] = value
        
        if update_fields:
            update_query = text(f"""
                UPDATE tasks 
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE task_id = :task_id
            """)
            
            db.execute(update_query, params)
        
        db.commit()
        
        return await get_task(task_id, current_user, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )

@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete task (creator or admin only)."""
    # Check if task exists and user has permission
    task_check = text("""
        SELECT t.created_by as assigned_by, l.landowner_id
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        WHERE t.task_id = :task_id
    """)
    
    task_result = db.execute(task_check, {"task_id": str(task_id)}).fetchone()
    
    if not task_result:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    user_roles = current_user.get("roles", [])
    task_data = {
        "assigned_by": task_result.assigned_by,
        "landowner_id": task_result.landowner_id
    }
    
    if not can_manage_task(user_roles, current_user["user_id"], task_data):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this task"
        )
    
    try:
        # Delete task history first (foreign key constraint)
        delete_history = text("DELETE FROM task_history WHERE task_id = :task_id")
        db.execute(delete_history, {"task_id": str(task_id)})
        
        # Delete task
        delete_task_query = text("DELETE FROM tasks WHERE task_id = :task_id")
        db.execute(delete_task_query, {"task_id": str(task_id)})
        
        db.commit()
        
        return MessageResponse(message="Task deleted successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )

@router.get("/{task_id}/history", response_model=List[TaskHistoryResponse])
async def get_task_history(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task history."""
    # Check if task exists and user has permission
    task_check = text("""
        SELECT t.assigned_to, t.created_by as assigned_by, l.landowner_id
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        WHERE t.task_id = :task_id
    """)
    
    task_result = db.execute(task_check, {"task_id": str(task_id)}).fetchone()
    
    if not task_result:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    user_roles = current_user.get("roles", [])
    task_data = {
        "assigned_by": task_result.assigned_by,
        "assigned_to": task_result.assigned_to,
        "landowner_id": task_result.landowner_id
    }
    
    if not can_access_task(user_roles, current_user["user_id"], task_data):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view task history"
        )
    
    # Get task history
    history_query = text("""
        SELECT th.history_id, th.task_id, th.changed_by, th.old_status,
               th.new_status, th.notes, th.changed_at,
               u.first_name || ' ' || u.last_name as changed_by_name
        FROM task_history th
        JOIN "user" u ON th.changed_by = u.user_id
        WHERE th.task_id = :task_id
        ORDER BY th.changed_at DESC
    """)
    
    results = db.execute(history_query, {"task_id": str(task_id)}).fetchall()
    
    return [
        TaskHistoryResponse(
            history_id=row.history_id,
            task_id=row.task_id,
            changed_by=row.changed_by,
            old_status=row.old_status,
            new_status=row.new_status,
            notes=row.notes,
            changed_at=row.changed_at,
            changed_by_name=row.changed_by_name
        )
        for row in results
    ]

@router.get("/assigned/me", response_model=List[TaskResponse])
async def get_my_tasks(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to the current user."""
    base_query = """
        SELECT t.task_id, t.land_id, t.title as task_type, t.description,
               t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
               t.due_date, t.completion_notes, t.created_at, t.updated_at,
               l.title as land_title, l.landowner_id,
               u1.first_name || ' ' || u1.last_name as assigned_to_name,
               u2.first_name || ' ' || u2.last_name as assigned_by_name
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
        LEFT JOIN "user" u2 ON t.created_by = u2.user_id
        WHERE t.assigned_to = CAST(:user_id AS uuid)
    """
    
    params = {"user_id": str(current_user["user_id"])}
    
    if status:
        base_query += " AND t.status = :status"
        params["status"] = status
    
    base_query += " ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC"
    
    try:
        results = db.execute(text(base_query), params).fetchall()
        
        return [
            TaskResponse(
                task_id=row.task_id,
                land_id=row.land_id,
                task_type=row.task_type,
                description=row.description,
                assigned_to=row.assigned_to,
                assigned_by=row.assigned_by,
                status=row.status,
                priority=row.priority,
                due_date=row.due_date,
                completion_notes=row.completion_notes,
                created_at=row.created_at,
                updated_at=row.updated_at,
                land_title=row.land_title,
                assigned_to_name=row.assigned_to_name,
                assigned_by_name=row.assigned_by_name
            )
            for row in results
        ]
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assigned tasks: {str(e)}"
        )

@router.get("/created/me", response_model=List[TaskResponse])
async def get_tasks_created_by_me(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks created by the current user."""
    base_query = """
        SELECT t.task_id, t.land_id, t.title as task_type, t.description,
               t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
               t.due_date, t.completion_notes, t.created_at, t.updated_at,
               l.title as land_title, l.landowner_id,
               u1.first_name || ' ' || u1.last_name as assigned_to_name,
               u2.first_name || ' ' || u2.last_name as assigned_by_name
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
        LEFT JOIN "user" u2 ON t.created_by = u2.user_id
        WHERE t.created_by = CAST(:user_id AS uuid)
    """
    
    params = {"user_id": str(current_user["user_id"])}
    
    if status:
        base_query += " AND t.status = :status"
        params["status"] = status
    
    base_query += " ORDER BY t.created_at DESC"
    
    try:
        results = db.execute(text(base_query), params).fetchall()
        
        return [
            TaskResponse(
                task_id=row.task_id,
                land_id=row.land_id,
                task_type=row.task_type,
                description=row.description,
                assigned_to=row.assigned_to,
                assigned_by=row.assigned_by,
                status=row.status,
                priority=row.priority,
                due_date=row.due_date,
                completion_notes=row.completion_notes,
                created_at=row.created_at,
                updated_at=row.updated_at,
                land_title=row.land_title,
                assigned_to_name=row.assigned_to_name,
                assigned_by_name=row.assigned_by_name
            )
            for row in results
        ]
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch created tasks: {str(e)}"
        )

# Admin endpoints
@router.get("/admin/all", response_model=List[TaskResponse])
async def get_all_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all tasks (admin only)."""
    base_query = """
        SELECT t.task_id, t.land_id, t.title as task_type, t.description,
               t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
               t.due_date, t.completion_notes, t.created_at, t.updated_at,
               l.title as land_title, l.landowner_id,
               u1.first_name || ' ' || u1.last_name as assigned_to_name,
               u2.first_name || ' ' || u2.last_name as assigned_by_name
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
        LEFT JOIN "user" u2 ON t.created_by = u2.user_id
        WHERE 1=1
    """
    
    params = {"skip": skip, "limit": limit}
    
    if status:
        base_query += " AND t.status = :status"
        params["status"] = status
    
    if task_type:
        base_query += " AND t.task_type = :task_type"
        params["task_type"] = task_type
    
    base_query += " ORDER BY t.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    return [
        TaskResponse(
            task_id=row.task_id,
            land_id=row.land_id,
            task_type=row.task_type,
            description=row.description,
            assigned_to=row.assigned_to,
            assigned_by=row.assigned_by,
            status=row.status,
            priority=row.priority,
            due_date=row.due_date,
            completion_notes=row.completion_notes,
            created_at=row.created_at,
            updated_at=row.updated_at,
            land_title=row.land_title,
            assigned_to_name=row.assigned_to_name,
            assigned_by_name=row.assigned_by_name
        )
        for row in results
    ]

@router.get("/types/list", response_model=List[str])
async def get_task_types(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all task types in use."""
    query = text("""
        SELECT DISTINCT task_type 
        FROM tasks 
        ORDER BY task_type
    """)
    
    results = db.execute(query).fetchall()
    
    return [row.task_type for row in results]

@router.get("/status/list", response_model=List[str])
async def get_task_statuses(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all task statuses."""
    # Return standard task statuses
    return ["pending", "in_progress", "completed", "cancelled", "on_hold"]

@router.get("/priority/list", response_model=List[str])
async def get_task_priorities(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all task priorities."""
    # Return standard task priorities
    return ["low", "medium", "high", "urgent"]

@router.get("/stats/summary")
async def get_task_stats(
    land_id: Optional[UUID] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task statistics summary."""
    user_roles = current_user.get("roles", [])
    
    base_query = """
        SELECT 
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
            COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
            COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
            COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_tasks
        FROM tasks t
        JOIN lands l ON t.land_id = l.land_id
        WHERE 1=1
    """
    
    params = {}
    
    if land_id:
        base_query += " AND t.land_id = :land_id"
        params["land_id"] = str(land_id)
    
    # Add permission filter for non-admin users
    if "administrator" not in user_roles:
        base_query += """
            AND (t.assigned_to = :user_id 
                 OR t.assigned_by = :user_id 
                 OR l.landowner_id = :user_id)
        """
        params["user_id"] = current_user["user_id"]
    
    result = db.execute(text(base_query), params).fetchone()
    
    return {
        "total_tasks": result.total_tasks,
        "pending_tasks": result.pending_tasks,
        "in_progress_tasks": result.in_progress_tasks,
        "completed_tasks": result.completed_tasks,
        "overdue_tasks": result.overdue_tasks
    }


# ============================================================================
# SUBTASK ENDPOINTS
# ============================================================================

@router.post("/{task_id}/subtasks", response_model=SubtaskResponse)
async def create_subtask(
    task_id: UUID,
    subtask_data: SubtaskCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subtask for a task."""
    try:
        # Verify task exists and user has access
        task_query = """
            SELECT t.task_id, t.assigned_to, t.created_by, l.landowner_id
            FROM tasks t
            JOIN lands l ON t.land_id = l.land_id
            WHERE t.task_id = CAST(:task_id AS uuid)
        """
        task = db.execute(text(task_query), {"task_id": str(task_id)}).fetchone()
        
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Check permissions - Allow admins, task creators, landowners, AND assigned reviewers
        user_roles = current_user.get("roles", [])
        user_id = str(current_user["user_id"])
        is_admin = "administrator" in user_roles
        is_task_assigned = str(task.assigned_to) == user_id if task.assigned_to else False
        is_task_creator = str(task.created_by) == user_id
        is_landowner = str(task.landowner_id) == user_id
        
        # Allow admins, assigned reviewers, task creators, and landowners to add subtasks
        if not (is_admin or is_task_assigned or is_task_creator or is_landowner):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add subtasks to this task"
            )
        
        # Create subtask
        subtask_id = uuid.uuid4()
        insert_query = """
            INSERT INTO subtasks (
                subtask_id, task_id, title, description, status,
                assigned_to, created_by, order_index
            ) VALUES (
                CAST(:subtask_id AS uuid), CAST(:task_id AS uuid), :title, :description, :status,
                CAST(:assigned_to AS uuid), CAST(:created_by AS uuid), :order_index
            )
            RETURNING subtask_id, task_id, title, description, status,
                      assigned_to, created_by, created_at, updated_at,
                      completed_at, order_index
        """
        
        result = db.execute(text(insert_query), {
            "subtask_id": str(subtask_id),
            "task_id": str(task_id),
            "title": subtask_data.title,
            "description": subtask_data.description,
            "status": subtask_data.status,
            "assigned_to": str(subtask_data.assigned_to) if subtask_data.assigned_to else None,
            "created_by": str(current_user["user_id"]),
            "order_index": subtask_data.order_index
        }).fetchone()
        
        db.commit()
        
        return SubtaskResponse(
            subtask_id=result.subtask_id,
            task_id=result.task_id,
            title=result.title,
            description=result.description,
            status=result.status,
            assigned_to=result.assigned_to,
            created_by=result.created_by,
            created_at=result.created_at,
            updated_at=result.updated_at,
            completed_at=result.completed_at,
            order_index=result.order_index,
            assigned_user=None,
            creator=None
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating subtask: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subtask: {str(e)}"
        )


@router.get("/{task_id}/subtasks", response_model=List[SubtaskResponse])
async def get_subtasks(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subtasks for a task."""
    try:
        # Verify task exists and user has access
        task_query = """
            SELECT t.task_id, t.assigned_to, t.created_by, l.landowner_id
            FROM tasks t
            JOIN lands l ON t.land_id = l.land_id
            WHERE t.task_id = CAST(:task_id AS uuid)
        """
        task = db.execute(text(task_query), {"task_id": str(task_id)}).fetchone()
        
        if not task:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Check permissions
        user_roles = current_user.get("roles", [])
        task_dict = {
            "task_id": task.task_id,
            "assigned_to": task.assigned_to,
            "assigned_by": task.created_by,
            "created_by": task.created_by,
            "landowner_id": task.landowner_id
        }
        
        if not can_access_task(user_roles, str(current_user["user_id"]), task_dict):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view subtasks for this task"
            )
        
        # Get subtasks
        query = """
            SELECT s.subtask_id, s.task_id, s.title, s.description, s.status,
                   s.assigned_to, s.created_by, s.created_at, s.updated_at,
                   s.completed_at, s.order_index
            FROM subtasks s
            WHERE s.task_id = CAST(:task_id AS uuid)
            ORDER BY s.order_index, s.created_at
        """
        
        results = db.execute(text(query), {"task_id": str(task_id)}).fetchall()
        
        return [
            SubtaskResponse(
                subtask_id=row.subtask_id,
                task_id=row.task_id,
                title=row.title,
                description=row.description,
                status=row.status,
                assigned_to=row.assigned_to,
                created_by=row.created_by,
                created_at=row.created_at,
                updated_at=row.updated_at,
                completed_at=row.completed_at,
                order_index=row.order_index,
                assigned_user=None,
                creator=None
            )
            for row in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching subtasks: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subtasks: {str(e)}"
        )


@router.put("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    task_id: UUID,
    subtask_id: UUID,
    subtask_data: SubtaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subtask."""
    try:
        # Verify subtask exists
        subtask_query = """
            SELECT s.*, t.assigned_to as task_assigned_to, t.created_by as task_created_by,
                   l.landowner_id
            FROM subtasks s
            JOIN tasks t ON s.task_id = t.task_id
            JOIN lands l ON t.land_id = l.land_id
            WHERE s.subtask_id = CAST(:subtask_id AS uuid) AND s.task_id = CAST(:task_id AS uuid)
        """
        subtask = db.execute(text(subtask_query), {
            "subtask_id": str(subtask_id),
            "task_id": str(task_id)
        }).fetchone()
        
        if not subtask:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Subtask not found"
            )
        
        # Check permissions
        user_roles = current_user.get("roles", [])
        user_id = str(current_user["user_id"])
        is_admin = "administrator" in user_roles
        is_task_assigned = str(subtask.task_assigned_to) == user_id if subtask.task_assigned_to else False
        is_task_creator = str(subtask.task_created_by) == user_id
        is_landowner = str(subtask.landowner_id) == user_id
        
        # Check if admin is trying to update status
        if is_admin and subtask_data.status is not None and not (is_task_assigned or is_task_creator or is_landowner):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Administrators can only view subtasks. Only the assigned reviewer can change subtask status."
            )
        
        # Allow task assigned users (reviewers), task creators, and landowners to update subtasks
        # Admins can update other fields (like title, description) but not status (checked above)
        if not (is_admin or is_task_assigned or is_task_creator or is_landowner):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this subtask"
            )
        
        # Build update query
        update_fields = []
        params = {"subtask_id": str(subtask_id), "task_id": str(task_id)}
        
        if subtask_data.title is not None:
            update_fields.append("title = :title")
            params["title"] = subtask_data.title
        
        if subtask_data.description is not None:
            update_fields.append("description = :description")
            params["description"] = subtask_data.description
        
        if subtask_data.status is not None:
            update_fields.append("status = :status")
            params["status"] = subtask_data.status
            if subtask_data.status == "completed":
                update_fields.append("completed_at = now()")
            elif subtask_data.status == "pending":
                # Clear completed_at when marking as pending
                update_fields.append("completed_at = NULL")
        
        if subtask_data.assigned_to is not None:
            update_fields.append("assigned_to = CAST(:assigned_to AS uuid)")
            params["assigned_to"] = str(subtask_data.assigned_to)
        
        if subtask_data.order_index is not None:
            update_fields.append("order_index = :order_index")
            params["order_index"] = subtask_data.order_index
        
        if not update_fields:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append("updated_at = now()")
        
        update_query = f"""
            UPDATE subtasks
            SET {", ".join(update_fields)}
            WHERE subtask_id = CAST(:subtask_id AS uuid) AND task_id = CAST(:task_id AS uuid)
            RETURNING subtask_id, task_id, title, description, status,
                      assigned_to, created_by, created_at, updated_at,
                      completed_at, order_index
        """
        
        result = db.execute(text(update_query), params).fetchone()
        db.commit()
        
        return SubtaskResponse(
            subtask_id=result.subtask_id,
            task_id=result.task_id,
            title=result.title,
            description=result.description,
            status=result.status,
            assigned_to=result.assigned_to,
            created_by=result.created_by,
            created_at=result.created_at,
            updated_at=result.updated_at,
            completed_at=result.completed_at,
            order_index=result.order_index,
            assigned_user=None,
            creator=None
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating subtask: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subtask: {str(e)}"
        )


@router.delete("/{task_id}/subtasks/{subtask_id}")
async def delete_subtask(
    task_id: UUID,
    subtask_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subtask."""
    # Verify subtask exists
    subtask_query = """
        SELECT s.*, t.assigned_to as task_assigned_to, t.created_by as task_created_by,
               l.landowner_id
        FROM subtasks s
        JOIN tasks t ON s.task_id = t.task_id
        JOIN lands l ON t.land_id = l.land_id
        WHERE s.subtask_id = :subtask_id AND s.task_id = :task_id
    """
    subtask = db.execute(text(subtask_query), {
        "subtask_id": str(subtask_id),
        "task_id": str(task_id)
    }).fetchone()
    
    if not subtask:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    
    # Check permissions - Allow admins, assigned reviewers, task creators, and landowners
    user_roles = current_user.get("roles", [])
    user_id = str(current_user["user_id"])
    is_admin = "administrator" in user_roles
    is_task_assigned = str(subtask.task_assigned_to) == user_id if subtask.task_assigned_to else False
    is_task_creator = str(subtask.task_created_by) == user_id
    is_landowner = str(subtask.landowner_id) == user_id
    
    # Allow admins, assigned reviewers, task creators, and landowners to delete subtasks
    if not (is_admin or is_task_assigned or is_task_creator or is_landowner):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this subtask"
        )
    
    # Delete subtask
    db.execute(text("DELETE FROM subtasks WHERE subtask_id = :subtask_id"), {
        "subtask_id": str(subtask_id)
    })
    db.commit()
    
    return {"message": "Subtask deleted successfully"}


@router.post("/{task_id}/subtasks/submit")
async def submit_subtasks_status(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit all subtasks for a task. This marks the review as complete and updates task status."""
    try:
        # Check task exists and user has access
        task_query = text("SELECT * FROM tasks WHERE task_id = CAST(:task_id AS uuid)")
        task_result = db.execute(task_query, {"task_id": str(task_id)}).fetchone()
        
        if not task_result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_dict = dict(task_result._mapping)
        user_roles = current_user.get("roles", [])
        is_admin = "administrator" in user_roles
        is_assigned = str(task_dict.get("assigned_to")) == str(current_user["user_id"])
        
        if not (is_admin or is_assigned):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit subtasks for this task"
            )
        
        # Get all subtasks for this task
        subtasks_query = text("""
            SELECT subtask_id, status 
            FROM subtasks 
            WHERE task_id = CAST(:task_id AS uuid)
        """)
        subtasks_result = db.execute(subtasks_query, {"task_id": str(task_id)}).fetchall()
        
        # Calculate completion stats
        total_subtasks = len(subtasks_result)
        completed_subtasks = sum(1 for s in subtasks_result if s.status == 'completed')
        
        # Update task status based on subtask completion
        if total_subtasks > 0:
            completion_percentage = (completed_subtasks / total_subtasks) * 100
            
            # If all subtasks are completed, mark task as completed
            if completion_percentage == 100:
                update_task_query = text("""
                    UPDATE tasks 
                    SET status = 'completed',
                        updated_at = now()
                    WHERE task_id = CAST(:task_id AS uuid)
                """)
                db.execute(update_task_query, {"task_id": str(task_id)})
            elif completion_percentage > 0:
                # If some subtasks are completed, mark task as in_progress
                update_task_query = text("""
                    UPDATE tasks 
                    SET status = 'in_progress',
                        updated_at = now()
                    WHERE task_id = CAST(:task_id AS uuid)
                """)
                db.execute(update_task_query, {"task_id": str(task_id)})
        
        db.commit()
        
        return {
            "message": "Subtasks submitted successfully",
            "total_subtasks": total_subtasks,
            "completed_subtasks": completed_subtasks,
            "completion_percentage": round((completed_subtasks / total_subtasks * 100) if total_subtasks > 0 else 0, 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting subtasks: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit subtasks: {str(e)}"
        )


@router.get("/subtask-templates/{role}")
async def get_default_subtask_templates(
    role: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get default subtask templates for a reviewer role."""
    
    default_subtasks = {
        "re_sales_advisor": [
            {"title": "Location accessibility and infrastructure", "section": "Market Viability", "order": 0},
            {"title": "Proximity to transmission lines", "section": "Market Viability", "order": 1},
            {"title": "Local energy demand assessment", "section": "Market Viability", "order": 2},
            {"title": "Competition analysis in the region", "section": "Market Viability", "order": 3},
            {"title": "Market price competitiveness", "section": "Market Viability", "order": 4},
            {"title": "Revenue projection accuracy", "section": "Commercial Feasibility", "order": 5},
            {"title": "Contract terms evaluation", "section": "Commercial Feasibility", "order": 6},
            {"title": "Risk assessment completeness", "section": "Commercial Feasibility", "order": 7},
            {"title": "ROI calculations verification", "section": "Commercial Feasibility", "order": 8},
            {"title": "Market timing considerations", "section": "Commercial Feasibility", "order": 9}
        ],
        "re_analyst": [
            {"title": "Land suitability for renewable energy", "section": "Technical Analysis", "order": 0},
            {"title": "Topographical survey accuracy", "section": "Technical Analysis", "order": 1},
            {"title": "Grid connectivity feasibility", "section": "Technical Analysis", "order": 2},
            {"title": "Environmental impact assessment", "section": "Technical Analysis", "order": 3},
            {"title": "Technical specifications compliance", "section": "Technical Analysis", "order": 4},
            {"title": "Financial model accuracy", "section": "Financial Analysis", "order": 5},
            {"title": "Cost estimation validation", "section": "Financial Analysis", "order": 6},
            {"title": "Revenue projections review", "section": "Financial Analysis", "order": 7},
            {"title": "Cash flow analysis", "section": "Financial Analysis", "order": 8},
            {"title": "Financing structure evaluation", "section": "Financial Analysis", "order": 9}
        ],
        "re_governance_lead": [
            {"title": "Land ownership documentation", "section": "Legal Compliance", "order": 0},
            {"title": "Zoning and permits verification", "section": "Legal Compliance", "order": 1},
            {"title": "Environmental clearances", "section": "Legal Compliance", "order": 2},
            {"title": "Government NOC validation", "section": "Legal Compliance", "order": 3},
            {"title": "Legal title verification", "section": "Legal Compliance", "order": 4},
            {"title": "Industry standards compliance", "section": "Regulatory Requirements", "order": 5},
            {"title": "Safety regulations adherence", "section": "Regulatory Requirements", "order": 6},
            {"title": "Environmental regulations", "section": "Regulatory Requirements", "order": 7},
            {"title": "Local authority approvals", "section": "Regulatory Requirements", "order": 8},
            {"title": "Regulatory timeline compliance", "section": "Regulatory Requirements", "order": 9}
        ]
    }
    
    templates = default_subtasks.get(role, [])
    
    return {
        "role": role,
        "templates": templates,
        "count": len(templates)
    }