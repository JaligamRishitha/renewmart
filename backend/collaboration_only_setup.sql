-- ============================================================================
-- Collaboration Feature - Subtasks Table Setup Only
-- Run this if you already have the main database tables and just need subtasks
-- ============================================================================

-- Check if subtasks table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subtasks') THEN
        
        -- Create subtasks table
        CREATE TABLE subtasks (
            subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
            assigned_to UUID REFERENCES "user"(user_id),  -- For collaboration
            created_by UUID NOT NULL REFERENCES "user"(user_id),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            completed_at TIMESTAMPTZ,
            order_index INTEGER DEFAULT 0
        );

        -- Create indexes for performance
        CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
        CREATE INDEX idx_subtasks_assigned_to ON subtasks(assigned_to) WHERE assigned_to IS NOT NULL;
        CREATE INDEX idx_subtasks_status ON subtasks(status);
        CREATE INDEX idx_subtasks_created_by ON subtasks(created_by);
        CREATE INDEX idx_subtasks_created_at ON subtasks(created_at DESC);
        CREATE INDEX idx_subtasks_completed_at ON subtasks(completed_at) WHERE completed_at IS NOT NULL;

        -- Create trigger for updated_at
        CREATE TRIGGER trg_touch_subtasks 
        BEFORE UPDATE ON subtasks
        FOR EACH ROW 
        EXECUTE FUNCTION trg_touch_updated_at();

        RAISE NOTICE 'Subtasks table created successfully';
    ELSE
        RAISE NOTICE 'Subtasks table already exists';
    END IF;
END $$;

-- Verify table creation
SELECT 
    'Subtasks table created' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'subtasks';

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'subtasks';

