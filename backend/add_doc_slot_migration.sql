-- Add doc_slot field to documents table
-- This migration adds the doc_slot column to support D1, D2 document slots

ALTER TABLE documents 
ADD COLUMN doc_slot VARCHAR(10) DEFAULT 'D1';

-- Update existing documents to have D1 as default slot
UPDATE documents 
SET doc_slot = 'D1' 
WHERE doc_slot IS NULL;

-- Add comment to the column
COMMENT ON COLUMN documents.doc_slot IS 'Document slot: D1, D2, etc. for multi-slot document types';
