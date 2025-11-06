-- Migration script to add new columns to lands table
-- Run this script on your PostgreSQL database to add the new columns

-- Add post_code column
ALTER TABLE public.lands 
ADD COLUMN IF NOT EXISTS post_code text;

-- Add potential_partners column
ALTER TABLE public.lands 
ADD COLUMN IF NOT EXISTS potential_partners text;

-- Add project_description column
ALTER TABLE public.lands 
ADD COLUMN IF NOT EXISTS project_description text;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lands' 
AND column_name IN ('post_code', 'potential_partners', 'project_description');

