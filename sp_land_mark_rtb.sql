-- Stored Procedure: sp_land_mark_rtb
-- Purpose: Mark land as ready to buy (admin action)
-- Parameters: p_land UUID
-- Returns: VOID

CREATE OR REPLACE FUNCTION sp_land_mark_rtb(
    p_land UUID
) RETURNS VOID AS $$
DECLARE 
    v_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_status FROM lands WHERE land_id = p_land;
    
    -- Check if land exists
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Land not found';
    END IF;
    
    -- Check if land is in a ready-to-buy state
    IF v_status NOT IN ('published') THEN
        RAISE EXCEPTION 'Land must be published before marking as ready to buy. Current status: %', v_status;
    END IF;
    
    -- Update land status to ready to buy
    UPDATE lands 
    SET status = 'rtb', 
        updated_at = NOW()
    WHERE land_id = p_land 
    AND status = 'published';
    
    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to mark land as ready to buy';
    END IF;
    
END; $$ LANGUAGE plpgsql;
