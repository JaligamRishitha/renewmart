from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy.exc import IntegrityError
from psycopg2.errors import UniqueViolation
from datetime import datetime
import uuid
import logging
from http import HTTPStatus
from sqlalchemy.sql import text

from database import get_db
from auth import get_current_user, require_admin
from models.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskHistoryResponse,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    MessageResponse
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Initialize logger
logger = logging.getLogger(__name__)

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
    
    # Create subtasks in bulk using savepoints to handle individual failures
    successful_count = 0
    for i, template in enumerate(templates):
        try:
            # Use savepoint for each subtask so failures don't abort the whole transaction
            savepoint_name = f"sp_subtask_{i}"
            savepoint = db.begin_nested()  # Creates a savepoint
            
            try:
                subtask_id = uuid.uuid4()
                db.execute(
                    text("""
                        SELECT create_subtask(
                            CAST(:subtask_id AS uuid),
                            CAST(:task_id AS uuid),
                            :title,
                            :description,
                            :status,
                            CAST(:created_by AS uuid),
                            :order_index
                        )
                    """),
                    {
                        "subtask_id": str(subtask_id),
                        "task_id": task_id,
                        "title": template["title"],
                        "description": f"{template['section']} - {template['title']}",
                        "status": "pending",
                        "created_by": created_by,
                        "order_index": template["order"]
                    }
                )
                
                # Release savepoint on success
                savepoint.commit()
                successful_count += 1
            except Exception as e:
                # Rollback to savepoint on failure, then continue
                savepoint.rollback()
                print(f"Error creating subtask {template['title']}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        except Exception as e:
            print(f"Error creating subtask {template['title']}: {str(e)}")
            import traceback
            traceback.print_exc()
            continue
    
    try:
        db.commit()
        print(f"Created {successful_count}/{len(templates)} default subtasks for task {task_id}")
    except Exception as commit_error:
        print(f"Error committing subtasks: {str(commit_error)}")
        try:
            db.rollback()
        except:
            pass
        raise  # Re-raise to be caught by caller

def can_access_task(user_roles: List[str], user_id: str, task_data: dict, land_status: str = None) -> bool:
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
    
    # Investors can access tasks for published lands
    if "investor" in user_roles and land_status == "published":
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
    # Check if land exists and user has permission using stored procedure
    land_result = db.execute(
        text("SELECT * FROM check_land_for_task(CAST(:land_id AS uuid))"),
        {"land_id": str(task_data.land_id)}
    ).fetchone()
    
    if not land_result:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,  # Corrected from HTTP_404_NOT_FOUND
            detail="Land not found"
        )
    
    user_roles = current_user.get("roles", [])
    if ("administrator" not in user_roles and 
        str(land_result.landowner_id) != current_user["user_id"]):
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,  # Corrected from HTTP_403_FORBIDDEN
            detail="Not enough permissions to create tasks for this land"
        )
    
    # Validate assigned_to user if provided using stored procedure
    if task_data.assigned_to:
        user_result = db.execute(
            text("SELECT * FROM check_user_exists(CAST(:user_id AS uuid))"),
            {"user_id": str(task_data.assigned_to)}
        ).fetchone()
        
        if not user_result:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,  # Corrected from HTTP_404_NOT_FOUND
                detail="Assigned user not found"
            )
    
    # Step 1: Validate for existing pending task using stored procedure
    if task_data.assigned_to:
        existing_task = db.execute(
            text("""
                SELECT * FROM check_existing_pending_task(
                    CAST(:land_id AS uuid),
                    :title,
                    CAST(:assigned_to AS uuid)
                )
            """),
            {
                "land_id": str(task_data.land_id),
                "title": task_data.task_type.replace('_', ' ').title(),
                "assigned_to": str(task_data.assigned_to)
            }
        ).fetchone()

        if existing_task:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,  # Corrected from HTTP_400_BAD_REQUEST
                detail="This Same task is already assigned to this user."
            )

    # Step 2: Insert the task using stored procedure
    try:
        # Generate new task ID
        task_id = str(uuid4())
        
        db.execute(
            text("""
                SELECT create_task(
                    CAST(:task_id AS uuid),
                    CAST(:land_id AS uuid),
                    :title,
                    :description,
                    CAST(:assigned_to AS uuid),
                    :assigned_role,
                    CAST(:created_by AS uuid),
                    :priority,
                    :due_date
                )
            """),
            {
                "task_id": task_id,
                "land_id": str(task_data.land_id),
                "title": task_data.task_type.replace('_', ' ').title(),
                "description": task_data.description,
                "assigned_to": str(task_data.assigned_to) if task_data.assigned_to else None,
                "assigned_role": task_data.assigned_role,
                "created_by": str(current_user["user_id"]),
                "priority": task_data.priority or "medium",
                "due_date": task_data.due_date
            }
        )
        
        db.commit()
        logger.info(f"Task {task_id} created and committed successfully")
        
        # Auto-create default subtasks if task has assigned_role
        if task_data.assigned_role:
            try:
                logger.info(f"Creating default subtasks for task {task_id} with role {task_data.assigned_role}")
                await create_default_subtasks_for_task(task_id, task_data.assigned_role, str(current_user["user_id"]), db)
                logger.info(f"Default subtasks created successfully for task {task_id}")
            except Exception as e:
                logger.error(f"Error creating default subtasks (non-critical): {str(e)}", exc_info=True)
                # Rollback any failed subtask transaction
                try:
                    db.rollback()
                except:
                    pass
                # Continue - subtask creation failure shouldn't prevent task creation
        
        # Create notification if task is assigned to a user
        print(f"DEBUG: Task creation notification check - assigned_to={task_data.assigned_to}")
        if task_data.assigned_to:
            print(f"DEBUG: Task has assigned_to={task_data.assigned_to}, creating notification...")
            try:
                from utils.notifications import notify_task_assigned
                assigned_to_str = str(task_data.assigned_to)
                task_title = task_data.task_type.replace('_', ' ').title()
                land_id_str = str(task_data.land_id)
                assigned_by_str = str(current_user["user_id"])
                
                print(f"DEBUG: Calling notify_task_assigned with task_id={task_id}, assigned_to={assigned_to_str}")
                logger.info(f"Creating notification for task {task_id} assignment to {assigned_to_str}")
                logger.info(f"Task details: title={task_title}, land_id={land_id_str}, assigned_by={assigned_by_str}")
                
                notify_task_assigned(
                    db=db,
                    task_id=task_id,
                    assigned_to=assigned_to_str,
                    task_title=task_title,
                    land_id=land_id_str,
                    assigned_by=assigned_by_str
                )
                print(f"DEBUG: notify_task_assigned returned successfully")
                logger.info(f"Notification created successfully for task {task_id}")
            except Exception as e:
                print(f"DEBUG: ERROR creating task notification: {str(e)}")
                logger.error(f"Error creating task assignment notification (non-critical): {str(e)}", exc_info=True)
                import traceback
                traceback.print_exc()
                # Rollback notification transaction if it failed
                try:
                    db.rollback()
                except:
                    pass
                # Continue - notification failure shouldn't prevent task creation
        else:
            print(f"DEBUG: Task has no assigned_to, skipping notification")
        
        # Fetch the created task
        # Ensure we use a fresh query to avoid transaction issues
        try:
            logger.info(f"Fetching created task {task_id}")
            return await get_task(UUID(task_id), current_user, db)
        except Exception as fetch_error:
            logger.error(f"Error fetching created task {task_id}: {str(fetch_error)}", exc_info=True)
            # If get_task fails, try to rollback and create a simple response
            try:
                db.rollback()
            except:
                pass
            
            # Return task data directly from what we know
            query = text("""
                SELECT t.task_id, t.land_id, t.title as task_type, t.description,
                       t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
                       t.assigned_role, t.due_date, t.completion_notes, t.created_at, t.updated_at,
                       l.title as land_title, l.landowner_id,
                       u1.first_name || ' ' || u1.last_name as assigned_to_name,
                       u2.first_name || ' ' || u2.last_name as assigned_by_name
                FROM tasks t
                JOIN lands l ON t.land_id = l.land_id
                LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
                LEFT JOIN "user" u2 ON t.created_by = u2.user_id
                WHERE t.task_id = CAST(:task_id AS uuid)
            """)
            
            result = db.execute(query, {"task_id": str(task_id)}).fetchone()
            
            if not result:
                # Task was created but can't be retrieved - return error
                raise HTTPException(
                    status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                    detail=f"Task created successfully (ID: {task_id}) but failed to retrieve: {str(fetch_error)}"
                )
            
            return TaskResponse(
                task_id=result.task_id,
                land_id=result.land_id,
                task_type=result.task_type,
                description=result.description,
                assigned_to=str(result.assigned_to) if result.assigned_to else None,
                created_by=str(result.assigned_by) if result.assigned_by else None,
                status=result.status,
                priority=result.priority,
                assigned_role=result.assigned_role,
                due_date=result.due_date,
                completion_notes=result.completion_notes,
                created_at=result.created_at,
                updated_at=result.updated_at,
                land_title=result.land_title,
                assigned_to_name=result.assigned_to_name,
                assigned_by_name=result.assigned_by_name
            )
        
    except IntegrityError as e:
        db.rollback()
        if isinstance(e.orig, UniqueViolation) and "idx_unique_task_assignment" in str(e):
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,  # Corrected from HTTP_400_BAD_REQUEST
                detail="This task is already assigned to the user and is pending."
            )
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,  # Corrected from HTTP_500_INTERNAL_SERVER_ERROR
            detail=f"Failed to create task: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,  # Corrected from HTTP_500_INTERNAL_SERVER_ERROR
            detail=f"Failed to create task: {str(e)}"
        )

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    land_id: Optional[UUID] = None,
    assigned_to: Optional[UUID] = None,
    assigned_role: Optional[str] = None,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    include_subtasks: Optional[bool] = None,
    include_status: Optional[bool] = None,
    summary_only: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks with optional filters."""
    user_roles = current_user.get("roles", [])
    
    # Build base query (matching actual schema)
    # Include role lookup from user_roles if assigned_role is null
    base_query = """
        SELECT t.task_id, t.land_id, t.title as task_type, t.description,
               t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
               COALESCE(t.assigned_role, 
                   (SELECT ur.role_key 
                    FROM user_roles ur 
                    WHERE ur.user_id = t.assigned_to 
                      AND ur.role_key IN ('re_sales_advisor', 're_analyst', 're_governance_lead')
                    LIMIT 1
                   )) as assigned_role,
               t.start_date, t.end_date, t.due_date,
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
    
    if assigned_role:
        # Filter by assigned_role (either from task or from user_roles)
        base_query += """
            AND (t.assigned_role = :assigned_role 
                 OR (t.assigned_role IS NULL 
                     AND EXISTS (
                         SELECT 1 FROM user_roles ur 
                         WHERE ur.user_id = t.assigned_to 
                         AND ur.role_key = :assigned_role
                     )))
        """
        params["assigned_role"] = assigned_role
    
    if status:
        base_query += " AND t.status = :status"
        params["status"] = status
    
    if task_type:
        base_query += " AND t.task_type = :task_type"
        params["task_type"] = task_type
    
    # Add permission filter for non-admin users
    if "administrator" not in user_roles:
        if "investor" in user_roles:
            # Investors can see tasks for published lands OR lands they have expressed interest in
            base_query += """
                AND (t.assigned_to = :user_id 
                     OR t.created_by = :user_id 
                     OR l.landowner_id = :user_id
                     OR l.status = 'published'
                     OR EXISTS (
                         SELECT 1 FROM investor_interests ii
                         WHERE ii.land_id = l.land_id
                         AND ii.investor_id = :user_id
                         AND ii.status IN ('pending', 'approved')
                         AND (ii.withdrawal_requested = FALSE OR ii.withdrawal_status IS NULL OR ii.withdrawal_status != 'approved')
                     ))
            """
        else:
            # Other users (reviewers, landowners) see their assigned/created tasks
            base_query += """
                AND (t.assigned_to = :user_id 
                     OR t.created_by = :user_id 
                     OR l.landowner_id = :user_id)
            """
        params["user_id"] = current_user["user_id"]
    
    base_query += " ORDER BY t.created_at DESC OFFSET :skip LIMIT :limit"
    
    results = db.execute(text(base_query), params).fetchall()
    
    # If include_subtasks is requested, fetch subtasks for each task
    if include_subtasks:
        task_responses = []
        for row in results:
            # Get subtasks for this task
            subtasks_query = text("""
                SELECT subtask_id, task_id, title, description, status, 
                       assigned_to, created_by, created_at, updated_at,
                       completed_at, order_index
                FROM subtasks 
                WHERE task_id = :task_id
                ORDER BY order_index, created_at ASC
            """)
            subtasks_result = db.execute(subtasks_query, {"task_id": str(row.task_id)}).fetchall()
            
            # Convert subtasks to SubtaskResponse format
            from models.schemas import SubtaskResponse
            subtasks = []
            for subtask in subtasks_result:
                # created_by is required, use task's created_by as fallback if somehow missing
                created_by_value = subtask.created_by if subtask.created_by else row.assigned_by
                if not created_by_value:
                    # Skip subtasks without created_by (shouldn't happen, but safety check)
                    continue
                
                subtasks.append(
                    SubtaskResponse(
                        subtask_id=subtask.subtask_id,
                        task_id=subtask.task_id,
                        title=subtask.title,
                        description=subtask.description,
                        status=subtask.status,
                        assigned_to=str(subtask.assigned_to) if subtask.assigned_to else None,
                        created_by=str(created_by_value),
                        created_at=subtask.created_at,
                        updated_at=subtask.updated_at,
                        completed_at=subtask.completed_at,
                        order_index=int(subtask.order_index) if subtask.order_index is not None else 0,
                        assigned_user=None,
                        creator=None
                    )
                )
            
            # Create TaskResponse object with subtasks
            task_response = TaskResponse(
                task_id=row.task_id,
                land_id=row.land_id,
                task_type=row.task_type,
                description=row.description,
                assigned_to=str(row.assigned_to) if row.assigned_to else None,
                created_by=str(row.assigned_by) if row.assigned_by else None,
                status=row.status,
                priority=row.priority,
                assigned_role=row.assigned_role,
                start_date=row.start_date,
                end_date=row.end_date,
                due_date=row.due_date,
                completion_notes=row.completion_notes,
                created_at=row.created_at,
                updated_at=row.updated_at,
                land_title=row.land_title,
                assigned_to_name=row.assigned_to_name,
                assigned_by_name=row.assigned_by_name,
                subtasks=subtasks,
                assigned_user=None,
                history=None,
                land_section_id=None
            )
            task_responses.append(task_response)
        
        return task_responses
    else:
        return [
            TaskResponse(
                task_id=row.task_id,
                land_id=row.land_id,
                task_type=row.task_type,
                description=row.description,
                assigned_to=str(row.assigned_to) if row.assigned_to else None,
                created_by=str(row.assigned_by) if row.assigned_by else None,
                status=row.status,
                priority=row.priority,
                assigned_role=row.assigned_role,
                start_date=row.start_date,
                end_date=row.end_date,
                due_date=row.due_date,
                completion_notes=row.completion_notes,
                created_at=row.created_at,
                updated_at=row.updated_at,
                land_title=row.land_title,
                assigned_to_name=row.assigned_to_name,
                assigned_by_name=row.assigned_by_name,
                land_section_id=None
            )
            for row in results
        ]

@router.get("/project/{land_id}/review", response_model=List[Dict[str, Any]])
async def get_project_review_tasks(
    land_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks for a specific land/project with subtasks for landowner review."""
    
    # Check if user is landowner of this land or admin
    land_check = text("""
        SELECT landowner_id, status FROM lands WHERE land_id = :land_id
    """)
    land_result = db.execute(land_check, {"land_id": str(land_id)}).fetchone()
    
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
            detail="Not authorized to view tasks for this land"
        )
    
    try:
        # Get all tasks for this land, including reviewer role from user_roles
        tasks_query = text("""
            SELECT t.task_id, t.land_id, t.title as task_type, t.description,
                   t.assigned_to, t.created_by as assigned_by, t.status, t.priority,
                   COALESCE(t.assigned_role, 
                       (SELECT ur.role_key 
                        FROM user_roles ur 
                        WHERE ur.user_id = t.assigned_to 
                          AND ur.role_key IN ('re_sales_advisor', 're_analyst', 're_governance_lead')
                        LIMIT 1
                       )) as assigned_role,
                   t.start_date, t.end_date, t.due_date,
                   t.completion_notes, t.created_at, t.updated_at,
                   l.title as land_title, l.landowner_id,
                   u1.first_name || ' ' || u1.last_name as assigned_to_name,
                   u2.first_name || ' ' || u2.last_name as assigned_by_name
            FROM tasks t
            JOIN lands l ON t.land_id = l.land_id
            LEFT JOIN "user" u1 ON t.assigned_to = u1.user_id
            LEFT JOIN "user" u2 ON t.created_by = u2.user_id
            WHERE t.land_id = :land_id
            ORDER BY t.created_at DESC
        """)
        
        tasks_result = db.execute(tasks_query, {"land_id": str(land_id)}).fetchall()
        
        # Get subtasks for each task
        tasks_with_subtasks = []
        for task in tasks_result:
            # Get subtasks for this task
            subtasks_query = text("""
                SELECT subtask_id, task_id, title, description, status, 
                       assigned_to, created_at, updated_at
                FROM subtasks 
                WHERE task_id = :task_id
                ORDER BY created_at ASC
            """)
            subtasks_result = db.execute(subtasks_query, {"task_id": str(task.task_id)}).fetchall()
            
            # Convert subtasks to dict format
            subtasks = [
                {
                    "subtask_id": str(subtask.subtask_id),
                    "task_id": str(subtask.task_id),
                    "title": subtask.title,
                    "description": subtask.description,
                    "status": subtask.status,
                    "assigned_to": str(subtask.assigned_to) if subtask.assigned_to else None,
                    "created_at": subtask.created_at,
                    "updated_at": subtask.updated_at
                }
                for subtask in subtasks_result
            ]
            
            # Create task response with subtasks
            task_response = {
                "task_id": str(task.task_id),
                "land_id": str(task.land_id),
                "task_type": task.task_type,
                "title": task.task_type,  # For compatibility
                "description": task.description,
                "assigned_to": str(task.assigned_to) if task.assigned_to else None,
                "assigned_by": str(task.assigned_by) if task.assigned_by else None,
                "status": task.status,
                "priority": task.priority,
                "assigned_role": task.assigned_role,
                "start_date": task.start_date,
                "end_date": task.end_date,
                "due_date": task.due_date,
                "completion_notes": task.completion_notes,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "land_title": task.land_title,
                "assigned_to_name": task.assigned_to_name,
                "assigned_by_name": task.assigned_by_name,
                "subtasks": subtasks
            }
            tasks_with_subtasks.append(task_response)
        
        return tasks_with_subtasks
        
    except Exception as e:
        logger.error(f"Error fetching project review tasks: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project review tasks: {str(e)}"
        )

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
               l.title as land_title, l.landowner_id, l.status as land_status,
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
    user_id_str = str(current_user["user_id"])
    task_data = {
        "assigned_by": result.assigned_by,
        "assigned_to": result.assigned_to,
        "landowner_id": result.landowner_id
    }
    
    # Pass land_status to can_access_task for investor permission check
    land_status = result.land_status if result.land_status else None
    has_access = can_access_task(user_roles, user_id_str, task_data, land_status)
    
    # If investor doesn't have access via can_access_task, check if they have interest in the land
    if not has_access and "investor" in user_roles:
        interest_check = db.execute(
            text("""
                SELECT interest_id FROM investor_interests 
                WHERE land_id = :land_id AND investor_id = :user_id
                AND status IN ('pending', 'approved')
                AND (withdrawal_requested = FALSE OR withdrawal_status IS NULL OR withdrawal_status != 'approved')
                LIMIT 1
            """),
            {
                "land_id": str(result.land_id),
                "user_id": user_id_str
            }
        ).fetchone()
        
        if interest_check:
            has_access = True
    
    if not has_access:
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
                    changed_by, note, start_ts
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
        SELECT t.assigned_to, t.created_by as assigned_by, t.land_id, l.landowner_id, l.status as land_status
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
    user_id_str = str(current_user["user_id"])
    task_data = {
        "assigned_by": task_result.assigned_by,
        "assigned_to": task_result.assigned_to,
        "landowner_id": task_result.landowner_id
    }
    
    has_access = can_access_task(user_roles, user_id_str, task_data, task_result.land_status)
    
    # If investor doesn't have access via can_access_task, check if they have interest in the land
    if not has_access and "investor" in user_roles:
        interest_check = db.execute(
            text("""
                SELECT interest_id FROM investor_interests 
                WHERE land_id = :land_id AND investor_id = :user_id
                AND status IN ('pending', 'approved')
                AND (withdrawal_requested = FALSE OR withdrawal_status IS NULL OR withdrawal_status != 'approved')
                LIMIT 1
            """),
            {
                "land_id": str(task_result.land_id),
                "user_id": user_id_str
            }
        ).fetchone()
        
        if interest_check:
            has_access = True
    
    if not has_access:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view task history"
        )
    
    # Get task history
    history_query = text("""
        SELECT th.history_id, th.task_id, th.changed_by, th.from_status,
               th.to_status, th.note, th.start_ts,
               u.first_name || ' ' || u.last_name as changed_by_name
        FROM task_history th
        JOIN "user" u ON th.changed_by = u.user_id
        WHERE th.task_id = :task_id
        ORDER BY th.start_ts DESC
    """)
    
    results = db.execute(history_query, {"task_id": str(task_id)}).fetchall()
    
    return [
        TaskHistoryResponse(
            history_id=row.history_id,
            task_id=row.task_id,
            changed_by=row.changed_by,
            from_status=row.from_status,
            to_status=row.to_status,
            note=row.note,
            start_ts=row.start_ts,
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
        
        # Create notification if subtask is assigned to a different user (collaboration)
        if subtask_data.assigned_to and str(subtask_data.assigned_to) != str(current_user["user_id"]):
            try:
                from utils.notifications import notify_subtask_assigned
                logger.info(f"Creating notification for new subtask {result.subtask_id} assigned to {subtask_data.assigned_to}")
                
                notify_subtask_assigned(
                    db=db,
                    subtask_id=str(result.subtask_id),
                    task_id=str(task_id),
                    subtask_title=subtask_data.title,
                    assigned_to=str(subtask_data.assigned_to),
                    land_id=str(task.land_id) if hasattr(task, 'land_id') else None
                )
                logger.info(f"Notification created successfully for new subtask {result.subtask_id}")
            except Exception as e:
                logger.error(f"Error creating subtask assignment notification: {str(e)}", exc_info=True)
                import traceback
                traceback.print_exc()
        
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
            SELECT t.task_id, t.land_id, t.assigned_to, t.created_by, l.landowner_id, l.status as land_status
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
        user_id_str = str(current_user["user_id"])
        task_dict = {
            "task_id": task.task_id,
            "assigned_to": task.assigned_to,
            "assigned_by": task.created_by,
            "created_by": task.created_by,
            "landowner_id": task.landowner_id
        }
        
        has_access = can_access_task(user_roles, user_id_str, task_dict, task.land_status)
        
        # If investor doesn't have access via can_access_task, check if they have interest in the land
        if not has_access and "investor" in user_roles:
            interest_check = db.execute(
                text("""
                    SELECT interest_id FROM investor_interests 
                    WHERE land_id = :land_id AND investor_id = :user_id
                    AND status IN ('pending', 'approved')
                    AND (withdrawal_requested = FALSE OR withdrawal_status IS NULL OR withdrawal_status != 'approved')
                    LIMIT 1
                """),
                {
                    "land_id": str(task.land_id),
                    "user_id": user_id_str
                }
            ).fetchone()
            
            if interest_check:
                has_access = True
        
        if not has_access:
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
        # Verify subtask exists - explicitly select columns to avoid naming conflicts
        subtask_query = """
            SELECT 
                s.subtask_id, s.task_id, s.title, s.description, s.status,
                s.assigned_to as subtask_assigned_to, s.created_by as subtask_created_by,
                s.created_at, s.updated_at, s.completed_at, s.order_index,
                t.assigned_to as task_assigned_to, 
                t.created_by as task_created_by,
                l.landowner_id,
                l.land_id
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
        is_task_creator = str(subtask.task_created_by) == user_id if subtask.task_created_by else False
        is_landowner = str(subtask.landowner_id) == user_id if subtask.landowner_id else False
        # IMPORTANT: Allow user assigned to the subtask itself (for collaboration)
        # Use aliased column name to avoid conflicts
        is_subtask_assigned = str(subtask.subtask_assigned_to) == user_id if subtask.subtask_assigned_to else False
        
        # Debug logging
        print(f"Permission check - User: {user_id}, Task assigned: {is_task_assigned}, Subtask assigned: {is_subtask_assigned}, Admin: {is_admin}, Task creator: {is_task_creator}, Landowner: {is_landowner}")
        print(f"Subtask assigned_to value: {subtask.subtask_assigned_to}")
        
        # Check if admin is trying to update status
        if is_admin and subtask_data.status is not None and not (is_task_assigned or is_subtask_assigned or is_task_creator or is_landowner):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Administrators can only view subtasks. Only the assigned reviewer can change subtask status."
            )
        
        # Allow task assigned users, subtask assigned users (collaborators), task creators, and landowners to update subtasks
        # Admins can update other fields (like title, description, assigned_to) but not status (checked above)
        if not (is_admin or is_task_assigned or is_subtask_assigned or is_task_creator or is_landowner):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this subtask"
            )
        
        # Additional check: If updating status, only allow if user is assigned to subtask OR task
        if subtask_data.status is not None:
            can_update_status = is_task_assigned or is_subtask_assigned or is_task_creator or is_landowner
            if not (is_admin or can_update_status):
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Only the assigned reviewer or task owner can change subtask status"
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
        
        # Create notification AFTER successful update (to avoid transaction abort issues)
        # Only notify if assignment changed (was None or different user, and now assigned to someone else)
        original_assigned_to = str(subtask.subtask_assigned_to) if subtask.subtask_assigned_to else None
        new_assigned_to = str(subtask_data.assigned_to) if subtask_data.assigned_to is not None else None
        
        # Notify if:
        # 1. New assignment is provided AND
        # 2. It's different from the current user (they're assigning to someone else) AND
        # 3. It's different from the original assignment (actually changed)
        should_notify = (
            new_assigned_to is not None and 
            new_assigned_to != user_id and 
            new_assigned_to != original_assigned_to
        )
        
        print(f"DEBUG: Subtask notification check - original={original_assigned_to}, new={new_assigned_to}, user_id={user_id}, should_notify={should_notify}")
        logger.info(f"Subtask assignment notification check: original={original_assigned_to}, new={new_assigned_to}, current_user={user_id}, should_notify={should_notify}")
        
        if should_notify:
            print(f"DEBUG: Creating subtask notification for {new_assigned_to}")
            try:
                from utils.notifications import notify_subtask_assigned
                logger.info(f"Creating notification for subtask {subtask_id} assignment to {new_assigned_to}")
                
                # Get subtask title from result or original subtask
                subtask_title = result.title if result else (subtask.title if hasattr(subtask, 'title') else 'Subtask')
                # Get land_id from subtask query result - we added it to the query
                land_id = str(subtask.land_id) if hasattr(subtask, 'land_id') and subtask.land_id else None
                
                print(f"DEBUG: Calling notify_subtask_assigned with subtask_id={subtask_id}, task_id={task_id}, assigned_to={new_assigned_to}")
                logger.info(f"Notification params: subtask_id={subtask_id}, task_id={task_id}, title={subtask_title}, assigned_to={new_assigned_to}, land_id={land_id}")
                
                notify_subtask_assigned(
                    db=db,
                    subtask_id=str(subtask_id),
                    task_id=str(task_id),
                    subtask_title=subtask_title,
                    assigned_to=new_assigned_to,
                    land_id=land_id
                )
                print(f"DEBUG: notify_subtask_assigned returned successfully")
                logger.info(f"Notification created successfully for subtask {subtask_id}")
            except Exception as e:
                print(f"DEBUG: ERROR creating subtask notification: {str(e)}")
                # Log error but don't fail the update - notification is non-critical
                # The main update already succeeded, so we just log the notification error
                logger.error(f"Error creating subtask assignment notification (non-critical): {str(e)}", exc_info=True)
                import traceback
                traceback.print_exc()
        else:
            print(f"DEBUG: Not notifying - should_notify=False")
        
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


@router.get("/subtasks/assigned-to-me", response_model=List[dict])
async def get_my_assigned_subtasks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subtasks assigned to the current user (from other reviewers for collaboration)."""
    try:
        user_id = str(current_user["user_id"])
        
        # Get subtasks assigned to current user, excluding those from tasks they own
        query = text("""
            SELECT 
                s.subtask_id,
                s.task_id,
                s.title,
                s.description,
                s.status,
                s.assigned_to,
                s.created_by,
                s.created_at,
                s.updated_at,
                s.completed_at,
                s.order_index,
                t.land_id,
                t.title as task_type,
                t.assigned_role,
                l.title as land_title,
                creator.first_name || ' ' || creator.last_name as creator_name,
                creator.email as creator_email
            FROM subtasks s
            JOIN tasks t ON s.task_id = t.task_id
            JOIN lands l ON t.land_id = l.land_id
            LEFT JOIN "user" creator ON s.created_by = creator.user_id
            WHERE s.assigned_to = CAST(:user_id AS uuid)
              AND t.assigned_to != CAST(:user_id AS uuid)  -- Exclude subtasks from own tasks
            ORDER BY s.created_at DESC
        """)
        
        results = db.execute(query, {"user_id": user_id}).fetchall()
        
        subtasks = []
        for row in results:
            subtasks.append({
                "subtask_id": str(row.subtask_id),
                "task_id": str(row.task_id),
                "title": row.title,
                "description": row.description,
                "status": row.status,
                "assigned_to": str(row.assigned_to) if row.assigned_to else None,
                "created_by": str(row.created_by) if row.created_by else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "completed_at": row.completed_at.isoformat() if row.completed_at else None,
                "order_index": row.order_index,
                "land_id": str(row.land_id),
                "task": {
                    "task_id": str(row.task_id),
                    "task_type": row.task_type,
                    "assigned_role": row.assigned_role,
                    "land_id": str(row.land_id)
                },
                "creator": {
                    "first_name": row.creator_name.split()[0] if row.creator_name else None,
                    "last_name": " ".join(row.creator_name.split()[1:]) if row.creator_name and len(row.creator_name.split()) > 1 else None,
                    "email": row.creator_email
                }
            })
        
        return subtasks
    except Exception as e:
        print(f"Error fetching assigned subtasks: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assigned subtasks: {str(e)}"
        )


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
    task_type: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subtask templates for a role, optionally filtered by task type."""
    
    # Task-type specific subtask templates
    task_specific_subtasks = {
        "re_sales_advisor": {
            "market_evaluation": [
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
            "site_assessment": [
                {"title": "Site accessibility evaluation", "section": "Site Accessibility", "order": 0},
                {"title": "Transportation infrastructure", "section": "Site Accessibility", "order": 1},
                {"title": "Utility connections assessment", "section": "Site Accessibility", "order": 2},
                {"title": "Environmental impact evaluation", "section": "Environmental Assessment", "order": 3},
                {"title": "Wildlife and habitat considerations", "section": "Environmental Assessment", "order": 4},
                {"title": "Soil condition analysis", "section": "Environmental Assessment", "order": 5},
                {"title": "Water resource availability", "section": "Environmental Assessment", "order": 6},
                {"title": "Local community impact", "section": "Social Impact", "order": 7},
                {"title": "Economic benefits to region", "section": "Social Impact", "order": 8},
                {"title": "Stakeholder engagement plan", "section": "Social Impact", "order": 9}
            ]
        },
        "re_analyst": {
            "technical_analysis": [
                {"title": "Site topography analysis", "section": "Technical Analysis", "order": 0},
                {"title": "Wind/solar resource assessment", "section": "Technical Analysis", "order": 1},
                {"title": "Grid connection feasibility", "section": "Technical Analysis", "order": 2},
                {"title": "Technology selection validation", "section": "Technical Analysis", "order": 3},
                {"title": "Performance ratio calculations", "section": "Technical Analysis", "order": 4},
                {"title": "Energy yield estimation", "section": "Technical Analysis", "order": 5}
            ],
            "financial_analysis": [
                {"title": "O&M cost projections", "section": "Financial Analysis", "order": 0},
                {"title": "CAPEX breakdown validation", "section": "Financial Analysis", "order": 1},
                {"title": "LCOE calculations", "section": "Financial Analysis", "order": 2},
                {"title": "Sensitivity analysis", "section": "Financial Analysis", "order": 3},
                {"title": "Cash flow projections", "section": "Financial Analysis", "order": 4},
                {"title": "ROI and payback period", "section": "Financial Analysis", "order": 5},
                {"title": "Risk-adjusted returns", "section": "Financial Analysis", "order": 6},
                {"title": "Tax implications analysis", "section": "Financial Analysis", "order": 7}
            ],
            "document_verification": [
                {"title": "Technical specification review", "section": "Document Review", "order": 0},
                {"title": "Engineering drawings validation", "section": "Document Review", "order": 1},
                {"title": "Equipment specifications check", "section": "Document Review", "order": 2},
                {"title": "Compliance documentation", "section": "Document Review", "order": 3},
                {"title": "Quality assurance standards", "section": "Document Review", "order": 4},
                {"title": "Safety protocol verification", "section": "Document Review", "order": 5}
            ]
        },
        "re_governance_lead": {
            "compliance_review": [
                {"title": "Land ownership documentation", "section": "Legal Compliance", "order": 0},
                {"title": "Zoning and permits verification", "section": "Legal Compliance", "order": 1},
                {"title": "Environmental clearances", "section": "Legal Compliance", "order": 2},
                {"title": "Government NOC validation", "section": "Legal Compliance", "order": 3},
                {"title": "Legal title verification", "section": "Legal Compliance", "order": 4}
            ],
            "regulatory_approval": [
                {"title": "Industry standards compliance", "section": "Regulatory Requirements", "order": 0},
                {"title": "Safety regulations adherence", "section": "Regulatory Requirements", "order": 1},
                {"title": "Environmental regulations", "section": "Regulatory Requirements", "order": 2},
                {"title": "Local authority approvals", "section": "Regulatory Requirements", "order": 3},
                {"title": "Regulatory timeline compliance", "section": "Regulatory Requirements", "order": 4},
                {"title": "Permit application review", "section": "Regulatory Requirements", "order": 5},
                {"title": "Public hearing requirements", "section": "Regulatory Requirements", "order": 6}
            ],
            "environmental_review": [
                {"title": "Environmental impact assessment", "section": "Environmental Review", "order": 0},
                {"title": "Wildlife protection measures", "section": "Environmental Review", "order": 1},
                {"title": "Water resource impact", "section": "Environmental Review", "order": 2},
                {"title": "Air quality considerations", "section": "Environmental Review", "order": 3},
                {"title": "Noise level assessments", "section": "Environmental Review", "order": 4},
                {"title": "Mitigation measures planning", "section": "Environmental Review", "order": 5}
            ]
        }
    }
    
    # Fallback to role-based templates if task_type not found
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
    
    # Get templates based on task_type if provided, otherwise use role-based defaults
    if task_type and role in task_specific_subtasks and task_type in task_specific_subtasks[role]:
        templates = task_specific_subtasks[role][task_type]
    else:
        templates = default_subtasks.get(role, [])
    
    return {
        "role": role,
        "task_type": task_type,
        "templates": templates,
        "count": len(templates)
    }
@router.get("/admin/projects/{project_id}/details-with-tasks", response_model=Dict[str, Any])
async def get_project_details_with_tasks(
    project_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get project details with existing tasks for reviewer assignment (admin only)."""
   
    # Get project details
    project_query = text("""
        SELECT
            l.land_id,
            l.title,
            l.location_text,
            l.land_type,
            l.energy_key,
            l.capacity_mw,
            l.price_per_mwh,
            l.area_acres,
            l.status,
            l.timeline_text,
            l.contract_term_years,
            l.developer_name,
            l.admin_notes,
            l.project_priority,
            l.project_due_date,
            l.created_at,
            l.updated_at,
            l.published_at,
            u.email as landowner_email,
            u.first_name,
            u.last_name,
            u.phone
        FROM lands l
        LEFT JOIN "user" u ON l.landowner_id = u.user_id
        WHERE l.land_id = :project_id
    """)
   
    project_result = db.execute(project_query, {"project_id": str(project_id)}).fetchone()
   
    if not project_result:
        raise HTTPException(status_code=404, detail="Project not found")
   
    # Get existing tasks for this project
    tasks_query = text("""
        SELECT
            t.task_id,
            t.land_id,
            t.title as task_type,
            t.description,
            t.assigned_to,
            t.assigned_role,
            t.status,
            t.priority,
            t.due_date,
            t.created_at,
            t.updated_at,
            u.first_name || ' ' || u.last_name as assigned_to_name
        FROM tasks t
        LEFT JOIN "user" u ON t.assigned_to = u.user_id
        WHERE t.land_id = :project_id
        ORDER BY t.created_at DESC
    """)
   
    tasks_result = db.execute(tasks_query, {"project_id": str(project_id)}).fetchall()
   
    # Format project data
    landowner_name = f"{project_result.first_name or ''} {project_result.last_name or ''}".strip() or project_result.landowner_email
   
    project_data = {
        "id": str(project_result.land_id),
        "title": project_result.title,
        "location_text": project_result.location_text,
        "land_type": project_result.land_type,
        "energy_key": project_result.energy_key,
        "capacity_mw": project_result.capacity_mw,
        "price_per_mwh": float(project_result.price_per_mwh) if project_result.price_per_mwh else 0,
        "area_acres": float(project_result.area_acres) if project_result.area_acres else 0,
        "status": project_result.status,
        "timeline_text": project_result.timeline_text,
        "contract_term_years": project_result.contract_term_years,
        "developer_name": project_result.developer_name,
        "admin_notes": project_result.admin_notes,
        "project_priority": project_result.project_priority,
        "project_due_date": project_result.project_due_date.isoformat() if project_result.project_due_date else None,
        "created_at": project_result.created_at.isoformat() if project_result.created_at else None,
        "updated_at": project_result.updated_at.isoformat() if project_result.updated_at else None,
        "published_at": project_result.published_at.isoformat() if project_result.published_at else None,
        "landownerName": landowner_name,
        "landownerEmail": project_result.landowner_email,
        "landownerPhone": project_result.phone,
        "tasks": []
    }
   
    # Format tasks data
    for task in tasks_result:
        task_data = {
            "task_id": str(task.task_id),
            "land_id": str(task.land_id),
            "task_type": task.task_type,
            "description": task.description,
            "assigned_to": str(task.assigned_to) if task.assigned_to else None,
            "assigned_role": task.assigned_role,
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
            "assigned_to_name": task.assigned_to_name
        }
        project_data["tasks"].append(task_data)
   
    return project_data
 