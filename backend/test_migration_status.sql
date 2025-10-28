-- Quick test to check if version_status column exists
-- Run this in pgAdmin to verify the migration was applied

-- Check if version_status column exists
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('version_status', 'review_locked_at', 'review_locked_by', 'version_change_reason');

-- If the above query returns no rows, the migration hasn't been run
-- If it returns 4 rows, the migration was successful

-- Check current document statuses
SELECT document_id, file_name, status, version_status, review_locked_at, review_locked_by
FROM documents 
LIMIT 5;

-- If version_status is NULL for all documents, set default values
UPDATE documents 
SET version_status = 'active' 
WHERE version_status IS NULL;
