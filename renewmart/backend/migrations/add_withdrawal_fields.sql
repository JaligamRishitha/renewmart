-- Migration: Add withdrawal fields to investor_interests table
-- Date: 2025-01-XX

-- Add withdrawal fields
ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS withdrawal_requested boolean DEFAULT false NOT NULL;

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS withdrawal_reason text;

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS withdrawal_status character varying(50) DEFAULT 'pending';

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS withdrawal_requested_at timestamp with time zone;

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS withdrawal_approved_by uuid;

ALTER TABLE public.investor_interests 
ADD COLUMN IF NOT EXISTS withdrawal_approved_at timestamp with time zone;

-- Add foreign key constraint for withdrawal_approved_by if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'investor_interests_withdrawal_approved_by_fkey'
    ) THEN
        ALTER TABLE public.investor_interests 
        ADD CONSTRAINT investor_interests_withdrawal_approved_by_fkey 
        FOREIGN KEY (withdrawal_approved_by) REFERENCES public."user"(user_id);
    END IF;
END $$;

-- Add index for withdrawal status lookups
CREATE INDEX IF NOT EXISTS idx_investor_interests_withdrawal_status 
ON public.investor_interests(withdrawal_status) 
WHERE withdrawal_requested = true;

-- Add index for master advisor withdrawal lookups
CREATE INDEX IF NOT EXISTS idx_investor_interests_withdrawal_master_advisor 
ON public.investor_interests(master_sales_advisor_id, withdrawal_status) 
WHERE withdrawal_requested = true AND master_sales_advisor_id IS NOT NULL;

