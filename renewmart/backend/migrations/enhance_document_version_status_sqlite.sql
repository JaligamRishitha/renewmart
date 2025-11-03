-- Migration: Enhance document version status system (SQLite Compatible)
-- Description: Add version-specific status fields and improve document versioning
-- Date: 2025-01-17

-- Add new status fields for version management
ALTER TABLE documents ADD COLUMN version_status TEXT DEFAULT 'active';
ALTER TABLE documents ADD COLUMN review_locked_at TEXT; -- SQLite stores timestamps as TEXT
ALTER TABLE documents ADD COLUMN review_locked_by TEXT; -- SQLite doesn't have UUID type
ALTER TABLE documents ADD COLUMN version_change_reason TEXT;

-- Create index for version status queries
CREATE INDEX IF NOT EXISTS idx_documents_version_status ON documents(land_id, document_type, version_status);
CREATE INDEX IF NOT EXISTS idx_documents_review_locked ON documents(review_locked_at);

-- Update existing documents to have proper version status
UPDATE documents SET version_status = 'active' WHERE version_status IS NULL AND is_latest_version = 1;
UPDATE documents SET version_status = 'archived' WHERE version_status IS NULL AND is_latest_version = 0;
