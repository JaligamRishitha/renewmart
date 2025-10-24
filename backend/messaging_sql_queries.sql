-- =====================================================
-- MESSAGING SYSTEM DATABASE QUERIES
-- =====================================================
-- This file contains comprehensive SQL queries for the messaging system
-- Use these queries for direct database operations, reporting, and analytics

-- =====================================================
-- BASIC MESSAGE QUERIES
-- =====================================================

-- Get all messages for a specific task with sender/recipient info
SELECT 
    m.message_id,
    m.task_id,
    m.thread_id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.is_read,
    m.is_urgent,
    m.created_at,
    m.read_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    s.email as sender_email,
    CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
    r.email as recipient_email,
    t.title as task_title
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN user r ON m.recipient_id = r.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE m.task_id = 'your-task-id-here'
ORDER BY m.created_at DESC
LIMIT 50 OFFSET 0;

-- Get unread messages for a specific user
SELECT 
    m.message_id,
    m.task_id,
    m.content,
    m.is_urgent,
    m.created_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    t.title as task_title
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE (m.recipient_id = 'user-id-here' OR m.recipient_id IS NULL)
AND m.is_read = FALSE
AND m.sender_id != 'user-id-here'
ORDER BY m.created_at DESC;

-- Get urgent messages for a user
SELECT 
    m.message_id,
    m.task_id,
    m.content,
    m.created_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    t.title as task_title
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE (m.recipient_id = 'user-id-here' OR m.recipient_id IS NULL)
AND m.is_urgent = TRUE
AND m.sender_id != 'user-id-here'
ORDER BY m.created_at DESC;

-- =====================================================
-- MESSAGE STATISTICS QUERIES
-- =====================================================

-- Get message count and statistics for a task
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
    COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_last_week,
    MIN(created_at) as first_message,
    MAX(created_at) as last_message
FROM messages
WHERE task_id = 'your-task-id-here';

-- Get user message statistics
SELECT 
    COUNT(CASE WHEN sender_id = 'user-id-here' THEN 1 END) as messages_sent,
    COUNT(CASE WHEN recipient_id = 'user-id-here' OR (recipient_id IS NULL AND sender_id != 'user-id-here') THEN 1 END) as messages_received,
    COUNT(CASE WHEN is_urgent = TRUE AND sender_id = 'user-id-here' THEN 1 END) as urgent_sent,
    COUNT(CASE WHEN is_urgent = TRUE AND (recipient_id = 'user-id-here' OR (recipient_id IS NULL AND sender_id != 'user-id-here')) THEN 1 END) as urgent_received,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' AND sender_id = 'user-id-here' THEN 1 END) as messages_sent_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' AND (recipient_id = 'user-id-here' OR (recipient_id IS NULL AND sender_id != 'user-id-here')) THEN 1 END) as messages_received_week
FROM messages;

-- Get unread message count for a user
SELECT COUNT(*) as unread_count
FROM messages
WHERE (recipient_id = 'user-id-here' OR recipient_id IS NULL)
AND is_read = FALSE
AND sender_id != 'user-id-here';

-- =====================================================
-- THREAD QUERIES
-- =====================================================

-- Get all threads for a task with message counts
SELECT 
    mt.thread_id,
    mt.title,
    mt.is_active,
    mt.created_at,
    mt.updated_at,
    CONCAT(u.first_name, ' ', u.last_name) as creator_name,
    COUNT(m.message_id) as message_count,
    MAX(m.created_at) as last_message_at
FROM message_threads mt
LEFT JOIN user u ON mt.created_by = u.user_id
LEFT JOIN messages m ON mt.thread_id = m.thread_id
WHERE mt.task_id = 'your-task-id-here'
GROUP BY mt.thread_id, mt.title, mt.is_active, mt.created_at, mt.updated_at, u.first_name, u.last_name
ORDER BY mt.updated_at DESC;

-- Get messages within a specific thread
SELECT 
    m.message_id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.is_read,
    m.is_urgent,
    m.created_at,
    m.read_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    CONCAT(r.first_name, ' ', r.last_name) as recipient_name
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN user r ON m.recipient_id = r.user_id
WHERE m.thread_id = 'your-thread-id-here'
ORDER BY m.created_at ASC;

-- =====================================================
-- SEARCH QUERIES
-- =====================================================

-- Search messages by content
SELECT 
    m.message_id,
    m.task_id,
    m.content,
    m.is_urgent,
    m.created_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    t.title as task_title
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE (m.sender_id = 'user-id-here' OR m.recipient_id = 'user-id-here' OR m.recipient_id IS NULL)
AND m.content ILIKE '%search-term%'
ORDER BY m.created_at DESC;

-- Search messages by sender
SELECT 
    m.message_id,
    m.task_id,
    m.content,
    m.created_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    t.title as task_title
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE (m.sender_id = 'user-id-here' OR m.recipient_id = 'user-id-here' OR m.recipient_id IS NULL)
AND CONCAT(s.first_name, ' ', s.last_name) ILIKE '%sender-name%'
ORDER BY m.created_at DESC;

-- =====================================================
-- ANALYTICS QUERIES
-- =====================================================

-- Get messaging analytics for the last 30 days
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
    COUNT(DISTINCT sender_id) as active_senders,
    COUNT(DISTINCT task_id) as tasks_with_messages,
    AVG(CASE WHEN read_at IS NOT NULL THEN EXTRACT(EPOCH FROM (read_at - created_at))/60 END) as avg_read_time_minutes,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as messages_today,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_week
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Get daily message counts for the last 30 days
SELECT 
    DATE(created_at) as message_date,
    COUNT(*) as message_count,
    COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_count
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY message_date DESC;

-- Get most active users by message count
SELECT 
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    u.email,
    COUNT(m.message_id) as message_count,
    COUNT(CASE WHEN m.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_week
FROM user u
LEFT JOIN messages m ON u.user_id = m.sender_id
GROUP BY u.user_id, u.first_name, u.last_name, u.email
ORDER BY message_count DESC
LIMIT 10;

-- Get tasks with most message activity
SELECT 
    t.task_id,
    t.title as task_title,
    t.status as task_status,
    COUNT(m.message_id) as message_count,
    COUNT(CASE WHEN m.is_urgent = TRUE THEN 1 END) as urgent_count,
    MAX(m.created_at) as last_message_at
FROM tasks t
LEFT JOIN messages m ON t.task_id = m.task_id
GROUP BY t.task_id, t.title, t.status
HAVING COUNT(m.message_id) > 0
ORDER BY message_count DESC
LIMIT 20;

-- =====================================================
-- REACTION QUERIES
-- =====================================================

-- Get reactions for a specific message
SELECT 
    mr.reaction_id,
    mr.reaction_type,
    mr.created_at,
    CONCAT(u.first_name, ' ', u.last_name) as user_name
FROM message_reactions mr
LEFT JOIN user u ON mr.user_id = u.user_id
WHERE mr.message_id = 'your-message-id-here'
ORDER BY mr.created_at ASC;

-- Get reaction summary for a message
SELECT 
    reaction_type,
    COUNT(*) as count
FROM message_reactions
WHERE message_id = 'your-message-id-here'
GROUP BY reaction_type
ORDER BY count DESC;

-- Get most reacted messages
SELECT 
    m.message_id,
    m.content,
    m.created_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    COUNT(mr.reaction_id) as reaction_count
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN message_reactions mr ON m.message_id = mr.message_id
GROUP BY m.message_id, m.content, m.created_at, s.first_name, s.last_name
HAVING COUNT(mr.reaction_id) > 0
ORDER BY reaction_count DESC
LIMIT 10;

-- =====================================================
-- USER ACTIVITY QUERIES
-- =====================================================

-- Get user's tasks with messages
SELECT DISTINCT
    t.task_id,
    t.title as task_title,
    t.status as task_status,
    COUNT(m.message_id) as message_count,
    MAX(m.created_at) as last_message_at,
    COUNT(CASE WHEN m.is_urgent = TRUE THEN 1 END) as urgent_count
FROM tasks t
LEFT JOIN messages m ON t.task_id = m.task_id
WHERE (m.sender_id = 'user-id-here' OR m.recipient_id = 'user-id-here' OR m.recipient_id IS NULL)
GROUP BY t.task_id, t.title, t.status
HAVING COUNT(m.message_id) > 0
ORDER BY last_message_at DESC;

-- Get recent message activity for a user
SELECT 
    m.message_id,
    m.task_id,
    m.content,
    m.is_urgent,
    m.created_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    t.title as task_title,
    CASE 
        WHEN m.sender_id = 'user-id-here' THEN 'sent'
        ELSE 'received'
    END as message_direction
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE (m.sender_id = 'user-id-here' OR m.recipient_id = 'user-id-here' OR m.recipient_id IS NULL)
AND m.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY m.created_at DESC;

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Mark messages as read for a user
UPDATE messages 
SET is_read = TRUE, read_at = NOW()
WHERE message_id = ANY(ARRAY['message-id-1', 'message-id-2', 'message-id-3'])
AND (recipient_id = 'user-id-here' OR recipient_id IS NULL);

-- Delete old system messages (older than 90 days)
DELETE FROM messages 
WHERE created_at < NOW() - INTERVAL '90 days'
AND message_type = 'system';

-- Get message activity by hour of day
SELECT 
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(*) as message_count
FROM messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour_of_day;

-- Get message activity by day of week
SELECT 
    EXTRACT(DOW FROM created_at) as day_of_week,
    CASE EXTRACT(DOW FROM created_at)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    COUNT(*) as message_count
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(DOW FROM created_at)
ORDER BY day_of_week;

-- =====================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- =====================================================

-- Create indexes for better performance (run these after table creation)
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_urgent ON messages(is_urgent);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

CREATE INDEX IF NOT EXISTS idx_message_threads_task_id ON message_threads(task_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- =====================================================
-- DATA EXPORT QUERIES
-- =====================================================

-- Export all messages for a task (for backup/analysis)
SELECT 
    m.message_id,
    m.task_id,
    m.thread_id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.is_read,
    m.is_urgent,
    m.created_at,
    m.read_at,
    CONCAT(s.first_name, ' ', s.last_name) as sender_name,
    s.email as sender_email,
    CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
    r.email as recipient_email,
    t.title as task_title
FROM messages m
LEFT JOIN user s ON m.sender_id = s.user_id
LEFT JOIN user r ON m.recipient_id = r.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id
WHERE m.task_id = 'your-task-id-here'
ORDER BY m.created_at ASC;

-- Export user messaging activity
SELECT 
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    u.email,
    COUNT(CASE WHEN m.sender_id = u.user_id THEN 1 END) as messages_sent,
    COUNT(CASE WHEN m.recipient_id = u.user_id OR (m.recipient_id IS NULL AND m.sender_id != u.user_id) THEN 1 END) as messages_received,
    COUNT(CASE WHEN m.is_urgent = TRUE AND m.sender_id = u.user_id THEN 1 END) as urgent_sent,
    COUNT(CASE WHEN m.is_urgent = TRUE AND (m.recipient_id = u.user_id OR (m.recipient_id IS NULL AND m.sender_id != u.user_id)) THEN 1 END) as urgent_received,
    MAX(m.created_at) as last_activity
FROM user u
LEFT JOIN messages m ON u.user_id = m.sender_id OR u.user_id = m.recipient_id
GROUP BY u.user_id, u.first_name, u.last_name, u.email
ORDER BY last_activity DESC;
