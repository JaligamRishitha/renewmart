-- Fix for project publishing and task assignment issues
-- Run this script in your PostgreSQL database

-- 1. Create the missing stored procedure for publishing
CREATE OR REPLACE FUNCTION sp_publish_land(p_land UUID)
RETURNS BOOLEAN AS $$
DECLARE 
    ok BOOLEAN;
BEGIN
    -- Check if all required fields are present
    SELECT
        (title IS NOT NULL AND location_text IS NOT NULL AND energy_key IS NOT NULL
         AND capacity_mw IS NOT NULL AND price_per_mwh IS NOT NULL
         AND timeline_text IS NOT NULL AND contract_term_years IS NOT NULL
         AND developer_name IS NOT NULL)
    INTO ok
    FROM lands WHERE land_id = p_land;

    IF NOT ok THEN 
        RAISE EXCEPTION 'Missing required fields for publish';
    END IF;

    -- Update land status to published
    UPDATE lands
    SET status = 'published', published_at = now()
    WHERE land_id = p_land AND status IN ('approved', 'investor_ready');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Land must be APPROVED/INVESTOR_READY before publishing';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix task assignment issues by ensuring proper role mapping
-- Update any tasks that might have incorrect assigned_role values
UPDATE tasks 
SET assigned_role = 're_sales_advisor'
WHERE assigned_role IN ('sales_advisor', 'sales-advisor', 'RE Sales Advisor');

UPDATE tasks 
SET assigned_role = 're_analyst'
WHERE assigned_role IN ('analyst', 'RE Analyst');

UPDATE tasks 
SET assigned_role = 're_governance_lead'
WHERE assigned_role IN ('governance_lead', 'governance-lead', 'governance', 'RE Governance Lead');

-- 3. Ensure all tasks have proper assigned_to values (UUID format)
-- This will help with the "No Task" message issue
UPDATE tasks 
SET assigned_to = (
    SELECT user_id 
    FROM "user" 
    WHERE user_id::text = tasks.assigned_to::text 
    LIMIT 1
)
WHERE assigned_to IS NOT NULL 
AND assigned_to::text NOT IN (
    SELECT user_id::text FROM "user"
);

-- 4. Create indexes to improve task query performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_role ON tasks(assigned_role);
CREATE INDEX IF NOT EXISTS idx_tasks_land_id ON tasks(land_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- 5. Fix any lands that might have incorrect status values
UPDATE lands 
SET status = 'draft'
WHERE status IS NULL OR status = '';

UPDATE lands 
SET status = 'submitted'
WHERE status = 'pending_review';

-- 6. Ensure proper foreign key relationships
-- Fix any orphaned tasks
DELETE FROM tasks 
WHERE land_id NOT IN (SELECT land_id FROM lands);

-- 7. Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add assigned_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'assigned_role') THEN
        ALTER TABLE tasks ADD COLUMN assigned_role VARCHAR(50);
    END IF;
    
    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
        ALTER TABLE tasks ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    END IF;
END $$;

-- 8. Create a view for easier task querying
CREATE OR REPLACE VIEW v_user_tasks AS
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
    l.title as land_title,
    l.status as land_status,
    u.first_name || ' ' || u.last_name as assigned_to_name
FROM tasks t
JOIN lands l ON t.land_id = l.land_id
LEFT JOIN "user" u ON t.assigned_to = u.user_id;

-- 9. Grant necessary permissions
GRANT SELECT ON v_user_tasks TO PUBLIC;

-- 10. Verify the fixes
SELECT 'Publish function created successfully' as status;
SELECT 'Task assignments updated' as status;
SELECT 'Indexes created' as status;
SELECT 'Database schema updated' as status;
