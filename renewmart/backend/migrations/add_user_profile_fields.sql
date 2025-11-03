-- Migration: Add additional profile fields to user table
-- Description: Add company, address, and bio fields to support enhanced user profiles

-- Add new columns to the user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "user".company IS 'User company or organization name';
COMMENT ON COLUMN "user".address IS 'User physical address';
COMMENT ON COLUMN "user".bio IS 'User biography or description';

-- Update the updated_at timestamp for existing users (optional)
-- UPDATE "user" SET updated_at = NOW() WHERE company IS NULL AND address IS NULL AND bio IS NULL;
