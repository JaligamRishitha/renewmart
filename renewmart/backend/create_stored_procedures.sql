-- ============================================================================
-- Stored Procedures for Lands Router
-- Date: 2025-11-07
-- Run this script to create the stored procedures in your database
-- ============================================================================

-- Function: Get Admin Dashboard Summary
CREATE OR REPLACE FUNCTION public.get_admin_summary()
RETURNS TABLE (
    total_projects BIGINT,
    pending_reviews BIGINT,
    under_review BIGINT,
    approved BIGINT,
    published BIGINT,
    ready_to_buy BIGINT,
    rejected BIGINT,
    total_land_area NUMERIC,
    total_capacity NUMERIC,
    estimated_revenue NUMERIC,
    pending_without_reviewers BIGINT,
    landowner_count BIGINT,
    total_interests BIGINT,
    total_investors BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH summary_stats AS (
        SELECT 
            COUNT(*)::BIGINT as total_projects,
            COUNT(CASE WHEN status = 'submitted' THEN 1 END)::BIGINT as pending_reviews,
            COUNT(CASE WHEN status = 'under_review' THEN 1 END)::BIGINT as under_review,
            COUNT(CASE WHEN status = 'approved' THEN 1 END)::BIGINT as approved,
            COUNT(CASE WHEN status = 'published' THEN 1 END)::BIGINT as published,
            COUNT(CASE WHEN status = 'rtb' THEN 1 END)::BIGINT as ready_to_buy,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END)::BIGINT as rejected,
            COALESCE(SUM(area_acres), 0) as total_land_area,
            COALESCE(SUM(capacity_mw), 0) as total_capacity,
            COALESCE(SUM(
                CASE 
                    WHEN capacity_mw IS NOT NULL AND price_per_mwh IS NOT NULL 
                    THEN capacity_mw * price_per_mwh * 8760
                    ELSE 0 
                END
            ), 0) as estimated_revenue,
            COUNT(CASE 
                WHEN l.status NOT IN ('published', 'approved', 'rejected', 'rtb', 'interest_locked', 'draft', 'submitted')
                AND NOT EXISTS (
                    SELECT 1 FROM tasks t 
                    WHERE t.land_id = l.land_id 
                    AND t.assigned_to IS NOT NULL
                )
                THEN 1 
            END)::BIGINT as pending_without_reviewers
        FROM lands l
        WHERE l.status != 'draft'
    ),
    landowner_stats AS (
        SELECT COUNT(DISTINCT l.landowner_id)::BIGINT as landowner_count
        FROM lands l
        WHERE l.status != 'draft'
    ),
    interest_stats AS (
        SELECT 
            COUNT(DISTINCT ii.interest_id)::BIGINT as total_interests,
            COUNT(DISTINCT ii.investor_id)::BIGINT as total_investors
        FROM investor_interests ii
        INNER JOIN lands l ON ii.land_id = l.land_id
        WHERE l.status != 'draft'
    )
    SELECT 
        s.total_projects,
        s.pending_reviews,
        s.under_review,
        s.approved,
        s.published,
        s.ready_to_buy,
        s.rejected,
        s.total_land_area,
        s.total_capacity,
        s.estimated_revenue,
        s.pending_without_reviewers,
        l.landowner_count,
        i.total_interests,
        i.total_investors
    FROM summary_stats s
    CROSS JOIN landowner_stats l
    CROSS JOIN interest_stats i;
END;
$$;

-- Function: Get Project Details with Tasks
CREATE OR REPLACE FUNCTION public.get_project_details_with_tasks(p_project_id UUID)
RETURNS TABLE (
    land_id UUID,
    title TEXT,
    location_text TEXT,
    land_type TEXT,
    energy_key TEXT,
    capacity_mw NUMERIC,
    price_per_mwh NUMERIC,
    area_acres NUMERIC,
    status TEXT,
    timeline_text TEXT,
    contract_term_years INTEGER,
    developer_name TEXT,
    admin_notes TEXT,
    project_priority TEXT,
    project_due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    landowner_email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.land_id,
        l.title,
        l.location_text,
        l.land_type,
        l.energy_key,
        l.capacity_mw,
        l.price_per_mwh,
        l.area_acres,
        l.status,
        l.timeline_text,
        l.contract_term_years,
        l.developer_name,
        l.admin_notes,
        l.project_priority::TEXT,
        l.project_due_date,
        l.created_at,
        l.updated_at,
        l.published_at,
        u.email as landowner_email,
        u.first_name,
        u.last_name,
        u.phone
    FROM lands l
    LEFT JOIN "user" u ON l.landowner_id = u.user_id
    WHERE l.land_id = p_project_id;
END;
$$;

-- Function: Get Tasks for Project
CREATE OR REPLACE FUNCTION public.get_project_tasks(p_project_id UUID)
RETURNS TABLE (
    task_id UUID,
    land_id UUID,
    task_type TEXT,
    description TEXT,
    assigned_to UUID,
    assigned_role TEXT,
    status TEXT,
    priority TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    assigned_to_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.task_id,
        t.land_id,
        t.title as task_type,
        t.description,
        t.assigned_to,
        t.assigned_role,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        u.first_name || ' ' || u.last_name as assigned_to_name
    FROM tasks t
    LEFT JOIN "user" u ON t.assigned_to = u.user_id
    WHERE t.land_id = p_project_id
    ORDER BY t.created_at DESC;
END;
$$;

-- Function: Get Admin Investor Interests
CREATE OR REPLACE FUNCTION public.get_admin_investor_interests()
RETURNS TABLE (
    interest_id UUID,
    land_id UUID,
    investor_id UUID,
    status TEXT,
    comments TEXT,
    investment_amount NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    project_title TEXT,
    project_location TEXT,
    project_type TEXT,
    capacity_mw NUMERIC,
    price_per_mwh NUMERIC,
    project_status TEXT,
    investor_first_name TEXT,
    investor_last_name TEXT,
    investor_email TEXT,
    investor_phone TEXT,
    landowner_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ii.interest_id,
        ii.land_id,
        ii.investor_id,
        ii.status,
        ii.comments,
        ii.investment_amount,
        ii.created_at,
        ii.updated_at,
        l.title as project_title,
        l.location_text as project_location,
        l.energy_key as project_type,
        l.capacity_mw,
        l.price_per_mwh,
        l.status as project_status,
        investor.first_name as investor_first_name,
        investor.last_name as investor_last_name,
        investor.email as investor_email,
        investor.phone as investor_phone,
        landowner.first_name || ' ' || landowner.last_name as landowner_name
    FROM investor_interests ii
    INNER JOIN lands l ON ii.land_id = l.land_id
    INNER JOIN "user" investor ON ii.investor_id = investor.user_id
    LEFT JOIN "user" landowner ON l.landowner_id = landowner.user_id
    WHERE l.status != 'draft'
    ORDER BY ii.created_at DESC;
END;
$$;

-- Function: Get Landowner Dashboard Summary
CREATE OR REPLACE FUNCTION public.get_landowner_dashboard_summary(p_user_id UUID)
RETURNS TABLE (
    total_projects BIGINT,
    total_land_area NUMERIC,
    draft_projects BIGINT,
    completed_submissions BIGINT,
    estimated_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_drafts AS (
        SELECT 
            land_id,
            ROW_NUMBER() OVER (
                PARTITION BY land_id 
                ORDER BY updated_at DESC
            ) as rn
        FROM lands
        WHERE landowner_id = p_user_id
        AND status = 'draft'
    ),
    unique_drafts AS (
        SELECT land_id
        FROM ranked_drafts
        WHERE rn = 1
    ),
    all_lands AS (
        SELECT 
            land_id,
            status,
            area_acres
        FROM lands
        WHERE landowner_id = p_user_id
    ),
    summary_stats AS (
        SELECT 
            COUNT(*)::BIGINT as total_projects,
            COALESCE(SUM(area_acres), 0) as total_land_area,
            (SELECT COUNT(*)::BIGINT FROM unique_drafts) as draft_projects,
            COUNT(CASE WHEN status IN ('submitted', 'under_review', 'approved', 'published', 'rtb') THEN 1 END)::BIGINT as completed_submissions
        FROM all_lands
    ),
    revenue_stats AS (
        SELECT COALESCE(SUM(capacity_mw * price_per_mwh * 8760 / 1000000), 0) as estimated_revenue
        FROM lands
        WHERE landowner_id = p_user_id 
        AND status IN ('published', 'rtb', 'interest_locked')
        AND capacity_mw IS NOT NULL
        AND price_per_mwh IS NOT NULL
    )
    SELECT 
        s.total_projects,
        s.total_land_area,
        s.draft_projects,
        s.completed_submissions,
        r.estimated_revenue
    FROM summary_stats s
    CROSS JOIN revenue_stats r;
END;
$$;

-- Function: Get Landowner Dashboard Projects
CREATE OR REPLACE FUNCTION public.get_landowner_dashboard_projects(
    p_user_id UUID,
    p_status_filter TEXT,
    p_search TEXT,
    p_skip INTEGER,
    p_limit INTEGER
)
RETURNS TABLE (
    land_id UUID,
    title TEXT,
    location_text TEXT,
    energy_key TEXT,
    capacity_mw NUMERIC,
    status TEXT,
    updated_at TIMESTAMPTZ,
    timeline_text TEXT,
    price_per_mwh NUMERIC,
    area_acres NUMERIC,
    created_at TIMESTAMPTZ,
    description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_lands AS (
        SELECT 
            l.land_id,
            l.title,
            l.location_text,
            l.energy_key,
            l.capacity_mw,
            l.status,
            l.updated_at,
            l.timeline_text,
            l.price_per_mwh,
            l.area_acres,
            l.created_at,
            CASE 
                WHEN l.status = 'draft' THEN 'Draft - Not yet submitted (visible to admin)'
                WHEN l.status = 'submitted' THEN 'Submitted - Awaiting admin review'
                WHEN l.status = 'under_review' THEN 'Admin reviewing - sections assigned to reviewers'
                WHEN l.status = 'approved' THEN 'Approved - Ready for publishing'
                WHEN l.status = 'published' THEN 'Published to investors'
                WHEN l.status = 'rtb' THEN 'Ready to Buy - All approvals completed'
                WHEN l.status = 'interest_locked' THEN 'Investor interest received - Hidden from others'
                WHEN l.status = 'rejected' THEN 'Rejected - Needs revision'
                ELSE 'Unknown status'
            END as description,
            ROW_NUMBER() OVER (
                PARTITION BY l.land_id
                ORDER BY l.updated_at DESC
            ) as rn
        FROM lands l
        WHERE l.landowner_id = p_user_id
        AND (p_status_filter IS NULL OR l.status = p_status_filter)
        AND (p_search IS NULL OR LOWER(l.title) LIKE '%' || LOWER(p_search) || '%' OR LOWER(l.location_text) LIKE '%' || LOWER(p_search) || '%')
    )
    SELECT 
        r.land_id,
        r.title,
        r.location_text,
        r.energy_key,
        r.capacity_mw,
        r.status,
        r.updated_at,
        r.timeline_text,
        r.price_per_mwh,
        r.area_acres,
        r.created_at,
        r.description
    FROM ranked_lands r
    WHERE r.rn = 1
    ORDER BY r.updated_at DESC
    OFFSET p_skip
    LIMIT p_limit;
END;
$$;

