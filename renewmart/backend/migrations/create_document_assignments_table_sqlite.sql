-- Migration: Create document_assignments table for SQLite
-- Description: Create table to track which document versions are assigned to which reviewers
-- Date: 2025-01-17

-- Create document_assignments table
CREATE TABLE IF NOT EXISTS document_assignments (
    assignment_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    document_id TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    land_id TEXT NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    assigned_to TEXT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    assigned_by TEXT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    reviewer_role TEXT NOT NULL,
    task_id TEXT REFERENCES tasks(task_id) ON DELETE CASCADE,
    assignment_status TEXT DEFAULT 'assigned',
    assignment_notes TEXT,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    due_date DATETIME,
    priority TEXT DEFAULT 'medium',
    is_locked INTEGER DEFAULT 1,
    lock_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_assignments_document_id ON document_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_assigned_to ON document_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_document_assignments_land_id ON document_assignments(land_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_status ON document_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_reviewer_role ON document_assignments(reviewer_role);
CREATE INDEX IF NOT EXISTS idx_document_assignments_task_id ON document_assignments(task_id);
