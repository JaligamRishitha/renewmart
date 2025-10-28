-- Migration: Add document audit trail
-- Description: Create audit trail table for tracking document version changes and status updates
-- Date: 2025-01-17

-- Create document_audit_trail table
CREATE TABLE IF NOT EXISTS document_audit_trail (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'version_upload', 'status_change', 'review_lock', 'review_unlock', 'archive'
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_version_number INTEGER,
    new_version_number INTEGER,
    changed_by UUID NOT NULL REFERENCES "user"(user_id),
    change_reason TEXT,
    metadata JSONB, -- Store additional context about the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_audit_document_id ON document_audit_trail(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_land_id ON document_audit_trail(land_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_action_type ON document_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_document_audit_changed_by ON document_audit_trail(changed_by);
CREATE INDEX IF NOT EXISTS idx_document_audit_created_at ON document_audit_trail(created_at);

-- Add comments
COMMENT ON TABLE document_audit_trail IS 'Audit trail for document version changes and status updates';
COMMENT ON COLUMN document_audit_trail.action_type IS 'Type of action performed: version_upload, status_change, review_lock, review_unlock, archive';
COMMENT ON COLUMN document_audit_trail.old_status IS 'Previous status before the change';
COMMENT ON COLUMN document_audit_trail.new_status IS 'New status after the change';
COMMENT ON COLUMN document_audit_trail.metadata IS 'Additional context about the change (JSON)';

-- Create function to automatically log document changes
CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change
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
            ELSE 'update'
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
            'is_latest_version', COALESCE(NEW.is_latest_version, OLD.is_latest_version)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document changes
DROP TRIGGER IF EXISTS trg_log_document_change ON documents;
CREATE TRIGGER trg_log_document_change
    AFTER INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION log_document_change();
