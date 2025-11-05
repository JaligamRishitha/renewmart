-- Safe deletion script for land_id: d48017a7-a6ce-4864-bec3-1f4831a6bc11
-- This script handles the foreign key constraint issue with document_audit_trail

BEGIN;

-- Step 1: Delete document_audit_trail entries for this land
DELETE FROM document_audit_trail 
WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11'
   OR document_id IN (
       SELECT document_id FROM documents WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11'
   );

-- Step 2: Temporarily disable the trigger
ALTER TABLE documents DISABLE TRIGGER trg_log_document_change;

-- Step 3: Delete documents for this land
DELETE FROM documents WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11';

-- Step 4: Re-enable the trigger
ALTER TABLE documents ENABLE TRIGGER trg_log_document_change;

-- Step 5: Delete the land (this will cascade delete related records)
DELETE FROM lands WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11';

COMMIT;

