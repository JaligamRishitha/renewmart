-- Add task_id column to documents table for task-specific document uploads
-- Migration: Add task_documents support
-- Date: 2025-10-17

-- Add task_id column (nullable for backwards compatibility)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE;

-- Add document status column for approval workflow
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add approved_by column to track who approved the document
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES "user"(user_id) ON DELETE SET NULL;

-- Add approved_at column to track when the document was approved
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add rejection_reason column for admin feedback
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add comments column for admin comments
ALTER TABLE documents ADD COLUMN IF NOT EXISTS admin_comments TEXT;

-- Create index for task_id for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);

-- Create index for status for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Add comments
COMMENT ON COLUMN documents.task_id IS 'Optional task_id for documents uploaded by reviewers for specific tasks';
COMMENT ON COLUMN documents.status IS 'Document approval status: pending, approved, rejected';
COMMENT ON COLUMN documents.approved_by IS 'User ID of admin who approved/rejected the document';
COMMENT ON COLUMN documents.approved_at IS 'Timestamp when document was approved/rejected';
COMMENT ON COLUMN documents.rejection_reason IS 'Reason for rejection if document was rejected';
COMMENT ON COLUMN documents.admin_comments IS 'Admin comments on the document';

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '  ✓ Added task_id column to documents';
  RAISE NOTICE '  ✓ Added status column (pending/approved/rejected)';
  RAISE NOTICE '  ✓ Added approved_by column';
  RAISE NOTICE '  ✓ Added approved_at column';
  RAISE NOTICE '  ✓ Added rejection_reason column';
  RAISE NOTICE '  ✓ Added admin_comments column';
  RAISE NOTICE '  ✓ Created indexes for performance';
END $$;

