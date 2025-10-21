-- Quick Fix: Add due_date column as alias to end_date (Optional)
-- This is OPTIONAL - the backend code has been fixed to use end_date instead

-- If you want to add a due_date column for backward compatibility:
-- ALTER TABLE tasks ADD COLUMN due_date DATE;
-- UPDATE tasks SET due_date = end_date;

-- OR if you want to rename end_date to due_date:
-- ALTER TABLE tasks RENAME COLUMN end_date TO due_date;
-- (Note: This would require updating create_tables.py as well)

-- ============================================
-- RECOMMENDED APPROACH: No database changes needed!
-- ============================================
-- The backend code has been updated to use the correct column names.
-- Just restart your backend server:
--
-- Steps:
-- 1. Stop the backend (Ctrl+C)
-- 2. cd renewmart/backend
-- 3. python server.py
--
-- The error should be fixed after restart!

-- ============================================
-- Verify your current schema:
-- ============================================

-- Check if tasks table has the correct columns:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Expected columns:
-- task_id         | uuid
-- land_id         | uuid
-- land_section_id | uuid
-- title           | text
-- description     | text
-- assigned_role   | text
-- assigned_to     | uuid
-- status          | text
-- priority        | text
-- start_date      | date
-- end_date        | date  <-- This is what we use (not due_date)
-- created_by      | uuid
-- created_at      | timestamp with time zone
-- updated_at      | timestamp with time zone

