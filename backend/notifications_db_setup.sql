-- ============================================================================
-- Notifications Feature - Database Setup Script
-- Run this in pgAdmin Query Tool connected to your database
-- ============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL,  -- task_assigned, project_uploaded, document_version, subtask_assigned, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT,  -- task, project, document, system, collaboration
    data JSONB,  -- Additional data (land_id, task_id, document_id, etc.)
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Index for user lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Index for unread notifications (frequently queried)
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;

-- Index for sorting by creation date (default sort order)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Index for filtering by notification type
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category) WHERE category IS NOT NULL;

-- Composite index for common query pattern: get user's unread notifications sorted by date
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);

-- Index for reading timestamp (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (Run after setup to verify)
-- ============================================================================

-- Check if table exists and has correct structure
SELECT 
    'Table Check' as check_type,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check all indexes on notifications table
SELECT 
    'Index Check' as check_type,
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications'
ORDER BY indexname;

-- Check foreign key constraints
SELECT
    'Foreign Key Check' as check_type,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'notifications';

-- Count existing notifications
SELECT 
    'Data Check' as check_type,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) FILTER (WHERE read = true) as read_count
FROM notifications;

-- ============================================================================
-- SAMPLE DATA QUERIES (For Testing - Optional)
-- ============================================================================

-- View all notifications with user details
/*
SELECT 
    n.notification_id,
    n.type,
    n.title,
    n.message,
    n.category,
    n.read,
    n.created_at,
    n.read_at,
    u.first_name || ' ' || u.last_name as user_name,
    u.email as user_email
FROM notifications n
JOIN "user" u ON n.user_id = u.user_id
ORDER BY n.created_at DESC
LIMIT 20;
*/

-- View unread notifications for a specific user (replace USER_ID_HERE)
/*
SELECT 
    n.notification_id,
    n.type,
    n.title,
    n.message,
    n.category,
    n.data,
    n.created_at
FROM notifications n
WHERE n.user_id = 'USER_ID_HERE'::uuid
  AND n.read = false
ORDER BY n.created_at DESC;
*/

-- View notifications by type
/*
SELECT 
    type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE read = false) as unread_count
FROM notifications
GROUP BY type
ORDER BY count DESC;
*/

-- View notifications by category
/*
SELECT 
    category,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE read = false) as unread_count
FROM notifications
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
*/

-- ============================================================================
-- MAINTENANCE QUERIES (Optional - for cleanup)
-- ============================================================================

-- Delete old read notifications (older than 90 days)
/*
DELETE FROM notifications
WHERE read = true 
  AND read_at < NOW() - INTERVAL '90 days';
*/

-- Delete all notifications older than 180 days
/*
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '180 days';
*/

-- Mark all notifications as read for a specific user (replace USER_ID_HERE)
/*
UPDATE notifications
SET read = true, read_at = NOW()
WHERE user_id = 'USER_ID_HERE'::uuid
  AND read = false;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The notifications table stores all user notifications
-- 2. Notifications are automatically created when:
--    - Tasks are assigned
--    - Projects are submitted
--    - Documents are uploaded
--    - Subtasks are assigned (collaboration)
-- 3. Notifications can be:
--    - Read/unread (tracked by 'read' boolean)
--    - Categorized by type (task, project, document, etc.)
--    - Linked to related entities via 'data' JSONB field
-- 4. The foreign key on user_id ensures notifications are deleted when user is deleted
-- ============================================================================

