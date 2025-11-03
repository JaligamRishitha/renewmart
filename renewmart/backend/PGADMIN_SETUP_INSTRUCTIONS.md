# PostgreSQL Database Setup for Collaboration Feature

## Option 1: If You Already Have Database Tables (Recommended)

Run this file in pgAdmin Query Tool:
**`collaboration_only_setup.sql`**

This will:
- Create the `subtasks` table if it doesn't exist
- Add all necessary indexes for performance
- Create triggers for auto-updating timestamps

## Option 2: Complete Fresh Database Setup

Run this file in pgAdmin Query Tool:
**`complete_database_setup.sql`**

This includes:
- All lookup tables (roles, status, energy types)
- User and RBAC tables
- Lands, sections, documents tables
- Tasks and task history tables
- **Subtasks table** (for collaboration)
- Review status table
- Investor interests table
- All indexes and triggers
- Seed data

## Quick Setup (Minimum Required)

If you only need the subtasks table, run this in pgAdmin:

```sql
-- Create subtasks table for collaboration
CREATE TABLE IF NOT EXISTS subtasks (
    subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_to UUID REFERENCES "user"(user_id),
    created_by UUID NOT NULL REFERENCES "user"(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);

-- Trigger for auto-update timestamp
CREATE OR REPLACE FUNCTION trg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_subtasks ON subtasks;
CREATE TRIGGER trg_touch_subtasks 
BEFORE UPDATE ON subtasks
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();
```

## Verification Queries

After running the setup, verify with these queries:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'subtasks';

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subtasks' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'subtasks';
```

