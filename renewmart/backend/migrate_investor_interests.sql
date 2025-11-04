-- ============================================================================
-- Migration: Add NDA and CTA fields to investor_interests table
-- Also add master_sales_advisor_id field for interest approval workflow
-- Date: 2025-01-XX
-- ============================================================================

-- Add NDA and CTA boolean fields to investor_interests
ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS nda_accepted boolean DEFAULT false NOT NULL;

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS cta_accepted boolean DEFAULT false NOT NULL;

-- Add master sales advisor assignment field
ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS master_sales_advisor_id uuid;

-- Add foreign key constraint for master_sales_advisor_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'investor_interests_master_sales_advisor_id_fkey'
    ) THEN
        ALTER TABLE public.investor_interests 
        ADD CONSTRAINT investor_interests_master_sales_advisor_id_fkey 
        FOREIGN KEY (master_sales_advisor_id) REFERENCES public."user"(user_id);
    END IF;
END $$;

-- Add approval fields
ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Add foreign key constraint for approved_by if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'investor_interests_approved_by_fkey'
    ) THEN
        ALTER TABLE public.investor_interests 
        ADD CONSTRAINT investor_interests_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES public."user"(user_id);
    END IF;
END $$;

-- Add index for master sales advisor lookup
CREATE INDEX IF NOT EXISTS idx_investor_interests_master_advisor 
ON public.investor_interests(master_sales_advisor_id) 
WHERE master_sales_advisor_id IS NOT NULL;

-- Create table for master sales advisor assignments (for admin to assign one master per land/project)
CREATE TABLE IF NOT EXISTS public.master_sales_advisor_assignments (
    assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    land_id uuid NOT NULL,
    sales_advisor_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL
);

-- Note: Table ownership will be set by the database user running the migration
-- ALTER TABLE public.master_sales_advisor_assignments OWNER TO postgres;

-- Add constraints for master_sales_advisor_assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'master_sales_advisor_assignments_pkey'
    ) THEN
        ALTER TABLE ONLY public.master_sales_advisor_assignments
        ADD CONSTRAINT master_sales_advisor_assignments_pkey PRIMARY KEY (assignment_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'master_sales_advisor_assignments_land_id_fkey'
    ) THEN
        ALTER TABLE ONLY public.master_sales_advisor_assignments
        ADD CONSTRAINT master_sales_advisor_assignments_land_id_fkey FOREIGN KEY (land_id) REFERENCES public.lands(land_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'master_sales_advisor_assignments_sales_advisor_id_fkey'
    ) THEN
        ALTER TABLE ONLY public.master_sales_advisor_assignments
        ADD CONSTRAINT master_sales_advisor_assignments_sales_advisor_id_fkey FOREIGN KEY (sales_advisor_id) REFERENCES public."user"(user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'master_sales_advisor_assignments_assigned_by_fkey'
    ) THEN
        ALTER TABLE ONLY public.master_sales_advisor_assignments
        ADD CONSTRAINT master_sales_advisor_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public."user"(user_id);
    END IF;
END $$;

-- Add unique constraint for active assignments per land
CREATE UNIQUE INDEX IF NOT EXISTS master_sales_advisor_assignments_land_advisor_unique 
ON public.master_sales_advisor_assignments(land_id, sales_advisor_id) 
WHERE is_active = true;

-- Add indexes for master_sales_advisor_assignments
CREATE INDEX IF NOT EXISTS idx_master_advisor_assignments_land 
ON public.master_sales_advisor_assignments(land_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_master_advisor_assignments_advisor 
ON public.master_sales_advisor_assignments(sales_advisor_id) 
WHERE is_active = true;

-- Verification: Check if columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investor_interests' 
AND column_name IN ('nda_accepted', 'cta_accepted', 'master_sales_advisor_id', 'approved_by', 'approved_at')
ORDER BY column_name;

