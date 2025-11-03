-- Migration: Add document audit trail (SQLite Compatible)
-- Description: Create audit trail table for tracking document version changes and status updates
-- Date: 2025-01-17

-- Create document_audit_trail table
CREATE TABLE IF NOT EXISTS document_audit_trail (
    audit_id TEXT PRIMARY KEY, -- SQLite doesn't have UUID type
    document_id TEXT NOT NULL,
    land_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'version_upload', 'status_change', 'review_lock', 'review_unlock', 'archive'
    old_status TEXT,
    new_status TEXT,
    old_version_number INTEGER,
    new_version_number INTEGER,
    changed_by TEXT NOT NULL,
    change_reason TEXT,
    metadata TEXT, -- Store additional context about the change (JSON as TEXT)
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_audit_document_id ON document_audit_trail(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_land_id ON document_audit_trail(land_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_action_type ON document_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_document_audit_changed_by ON document_audit_trail(changed_by);
CREATE INDEX IF NOT EXISTS idx_document_audit_created_at ON document_audit_trail(created_at);
