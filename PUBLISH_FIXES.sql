-- Separate SQL script for publishing fixes
-- Run this script in your PostgreSQL database to fix publishing issues

-- 1. Create the missing stored procedure for publishing
CREATE OR REPLACE FUNCTION sp_publish_land(p_land UUID)
RETURNS BOOLEAN AS $$
DECLARE 
    ok BOOLEAN;
BEGIN
    -- Check if all required fields are present
    SELECT
        (title IS NOT NULL AND location_text IS NOT NULL AND energy_key IS NOT NULL
         AND capacity_mw IS NOT NULL AND price_per_mwh IS NOT NULL
         AND timeline_text IS NOT NULL AND contract_term_years IS NOT NULL
         AND developer_name IS NOT NULL)
    INTO ok
    FROM lands WHERE land_id = p_land;

    IF NOT ok THEN 
        RAISE EXCEPTION 'Missing required fields for publish';
    END IF;

    -- Update land status to published
    UPDATE lands
    SET status = 'published', published_at = now()
    WHERE land_id = p_land AND status IN ('approved', 'investor_ready');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Land must be APPROVED/INVESTOR_READY before publishing';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix any lands that have invalid coordinates JSON
UPDATE lands 
SET coordinates = '{"lat": 0, "lng": 0}'::jsonb
WHERE coordinates IS NULL OR coordinates = '' OR coordinates = '{}';

-- 3. Ensure all required fields have default values for publishing
UPDATE lands 
SET 
    title = COALESCE(title, 'Untitled Project'),
    location_text = COALESCE(location_text, 'Location not specified'),
    energy_key = COALESCE(energy_key, 'solar'),
    capacity_mw = COALESCE(capacity_mw, 0),
    price_per_mwh = COALESCE(price_per_mwh, 0),
    timeline_text = COALESCE(timeline_text, 'Timeline not specified'),
    contract_term_years = COALESCE(contract_term_years, 20),
    developer_name = COALESCE(developer_name, 'Developer not specified')
WHERE land_id IN (
    SELECT land_id FROM lands 
    WHERE title IS NULL OR location_text IS NULL OR energy_key IS NULL
    OR capacity_mw IS NULL OR price_per_mwh IS NULL 
    OR timeline_text IS NULL OR contract_term_years IS NULL 
    OR developer_name IS NULL
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lands_status ON lands(status);
CREATE INDEX IF NOT EXISTS idx_lands_published_at ON lands(published_at);
CREATE INDEX IF NOT EXISTS idx_lands_energy_key ON lands(energy_key);

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION sp_publish_land(UUID) TO PUBLIC;

-- 6. Verify the function was created
SELECT 'Publish function created successfully' as status;
SELECT 'Coordinates fixed' as status;
SELECT 'Required fields updated' as status;
SELECT 'Indexes created' as status;
