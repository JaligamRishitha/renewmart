-- Add subtask_id column to documents table for subtask-specific uploads
-- Migration: Add subtask document support
-- Date: 2025-10-17

-- 1. Add subtask_id column (nullable for backwards compatibility)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS subtask_id UUID REFERENCES subtasks(subtask_id) ON DELETE CASCADE;

-- 2. Create index for subtask_id for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_subtask_id ON documents(subtask_id);

-- 3. Add comment
COMMENT ON COLUMN documents.subtask_id IS 'Optional subtask_id for documents uploaded by reviewers for specific subtasks';

-- 4. Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Subtask document migration completed successfully!';
  RAISE NOTICE '   ✓ Added subtask_id column to documents';
  RAISE NOTICE '   ✓ Created index for performance';
  RAISE NOTICE '   ℹ Reviewers can now upload multiple documents per subtask';
END $$;


