-- ============================================================================
-- RenewMart Collaboration Feature - Database Setup Script
-- Run this in pgAdmin Query Tool connected to your database
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SUBTASKS TABLE (Required for Collaboration Feature)
-- ============================================================================
-- This table stores subtasks that can be assigned to collaborators
CREATE TABLE IF NOT EXISTS subtasks (
    subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES "user"(user_id),  -- For collaboration: assigns subtask to another reviewer
    created_by UUID NOT NULL REFERENCES "user"(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0
);

-- ============================================================================
-- INDEXES FOR SUBTASKS (Performance Optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_by ON subtasks(created_by);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_at ON subtasks(created_at DESC);

-- ============================================================================
-- TRIGGER FOR SUBTASKS UPDATED_AT
-- ============================================================================
-- Auto-update updated_at timestamp on subtask changes
DROP TRIGGER IF EXISTS trg_touch_subtasks ON subtasks;
CREATE TRIGGER trg_touch_subtasks 
BEFORE UPDATE ON subtasks
FOR EACH ROW 
EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (Run after setup to verify)
-- ============================================================================
-- Check if subtasks table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subtasks' 
ORDER BY ordinal_position;

-- Check indexes on subtasks
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'subtasks';

-- ============================================================================
-- SAMPLE DATA QUERIES (Optional - for testing)
-- ============================================================================
-- View all subtasks with their assignment details
/*
SELECT 
    s.subtask_id,
    s.title,
    s.status,
    s.assigned_to,
    assignee.first_name || ' ' || assignee.last_name as assigned_to_name,
    s.created_by,
    creator.first_name || ' ' || creator.last_name as created_by_name,
    t.task_id,
    t.title as task_type,
    t.assigned_to as task_owner_id,
    task_owner.first_name || ' ' || task_owner.last_name as task_owner_name,
    l.title as project_title
FROM subtasks s
JOIN tasks t ON s.task_id = t.task_id
JOIN lands l ON t.land_id = l.land_id
LEFT JOIN "user" assignee ON s.assigned_to = assignee.user_id
LEFT JOIN "user" creator ON s.created_by = creator.user_id
LEFT JOIN "user" task_owner ON t.assigned_to = task_owner.user_id
ORDER BY s.created_at DESC;
*/

-- View collaboration work (subtasks assigned to you from other reviewers)
/*
SELECT 
    s.subtask_id,
    s.title,
    s.description,
    s.status,
    t.task_id,
    t.title as task_type,
    l.land_id,
    l.title as project_title,
    creator.first_name || ' ' || creator.last_name as assigned_by_name,
    creator.email as assigned_by_email
FROM subtasks s
JOIN tasks t ON s.task_id = t.task_id
JOIN lands l ON t.land_id = l.land_id
LEFT JOIN "user" creator ON s.created_by = creator.user_id
WHERE s.assigned_to = 'YOUR_USER_ID_HERE'  -- Replace with actual user_id
  AND t.assigned_to != 'YOUR_USER_ID_HERE'  -- Exclude your own tasks
ORDER BY s.created_at DESC;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The subtasks table uses the existing tasks and user tables
-- 2. The assigned_to column in subtasks enables collaboration:
--    - NULL or task owner's ID = regular subtask
--    - Different user ID = collaboration subtask assigned to that user
-- 3. The backend API endpoint /api/tasks/subtasks/assigned-to-me fetches
--    subtasks where assigned_to = current_user AND task.assigned_to != current_user
-- ============================================================================

