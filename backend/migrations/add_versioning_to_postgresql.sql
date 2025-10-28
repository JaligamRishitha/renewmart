-- Migration: Add document versioning to PostgreSQL database
-- Description: Add version control fields to documents table for PostgreSQL
-- Date: 2025-01-17

-- Add version control fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(document_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Add new status fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_locked_by UUID REFERENCES "user"(user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_change_reason TEXT;

-- Update existing documents
UPDATE documents SET version_number = 1, is_latest_version = TRUE WHERE version_number IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(land_id, document_type, version_number);
CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(land_id, document_type, is_latest_version) WHERE is_latest_version = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_version_status ON documents(land_id, document_type, version_status);

-- Add comments
COMMENT ON COLUMN documents.version_number IS 'Version number of the document (1, 2, 3, etc.)';
COMMENT ON COLUMN documents.is_latest_version IS 'Whether this is the latest version of the document';
COMMENT ON COLUMN documents.parent_document_id IS 'Reference to the original document (for version tracking)';
COMMENT ON COLUMN documents.version_notes IS 'Notes about this version (e.g., "Updated with new survey data")';
COMMENT ON COLUMN documents.version_status IS 'Version-specific status: active, archived, under_review, locked';
COMMENT ON COLUMN documents.review_locked_at IS 'Timestamp when this version was locked for review';
COMMENT ON COLUMN documents.review_locked_by IS 'User who locked this version for review';
COMMENT ON COLUMN documents.version_change_reason IS 'Reason for version change (e.g., "Updated with new survey data")';
