-- Migration: Add project_priority and project_due_date to lands table
-- Created: 2025-10-16
-- Description: Adds project-level priority and due date fields to lands table

-- Add project_priority column
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_priority VARCHAR(50);

-- Add project_due_date column  
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_due_date TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN lands.project_priority IS 'Project-level priority (low, medium, high, critical) - used when no task is assigned yet';
COMMENT ON COLUMN lands.project_due_date IS 'Project-level due date - used when no task is assigned yet';

