-- =====================================================
-- PostgreSQL Migration for Document Review Status
-- =====================================================
-- Run this script in pgAdmin to add the required columns
-- for the document review functionality
-- =====================================================

-- Step 1: Add new status fields for version management
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_by UUID REFERENCES "user"(user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_change_reason TEXT;

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_version_status ON documents(land_id, document_type, version_status);
CREATE INDEX IF NOT EXISTS idx_documents_review_locked ON documents(review_locked_at) WHERE review_locked_at IS NOT NULL;

-- Step 3: Add comments to document the new fields
COMMENT ON COLUMN documents.version_status IS 'Version-specific status: active, archived, under_review, locked';
COMMENT ON COLUMN documents.review_locked_at IS 'Timestamp when this version was locked for review';
COMMENT ON COLUMN documents.review_locked_by IS 'User who locked this version for review';
COMMENT ON COLUMN documents.version_change_reason IS 'Reason for version change (e.g., "Updated with new survey data")';

-- Step 4: Create function to handle version status transitions
CREATE OR REPLACE FUNCTION update_document_version_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new version is uploaded, archive previous versions
    IF NEW.is_latest_version = TRUE AND OLD.is_latest_version = FALSE THEN
        UPDATE documents 
        SET version_status = 'archived'
        WHERE land_id = NEW.land_id 
        AND document_type = NEW.document_type 
        AND document_id != NEW.document_id
        AND version_status != 'under_review';
    END IF;
    
    -- When a version is locked for review, update its status
    IF NEW.review_locked_at IS NOT NULL AND OLD.review_locked_at IS NULL THEN
        NEW.version_status = 'under_review';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for version status updates
DROP TRIGGER IF EXISTS trg_update_document_version_status ON documents;
CREATE TRIGGER trg_update_document_version_status
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_version_status();

-- Step 6: Update existing documents to have proper version status
UPDATE documents SET version_status = 'active' WHERE version_status IS NULL AND is_latest_version = TRUE;
UPDATE documents SET version_status = 'archived' WHERE version_status IS NULL AND is_latest_version = FALSE;

-- =====================================================
-- Verification Queries (Optional - run to check results)
-- =====================================================

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('version_status', 'review_locked_at', 'review_locked_by', 'version_change_reason');

-- Check if indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'documents' 
AND indexname LIKE '%version_status%' OR indexname LIKE '%review_locked%';

-- Check if trigger was created
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'documents' 
AND trigger_name = 'trg_update_document_version_status';

-- Check document status distribution
SELECT version_status, COUNT(*) as count 
FROM documents 
GROUP BY version_status;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- The following columns have been added to the documents table:
-- 1. version_status (VARCHAR) - Tracks document status: active, archived, under_review, locked
-- 2. review_locked_at (TIMESTAMP) - When the document was locked for review
-- 3. review_locked_by (UUID) - Which user locked the document for review
-- 4. version_change_reason (TEXT) - Reason for status changes
-- 
-- The system now supports:
-- - Only one document version per type can be under review at a time
-- - Automatic status transitions when documents are claimed/released
-- - Audit trail of who locked documents and when
-- =====================================================
