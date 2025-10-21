-- Migration: Add blob storage for documents
-- Description: Add file_data column to store documents as BYTEA instead of file system
-- Date: 2025-10-17

-- Add file_data column to store document bytes
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Make file_path nullable since we're moving to blob storage
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN documents.file_data IS 'Binary data of the document file, stored in database instead of file system';
COMMENT ON COLUMN documents.file_path IS 'Legacy column - kept for backwards compatibility, now nullable';

-- Create index on document_id for faster retrieval
CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id);

-- Optional: Add constraint to ensure either file_path or file_data exists
-- (Keeping flexible for migration period)

