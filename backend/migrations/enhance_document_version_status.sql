-- Migration: Enhance document version status system
-- Description: Add version-specific status fields and improve document versioning
-- Date: 2025-01-17

-- Add new status fields for version management
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_by UUID REFERENCES "user"(user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_change_reason TEXT;

-- Create index for version status queries
CREATE INDEX IF NOT EXISTS idx_documents_version_status ON documents(land_id, document_type, version_status);
CREATE INDEX IF NOT EXISTS idx_documents_review_locked ON documents(review_locked_at) WHERE review_locked_at IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN documents.version_status IS 'Version-specific status: active, archived, under_review, locked';
COMMENT ON COLUMN documents.review_locked_at IS 'Timestamp when this version was locked for review';
COMMENT ON COLUMN documents.review_locked_by IS 'User who locked this version for review';
COMMENT ON COLUMN documents.version_change_reason IS 'Reason for version change (e.g., "Updated with new survey data")';

-- Create function to handle version status transitions
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

-- Create trigger for version status updates
DROP TRIGGER IF EXISTS trg_update_document_version_status ON documents;
CREATE TRIGGER trg_update_document_version_status
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_version_status();

-- Update existing documents to have proper version status
UPDATE documents SET version_status = 'active' WHERE version_status IS NULL AND is_latest_version = TRUE;
UPDATE documents SET version_status = 'archived' WHERE version_status IS NULL AND is_latest_version = FALSE;
