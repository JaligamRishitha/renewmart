-- ============================================================================
-- Migration: Add project_document_role_mappings table
-- Date: 2025-01-XX
-- Purpose: Create table for project-specific document type to role mappings
-- ============================================================================

-- Table to store project-specific document type to role mappings
-- Allows admin to customize which roles can view which document types per project
CREATE TABLE IF NOT EXISTS public.project_document_role_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    role_key VARCHAR(50) NOT NULL REFERENCES lu_roles(role_key),
    created_by UUID REFERENCES "user"(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(land_id, document_type, role_key)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_doc_role_mappings_land 
ON public.project_document_role_mappings(land_id);

CREATE INDEX IF NOT EXISTS idx_project_doc_role_mappings_doc_type 
ON public.project_document_role_mappings(document_type);

CREATE INDEX IF NOT EXISTS idx_project_doc_role_mappings_role 
ON public.project_document_role_mappings(role_key);

-- Add comment
COMMENT ON TABLE public.project_document_role_mappings IS 
'Project-specific document type to role mappings. 
When a mapping exists for a project, it overrides the default document_type_roles mapping.
This allows per-project customization of which roles can view which document types.';

