-- ========================================
-- ADD SUBTASK_ID COLUMN TO DOCUMENTS
-- Run this in pgAdmin or psql NOW!
-- ========================================

-- Add the subtask_id column
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS subtask_id UUID 
REFERENCES subtasks(subtask_id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_documents_subtask_id 
ON documents(subtask_id);

-- Add comment
COMMENT ON COLUMN documents.subtask_id 
IS 'Optional subtask_id for documents uploaded by reviewers for specific subtasks';

-- Verify it worked
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name = 'subtask_id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed!';
  RAISE NOTICE 'Column subtask_id added to documents table';
  RAISE NOTICE 'You can now upload documents per subtask!';
END $$;


