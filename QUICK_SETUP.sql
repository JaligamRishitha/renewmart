-- ========================================
-- QUICK SETUP - Run All Migrations
-- For Subtask Document Upload Feature
-- Date: 2025-10-17
-- ========================================

-- This file combines all required migrations
-- Run this if you haven't run any migrations yet

-- ========== TASK DOCUMENTS MIGRATION ==========
-- Adds task-level document support with approval workflow

ALTER TABLE documents ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS admin_comments TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

COMMENT ON COLUMN documents.task_id IS 'Optional task_id for documents uploaded by reviewers for specific tasks';
COMMENT ON COLUMN documents.status IS 'Document approval status: pending, approved, rejected';
COMMENT ON COLUMN documents.approved_by IS 'User ID of admin who approved/rejected the document';
COMMENT ON COLUMN documents.approved_at IS 'Timestamp when document was approved/rejected';
COMMENT ON COLUMN documents.rejection_reason IS 'Reason for rejection if document was rejected';
COMMENT ON COLUMN documents.admin_comments IS 'Admin comments on the document';

-- ========== SUBTASK DOCUMENTS MIGRATION ==========
-- Adds subtask-level document support (multiple files per subtask)

ALTER TABLE documents ADD COLUMN IF NOT EXISTS subtask_id UUID REFERENCES subtasks(subtask_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_subtask_id ON documents(subtask_id);

COMMENT ON COLUMN documents.subtask_id IS 'Optional subtask_id for documents uploaded by reviewers for specific subtasks';

-- ========== VERIFICATION QUERIES ==========
-- Run these to verify the setup

-- Check if all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('task_id', 'subtask_id', 'status', 'approved_by', 'approved_at', 'rejection_reason', 'admin_comments')
ORDER BY column_name;

-- Check if all indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'documents' 
  AND indexname IN ('idx_documents_task_id', 'idx_documents_subtask_id', 'idx_documents_status');

-- ========== SUCCESS MESSAGE ==========
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ ALL MIGRATIONS COMPLETED!';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Task document support added';
  RAISE NOTICE '✓ Subtask document support added';
  RAISE NOTICE '✓ Approval workflow enabled';
  RAISE NOTICE '✓ All indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart backend: python server.py';
  RAISE NOTICE '2. Restart frontend: npm run dev';
  RAISE NOTICE '3. Clear browser cache: Ctrl+F5';
  RAISE NOTICE '';
  RAISE NOTICE 'Features now available:';
  RAISE NOTICE '• Reviewers can upload documents per task';
  RAISE NOTICE '• Reviewers can upload documents per subtask';
  RAISE NOTICE '• Admins can approve/reject documents';
  RAISE NOTICE '• Progress tracking includes documents';
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
END $$;


