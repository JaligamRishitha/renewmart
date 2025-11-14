-- Migration: Update version_status default to 'pending' and update existing 'active' records
-- Date: 2025-01-XX
-- Purpose: Change default version_status from 'active' to 'pending' and update existing records

-- Step 1: Update existing records with 'active' status to 'pending'
UPDATE documents 
SET version_status = 'pending' 
WHERE version_status = 'active' OR version_status IS NULL;

-- Step 2: Change the default value for version_status column
ALTER TABLE documents 
ALTER COLUMN version_status SET DEFAULT 'pending';

-- Step 3: Update the comment to reflect new status values
COMMENT ON COLUMN documents.version_status IS 'Version-specific status: pending, under_review, approved, rejected';

