-- Manual migration to add document versioning columns
-- Run this manually in your database

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
