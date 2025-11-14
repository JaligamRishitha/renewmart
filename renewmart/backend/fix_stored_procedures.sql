-- ============================================================================
-- Quick Fix for Stored Procedures
-- Run this script to fix the notification and land interest functions
-- ============================================================================

-- Fix: Get Notification Count (use 'read' instead of 'is_read')
CREATE OR REPLACE FUNCTION public.get_notification_count(p_user_id UUID)
RETURNS TABLE (
    unread_count BIGINT,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE read = FALSE)::BIGINT as unread_count,
        COUNT(*)::BIGINT as total_count
    FROM notifications
    WHERE user_id = p_user_id;
END;
$$;

-- Fix: Get Land Info for Interest (use table alias to avoid ambiguous column)
CREATE OR REPLACE FUNCTION public.get_land_info_for_interest(p_land_id UUID)
RETURNS TABLE (
    landowner_id UUID,
    status TEXT,
    title TEXT,
    location_text TEXT,
    energy_key TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.landowner_id, 
        l.status::TEXT, 
        l.title::TEXT, 
        l.location_text::TEXT, 
        l.energy_key::TEXT
    FROM lands l
    WHERE l.land_id = p_land_id;
END;
$$;

-- Fix: Check Existing Interest (use table alias to avoid ambiguous column)
CREATE OR REPLACE FUNCTION public.check_existing_interest(
    p_investor_id UUID,
    p_land_id UUID
)
RETURNS TABLE (
    interest_id UUID,
    status TEXT,
    approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ii.interest_id, 
        ii.status::TEXT, 
        ii.approved_at 
    FROM investor_interests ii
    WHERE ii.investor_id = p_investor_id 
    AND ii.land_id = p_land_id;
END;
$$;

-- Fix: Get Master Sales Advisor (use table alias to avoid ambiguous column)
CREATE OR REPLACE FUNCTION public.get_master_sales_advisor(p_land_id UUID)
RETURNS TABLE (
    sales_advisor_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT msa.sales_advisor_id 
    FROM master_sales_advisor_assignments msa
    WHERE msa.land_id = p_land_id 
    AND msa.is_active = TRUE 
    LIMIT 1;
END;
$$;

