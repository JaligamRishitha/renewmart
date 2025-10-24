-- =====================================================
-- MESSAGING SYSTEM TABLES CREATION FOR PGADMIN
-- =====================================================
-- Run this script in pgAdmin to create all messaging tables
-- Make sure you have the required foreign key tables (user, tasks) first

-- =====================================================
-- 1. CREATE MESSAGE THREADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS message_threads (
    thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_message_threads_task_id 
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_threads_created_by 
        FOREIGN KEY (created_by) REFERENCES "user"(user_id) ON DELETE CASCADE
);

-- Add comment to table
COMMENT ON TABLE message_threads IS 'Message threads for organizing conversations within tasks';

-- Add comments to columns
COMMENT ON COLUMN message_threads.thread_id IS 'Unique identifier for the message thread';
COMMENT ON COLUMN message_threads.task_id IS 'Reference to the task this thread belongs to';
COMMENT ON COLUMN message_threads.title IS 'Title of the message thread';
COMMENT ON COLUMN message_threads.created_by IS 'User who created the thread';
COMMENT ON COLUMN message_threads.is_active IS 'Whether the thread is still active';
COMMENT ON COLUMN message_threads.created_at IS 'When the thread was created';
COMMENT ON COLUMN message_threads.updated_at IS 'When the thread was last updated';

-- =====================================================
-- 2. CREATE MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    thread_id UUID,
    sender_id UUID NOT NULL,
    recipient_id UUID,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    CONSTRAINT fk_messages_task_id 
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_thread_id 
        FOREIGN KEY (thread_id) REFERENCES message_threads(thread_id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender_id 
        FOREIGN KEY (sender_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_recipient_id 
        FOREIGN KEY (recipient_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_messages_content_not_empty 
        CHECK (LENGTH(TRIM(content)) > 0),
    CONSTRAINT chk_messages_type_valid 
        CHECK (message_type IN ('text', 'system', 'notification', 'urgent')),
    CONSTRAINT chk_messages_read_at_consistency 
        CHECK ((is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE AND read_at IS NOT NULL))
);

-- Add comment to table
COMMENT ON TABLE messages IS 'Messages for real-time communication between users';

-- Add comments to columns
COMMENT ON COLUMN messages.message_id IS 'Unique identifier for the message';
COMMENT ON COLUMN messages.task_id IS 'Reference to the task this message belongs to';
COMMENT ON COLUMN messages.thread_id IS 'Reference to the message thread (optional)';
COMMENT ON COLUMN messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN messages.recipient_id IS 'User who should receive the message (NULL for broadcast)';
COMMENT ON COLUMN messages.content IS 'Message content/text';
COMMENT ON COLUMN messages.message_type IS 'Type of message (text, system, notification, urgent)';
COMMENT ON COLUMN messages.is_read IS 'Whether the message has been read';
COMMENT ON COLUMN messages.is_urgent IS 'Whether the message is marked as urgent';
COMMENT ON COLUMN messages.created_at IS 'When the message was created';
COMMENT ON COLUMN messages.read_at IS 'When the message was read';

-- =====================================================
-- 3. CREATE MESSAGE REACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS message_reactions (
    reaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_message_reactions_message_id 
        FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_reactions_user_id 
        FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate reactions
    CONSTRAINT uk_message_reactions_user_message 
        UNIQUE (user_id, message_id, reaction_type),
    
    -- Check constraints
    CONSTRAINT chk_message_reactions_type_not_empty 
        CHECK (LENGTH(TRIM(reaction_type)) > 0)
);

-- Add comment to table
COMMENT ON TABLE message_reactions IS 'Reactions (likes, emojis) for messages';

-- Add comments to columns
COMMENT ON COLUMN message_reactions.reaction_id IS 'Unique identifier for the reaction';
COMMENT ON COLUMN message_reactions.message_id IS 'Reference to the message being reacted to';
COMMENT ON COLUMN message_reactions.user_id IS 'User who made the reaction';
COMMENT ON COLUMN message_reactions.reaction_type IS 'Type of reaction (like, emoji, etc.)';
COMMENT ON COLUMN message_reactions.created_at IS 'When the reaction was created';

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Message table indexes
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_urgent ON messages(is_urgent);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, is_read) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_task_created ON messages(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON messages(sender_id, created_at);

-- Message threads table indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_task_id ON message_threads(task_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_is_active ON message_threads(is_active);
CREATE INDEX IF NOT EXISTS idx_message_threads_updated_at ON message_threads(updated_at);

-- Message reactions table indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_type ON message_reactions(reaction_type);

-- =====================================================
-- 5. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for message_threads updated_at
CREATE TRIGGER update_message_threads_updated_at 
    BEFORE UPDATE ON message_threads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for messages with user information
CREATE OR REPLACE VIEW v_messages_with_users AS
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
LEFT JOIN "user" s ON m.sender_id = s.user_id
LEFT JOIN "user" r ON m.recipient_id = r.user_id
LEFT JOIN tasks t ON m.task_id = t.task_id;

-- View for message statistics
CREATE OR REPLACE VIEW v_message_stats AS
SELECT 
    task_id,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN is_urgent = TRUE THEN 1 END) as urgent_messages,
    COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_last_week,
    MIN(created_at) as first_message,
    MAX(created_at) as last_message
FROM messages
GROUP BY task_id;

-- View for user message activity
CREATE OR REPLACE VIEW v_user_message_activity AS
SELECT 
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    u.email,
    COUNT(CASE WHEN m.sender_id = u.user_id THEN 1 END) as messages_sent,
    COUNT(CASE WHEN m.recipient_id = u.user_id OR (m.recipient_id IS NULL AND m.sender_id != u.user_id) THEN 1 END) as messages_received,
    COUNT(CASE WHEN m.is_urgent = TRUE AND m.sender_id = u.user_id THEN 1 END) as urgent_sent,
    COUNT(CASE WHEN m.is_urgent = TRUE AND (m.recipient_id = u.user_id OR (m.recipient_id IS NULL AND m.sender_id != u.user_id)) THEN 1 END) as urgent_received,
    MAX(m.created_at) as last_activity
FROM "user" u
LEFT JOIN messages m ON u.user_id = m.sender_id OR u.user_id = m.recipient_id
GROUP BY u.user_id, u.first_name, u.last_name, u.email;

-- =====================================================
-- 7. INSERT SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Uncomment the following section if you want to insert sample data

/*
-- Insert sample message thread
INSERT INTO message_threads (task_id, title, created_by) 
VALUES (
    (SELECT task_id FROM tasks LIMIT 1), 
    'General Discussion', 
    (SELECT user_id FROM "user" WHERE roles LIKE '%administrator%' LIMIT 1)
);

-- Insert sample messages
INSERT INTO messages (task_id, thread_id, sender_id, content, message_type) 
VALUES 
(
    (SELECT task_id FROM tasks LIMIT 1),
    (SELECT thread_id FROM message_threads LIMIT 1),
    (SELECT user_id FROM "user" WHERE roles LIKE '%administrator%' LIMIT 1),
    'Welcome to the messaging system!',
    'system'
),
(
    (SELECT task_id FROM tasks LIMIT 1),
    (SELECT thread_id FROM message_threads LIMIT 1),
    (SELECT user_id FROM "user" WHERE roles LIKE '%administrator%' LIMIT 1),
    'This is a test message.',
    'text'
);
*/

-- =====================================================
-- 8. GRANT PERMISSIONS (ADJUST AS NEEDED)
-- =====================================================

-- Grant permissions to your application user
-- Replace 'your_app_user' with your actual application database user

/*
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO your_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_threads TO your_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_reactions TO your_app_user;
GRANT USAGE ON SEQUENCE messages_message_id_seq TO your_app_user;
GRANT USAGE ON SEQUENCE message_threads_thread_id_seq TO your_app_user;
GRANT USAGE ON SEQUENCE message_reactions_reaction_id_seq TO your_app_user;
*/

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'message_threads', 'message_reactions')
ORDER BY table_name;

-- Check if indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('messages', 'message_threads', 'message_reactions')
ORDER BY tablename, indexname;

-- Check if views were created
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE 'v_%'
ORDER BY viewname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Messaging system tables created successfully!';
    RAISE NOTICE 'Tables created: messages, message_threads, message_reactions';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'Views created: v_messages_with_users, v_message_stats, v_user_message_activity';
    RAISE NOTICE 'Triggers created for automatic timestamp updates';
    RAISE NOTICE 'You can now use the messaging system in your application!';
END $$;
