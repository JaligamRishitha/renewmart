-- ============================================================================
-- Notification System Diagnostic Queries
-- Run these in pgAdmin to check your notifications setup
-- ============================================================================

-- 1. Check if notifications table exists
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) as table_exists;

-- 2. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 3. Check if you have any notifications
SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) FILTER (WHERE read = true) as read_count
FROM notifications;

-- 4. View all notifications (if any exist)
SELECT 
    notification_id,
    user_id,
    type,
    title,
    message,
    category,
    read,
    created_at,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name
FROM notifications n
LEFT JOIN "user" u ON n.user_id = u.user_id
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check notifications for a specific user (replace USER_EMAIL_HERE with your email)
SELECT 
    n.notification_id,
    n.type,
    n.title,
    n.message,
    n.category,
    n.read,
    n.created_at,
    n.data
FROM notifications n
JOIN "user" u ON n.user_id = u.user_id
WHERE u.email = 'USER_EMAIL_HERE'
ORDER BY n.created_at DESC;

-- 6. Test creating a notification manually (replace USER_ID_HERE with actual UUID)
/*
INSERT INTO notifications (
    notification_id,
    user_id,
    type,
    title,
    message,
    category,
    data,
    read,
    created_at
) VALUES (
    gen_random_uuid(),
    'USER_ID_HERE'::uuid,
    'test',
    'Test Notification',
    'This is a test notification to verify the system is working',
    'system',
    '{"test": true}'::jsonb,
    false,
    now()
);

-- Verify it was created
SELECT * FROM notifications WHERE type = 'test' ORDER BY created_at DESC LIMIT 1;
*/

-- 7. Get your user ID for testing (replace with your email)
SELECT 
    user_id,
    email,
    first_name || ' ' || last_name as full_name,
    is_active
FROM "user"
WHERE email = 'YOUR_EMAIL_HERE';

