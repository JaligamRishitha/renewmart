-- Stored Procedure: sp_land_submit_for_review
-- Purpose: Submit land for admin review (landowner action)
-- Parameters: p_land UUID, p_landowner UUID
-- Returns: VOID

CREATE OR REPLACE FUNCTION sp_land_submit_for_review(
    p_land UUID,
    p_landowner UUID
) RETURNS VOID AS $$
DECLARE 
    v_owner UUID; 
    v_status TEXT;
BEGIN
    -- Get current owner and status
    SELECT landowner_id, status INTO v_owner, v_status 
    FROM lands WHERE land_id = p_land;
    
    -- Check if land exists
    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Land not found';
    END IF;
    
    -- Check if user is the owner
    IF v_owner != p_landowner THEN
        RAISE EXCEPTION 'Not authorized to submit this land';
    END IF;
    
    -- Check if land is in a submittable state
    IF v_status NOT IN ('draft') THEN
        RAISE EXCEPTION 'Land must be in draft status to submit for review. Current status: %', v_status;
    END IF;
    
    -- Update land status to submitted
    UPDATE lands 
    SET status = 'submitted', 
        updated_at = NOW()
    WHERE land_id = p_land 
    AND landowner_id = p_landowner 
    AND status = 'draft';
    
    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to submit land for review';
    END IF;
    
END; $$ LANGUAGE plpgsql;
