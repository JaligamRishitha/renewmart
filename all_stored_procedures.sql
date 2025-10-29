-- =====================================================
-- RENEWMART STORED PROCEDURES
-- =====================================================
-- This file contains all the stored procedures needed for the RenewMart application
-- Run these in your PostgreSQL database to fix the approval and publishing workflow

-- =====================================================
-- 1. SP_PUBLISH_LAND
-- =====================================================
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
    
END; $$ LANGUAGE plpgsql;

-- =====================================================
-- 2. SP_LAND_SUBMIT_FOR_REVIEW
-- =====================================================
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

-- =====================================================
-- 3. SP_LAND_MARK_RTB
-- =====================================================
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

-- =====================================================
-- 4. SP_INVESTOR_EXPRESS_INTEREST
-- =====================================================
-- Purpose: Handle investor expressing interest in a land
-- Parameters: p_land UUID, p_investor UUID, p_message TEXT
-- Returns: UUID (interest_id)

CREATE OR REPLACE FUNCTION sp_investor_express_interest(
    p_land UUID,
    p_investor UUID,
    p_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE 
    v_interest_id UUID;
    v_status TEXT;
BEGIN
    -- Check if land exists and get status
    SELECT status INTO v_status FROM lands WHERE land_id = p_land;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Land not found';
    END IF;
    
    -- Check if land is published
    IF v_status != 'published' THEN
        RAISE EXCEPTION 'Land must be published for investors to express interest';
    END IF;
    
    -- Create interest record
    INSERT INTO investor_interests (land_id, investor_id, message, status, created_at)
    VALUES (p_land, p_investor, p_message, 'pending', NOW())
    RETURNING interest_id INTO v_interest_id;
    
    -- Update land status to interest_locked to hide from other investors
    UPDATE lands 
    SET status = 'interest_locked',
        interest_locked_at = NOW(),
        updated_at = NOW()
    WHERE land_id = p_land 
    AND status = 'published';
    
    RETURN v_interest_id;
    
END; $$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Uncomment and modify the following lines to grant execute permissions
-- Replace 'your_app_user' with your actual database user

-- GRANT EXECUTE ON FUNCTION sp_publish_land(UUID, UUID) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION sp_land_submit_for_review(UUID, UUID) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION sp_land_mark_rtb(UUID) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION sp_investor_express_interest(UUID, UUID, TEXT) TO your_app_user;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the stored procedures were created successfully

-- Check if procedures exist:
-- SELECT proname, proargnames FROM pg_proc WHERE proname LIKE 'sp_%';

-- Test the procedures (replace with actual UUIDs):
-- SELECT sp_land_submit_for_review('your-land-uuid', 'your-user-uuid');
-- SELECT sp_publish_land('your-land-uuid', 'your-admin-uuid');
-- SELECT sp_land_mark_rtb('your-land-uuid');
