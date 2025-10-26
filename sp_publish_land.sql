-- Stored Procedure: sp_publish_land
-- Purpose: Publish a land to the marketplace (admin only)
-- Parameters: p_land UUID, p_admin UUID
-- Returns: VOID

CREATE OR REPLACE FUNCTION sp_publish_land(
    p_land UUID,
    p_admin UUID
) RETURNS VOID AS $$
DECLARE 
    ok BOOLEAN;
    v_status TEXT;
BEGIN
    -- Check if land exists and get current status
    SELECT status INTO v_status FROM lands WHERE land_id = p_land;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Land not found';
    END IF;
    
    -- Check if land is in a publishable state
    IF v_status NOT IN ('approved', 'investor_ready') THEN
        RAISE EXCEPTION 'Land must be approved before publishing. Current status: %', v_status;
    END IF;
    
    -- Check if land has required fields for publishing
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
    SET status = 'published', 
        published_at = NOW(),
        updated_at = NOW()
    WHERE land_id = p_land 
    AND status IN ('approved', 'investor_ready');

    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to publish land - status may not be publishable';
    END IF;
    
    -- Log the publishing action (optional)
    INSERT INTO land_history (land_id, action, performed_by, performed_at, notes)
    VALUES (p_land, 'published', p_admin, NOW(), 'Land published to marketplace')
    ON CONFLICT DO NOTHING; -- Ignore if table doesn't exist or has constraints
    
END; $$ LANGUAGE plpgsql;

-- Grant execute permission to the application user
-- Replace 'your_app_user' with your actual database user
-- GRANT EXECUTE ON FUNCTION sp_publish_land(UUID, UUID) TO your_app_user;
