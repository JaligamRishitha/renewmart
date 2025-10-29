-- ============================================================================
-- Test Notification Creation Queries
-- Use these to manually test notification creation
-- ============================================================================

-- 1. First, find your user ID (replace YOUR_EMAIL with your actual email)
SELECT 
    user_id,
    email,
    first_name || ' ' || last_name as full_name
FROM "user"
WHERE email = 'YOUR_EMAIL@example.com';

-- 2. Create a test notification (replace USER_ID_HERE with your user_id from step 1)
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
    'USER_ID_HERE'::uuid,  -- Replace with your user_id
    'test',
    'Test Notification',
    'This is a test notification. If you see this, the notification system is working!',
    'system',
    '{"test": true, "source": "manual_test"}'::jsonb,
    false,
    now()
);

-- 3. Verify the notification was created
SELECT 
    notification_id,
    type,
    title,
    message,
    category,
    read,
    created_at
FROM notifications
WHERE type = 'test'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Check unread count for your user
SELECT 
    COUNT(*) as unread_count
FROM notifications
WHERE user_id = 'USER_ID_HERE'::uuid  -- Replace with your user_id
  AND read = false;

-- 5. View all your notifications
SELECT 
    notification_id,
    type,
    title,
    message,
    category,
    read,
    created_at
FROM notifications
WHERE user_id = 'USER_ID_HERE'::uuid  -- Replace with your user_id
ORDER BY created_at DESC;

-- 6. Clean up test notifications (optional)
/*
DELETE FROM notifications WHERE type = 'test';
*/

