-- Migration: Create document_assignments table
-- Description: Create table to track which document versions are assigned to which reviewers
-- Date: 2025-01-17

-- Create document_assignments table
CREATE TABLE IF NOT EXISTS document_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL,
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    assignment_status VARCHAR(50) DEFAULT 'assigned',
    assignment_notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium',
    is_locked BOOLEAN DEFAULT TRUE,
    lock_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_assignments_document_id ON document_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_assigned_to ON document_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_document_assignments_land_id ON document_assignments(land_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_status ON document_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_reviewer_role ON document_assignments(reviewer_role);
CREATE INDEX IF NOT EXISTS idx_document_assignments_task_id ON document_assignments(task_id);

-- Add comments
COMMENT ON TABLE document_assignments IS 'Tracks which document versions are assigned to which reviewers';
COMMENT ON COLUMN document_assignments.assignment_id IS 'Unique identifier for the assignment';
COMMENT ON COLUMN document_assignments.document_id IS 'Reference to the specific document version being assigned';
COMMENT ON COLUMN document_assignments.land_id IS 'Reference to the land project';
COMMENT ON COLUMN document_assignments.assigned_to IS 'User ID of the reviewer assigned to review this document';
COMMENT ON COLUMN document_assignments.assigned_by IS 'User ID of the admin who made the assignment';
COMMENT ON COLUMN document_assignments.reviewer_role IS 'Role of the assigned reviewer (re_sales_advisor, re_analyst, re_governance_lead)';
COMMENT ON COLUMN document_assignments.task_id IS 'Optional reference to a related task';
COMMENT ON COLUMN document_assignments.assignment_status IS 'Status of the assignment: assigned, in_progress, completed, cancelled';
COMMENT ON COLUMN document_assignments.assignment_notes IS 'Notes about the assignment';
COMMENT ON COLUMN document_assignments.assigned_at IS 'When the assignment was created';
COMMENT ON COLUMN document_assignments.started_at IS 'When the reviewer started working on the assignment';
COMMENT ON COLUMN document_assignments.completed_at IS 'When the assignment was completed';
COMMENT ON COLUMN document_assignments.due_date IS 'Due date for the assignment';
COMMENT ON COLUMN document_assignments.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN document_assignments.is_locked IS 'Whether the document is locked for this assignment';
COMMENT ON COLUMN document_assignments.lock_reason IS 'Reason for locking the document';
