-- Migration: Add site_image column to lands table
-- Date: 2025-01-16
-- Description: Add site_image column to store uploaded site images for projects

-- Check if column exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lands' 
        AND column_name = 'site_image'
    ) THEN
        ALTER TABLE lands ADD COLUMN site_image bytea;
        RAISE NOTICE 'Column site_image added to lands table';
    ELSE
        RAISE NOTICE 'Column site_image already exists in lands table';
    END IF;
END $$;

