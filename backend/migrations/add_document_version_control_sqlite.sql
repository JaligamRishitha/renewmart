-- Migration: Add document version control (SQLite Compatible)
-- Description: Add version control fields to documents table for tracking document versions
-- Date: 2025-01-17

-- Add version control fields
ALTER TABLE documents ADD COLUMN version_number INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN is_latest_version BOOLEAN DEFAULT 1;
ALTER TABLE documents ADD COLUMN parent_document_id TEXT; -- SQLite doesn't have UUID type
ALTER TABLE documents ADD COLUMN version_notes TEXT;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(land_id, document_type, version_number);
CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(land_id, document_type, is_latest_version);

-- Update existing documents to have version 1 and be latest
UPDATE documents SET version_number = 1, is_latest_version = 1 WHERE version_number IS NULL;
