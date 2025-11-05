-- Fix trigger function to handle DELETE operations properly
-- Then delete the problematic land

BEGIN;

-- Step 1: Fix the trigger function to skip audit trail insertion for DELETE operations
-- This prevents foreign key constraint violations when documents are cascade deleted
CREATE OR REPLACE FUNCTION public.log_document_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Skip audit trail insertion for DELETE operations to avoid FK constraint issues
    -- When documents are cascade deleted, we don't need to log the deletion
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    -- Log the change for INSERT and UPDATE operations
    INSERT INTO document_audit_trail (
        document_id, land_id, action_type, old_status, new_status,
        old_version_number, new_version_number, changed_by, change_reason, metadata
    ) VALUES (
        COALESCE(NEW.document_id, OLD.document_id),
        COALESCE(NEW.land_id, OLD.land_id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'version_upload'
            WHEN TG_OP = 'UPDATE' AND OLD.version_status != NEW.version_status THEN 'status_change'
            WHEN TG_OP = 'UPDATE' AND OLD.review_locked_at IS NULL AND NEW.review_locked_at IS NOT NULL THEN 'review_lock'
            WHEN TG_OP = 'UPDATE' AND OLD.review_locked_at IS NOT NULL AND NEW.review_locked_at IS NULL THEN 'review_unlock'
            ELSE 'version_update'
        END, 
        OLD.version_status,
        NEW.version_status,
        OLD.version_number,
        NEW.version_number,
        COALESCE(NEW.uploaded_by, NEW.review_locked_by, OLD.uploaded_by),
        COALESCE(NEW.version_change_reason, OLD.version_change_reason),
        jsonb_build_object(
            'file_name', COALESCE(NEW.file_name, OLD.file_name),
            'file_size', COALESCE(NEW.file_size, OLD.file_size),
            'document_type', COALESCE(NEW.document_type, OLD.document_type),
            'is_latest_version', COALESCE(NEW.is_latest_version, OLD.is_latest_version),
            'operation', TG_OP
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 2: Delete document_audit_trail entries for this land (cleanup)
DELETE FROM document_audit_trail 
WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11'
   OR document_id IN (
       SELECT document_id FROM documents WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11'
   );

-- Step 3: Delete the land (documents will be cascade deleted, but trigger won't try to log them)
DELETE FROM lands WHERE land_id = 'd48017a7-a6ce-4864-bec3-1f4831a6bc11';

COMMIT;

