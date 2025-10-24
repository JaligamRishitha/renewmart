-- Migration: Add document version control
-- Description: Add version control fields to documents table for tracking document versions
-- Date: 2025-01-17

-- Add version control fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(document_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(land_id, document_type, version_number);
CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(land_id, document_type, is_latest_version) WHERE is_latest_version = TRUE;

-- Add comment to document the change
COMMENT ON COLUMN documents.version_number IS 'Version number of the document (1, 2, 3, etc.)';
COMMENT ON COLUMN documents.is_latest_version IS 'Whether this is the latest version of the document';
COMMENT ON COLUMN documents.parent_document_id IS 'Reference to the original document (for version tracking)';
COMMENT ON COLUMN documents.version_notes IS 'Notes about this version (e.g., "Updated with new survey data")';

-- Update existing documents to have version 1 and be latest
UPDATE documents SET version_number = 1, is_latest_version = TRUE WHERE version_number IS NULL;
