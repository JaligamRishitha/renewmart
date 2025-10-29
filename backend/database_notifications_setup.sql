-- ============================================================================
-- Notifications Table Setup
-- Run this in pgAdmin Query Tool
-- ============================================================================

-- Create notifications table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- Verify table creation
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

