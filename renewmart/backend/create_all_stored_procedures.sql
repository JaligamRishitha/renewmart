-- ============================================================================
-- All Stored Procedures for Router Files
-- Date: 2025-11-12
-- This file contains all stored procedures to replace inline SQL queries
-- ============================================================================

-- ============================================================================
-- Document Assignments Stored Procedures
-- ============================================================================

-- Function: Get Document Info for Assignment
CREATE OR REPLACE FUNCTION public.get_document_for_assignment(p_document_id UUID)
RETURNS TABLE (
    document_id UUID,
    land_id UUID,
    land_title TEXT,
    document_type TEXT,
    file_name TEXT,
    version_number INTEGER,
    version_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.document_id,
        l.land_id,
        l.title as land_title,
        d.document_type,
        d.file_name,
        d.version_number,
        d.version_status
    FROM documents d
    LEFT JOIN lands l ON d.land_id = l.land_id
    WHERE d.document_id = p_document_id;
END;
$$;

-- Function: Check Existing Document Assignment
CREATE OR REPLACE FUNCTION public.check_existing_document_assignment(p_document_id UUID)
RETURNS TABLE (
    assignment_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT assignment_id 
    FROM document_assignments 
    WHERE document_id = p_document_id 
    AND assignment_status IN ('assigned', 'in_progress')
    LIMIT 1;
END;
$$;

-- Function: Verify User with Role
CREATE OR REPLACE FUNCTION public.verify_user_with_role(p_user_id UUID, p_role_key TEXT)
RETURNS TABLE (
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    role_key TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        ur.role_key
    FROM "user" u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    WHERE u.user_id = p_user_id 
    AND ur.role_key = p_role_key 
    AND u.is_active = TRUE;
END;
$$;

-- Function: Create Document Assignment
CREATE OR REPLACE FUNCTION public.create_document_assignment(
    p_document_id UUID,
    p_land_id UUID,
    p_assigned_to UUID,
    p_assigned_by UUID,
    p_reviewer_role TEXT,
    p_task_id UUID,
    p_assignment_notes TEXT,
    p_due_date DATE,
    p_priority TEXT,
    p_lock_reason TEXT
)
RETURNS TABLE (
    assignment_id UUID,
    assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_assignment_id UUID;
    v_assigned_at TIMESTAMPTZ;
BEGIN
    v_assignment_id := gen_random_uuid();
    v_assigned_at := CURRENT_TIMESTAMP;
    
    INSERT INTO document_assignments (
        assignment_id, document_id, land_id, assigned_to, assigned_by, reviewer_role,
        task_id, assignment_notes, due_date, priority, is_locked, lock_reason, assigned_at
    ) VALUES (
        v_assignment_id, p_document_id, p_land_id, p_assigned_to, p_assigned_by, p_reviewer_role,
        p_task_id, p_assignment_notes, p_due_date, p_priority, TRUE, p_lock_reason, v_assigned_at
    );
    
    RETURN QUERY SELECT v_assignment_id, v_assigned_at;
END;
$$;

-- Function: Lock Document for Review
CREATE OR REPLACE FUNCTION public.lock_document_for_review(
    p_document_id UUID,
    p_locked_at TIMESTAMPTZ,
    p_locked_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents 
    SET version_status = 'under_review',
        review_locked_at = p_locked_at,
        review_locked_by = p_locked_by
    WHERE document_id = p_document_id;
END;
$$;

-- Function: Get Land Document Assignments
CREATE OR REPLACE FUNCTION public.get_land_document_assignments(p_land_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    document_id UUID,
    land_id UUID,
    assigned_to UUID,
    assigned_by UUID,
    reviewer_role TEXT,
    task_id UUID,
    assignment_notes TEXT,
    due_date DATE,
    priority TEXT,
    lock_reason TEXT,
    assignment_status TEXT,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_locked BOOLEAN,
    document_type TEXT,
    file_name TEXT,
    version_number INTEGER,
    version_status TEXT,
    assignee_first_name TEXT,
    assignee_last_name TEXT,
    assignee_email TEXT,
    assigner_first_name TEXT,
    assigner_last_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.assignment_id,
        da.document_id,
        da.land_id,
        da.assigned_to,
        da.assigned_by,
        da.reviewer_role,
        da.task_id,
        da.assignment_notes,
        da.due_date,
        da.priority,
        da.lock_reason,
        da.assignment_status,
        da.assigned_at,
        da.started_at,
        da.completed_at,
        da.is_locked,
        d.document_type,
        d.file_name,
        d.version_number,
        d.version_status,
        u1.first_name as assignee_first_name,
        u1.last_name as assignee_last_name,
        u1.email as assignee_email,
        u2.first_name as assigner_first_name,
        u2.last_name as assigner_last_name
    FROM document_assignments da
    LEFT JOIN documents d ON da.document_id = d.document_id
    LEFT JOIN "user" u1 ON da.assigned_to = u1.user_id
    LEFT JOIN "user" u2 ON da.assigned_by = u2.user_id
    WHERE da.land_id = p_land_id
    AND d.subtask_id IS NULL
    ORDER BY da.assigned_at DESC;
END;
$$;

-- Function: Get Reviewer Assignments
CREATE OR REPLACE FUNCTION public.get_reviewer_assignments(
    p_reviewer_id UUID,
    p_status_filter TEXT
)
RETURNS TABLE (
    assignment_id UUID,
    document_id UUID,
    land_id UUID,
    assigned_to UUID,
    assigned_by UUID,
    reviewer_role TEXT,
    task_id UUID,
    assignment_notes TEXT,
    due_date DATE,
    priority TEXT,
    lock_reason TEXT,
    assignment_status TEXT,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_locked BOOLEAN,
    document_type TEXT,
    file_name TEXT,
    version_number INTEGER,
    version_status TEXT,
    land_title TEXT,
    land_location TEXT,
    assigner_first_name TEXT,
    assigner_last_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.assignment_id,
        da.document_id,
        da.land_id,
        da.assigned_to,
        da.assigned_by,
        da.reviewer_role,
        da.task_id,
        da.assignment_notes,
        da.due_date,
        da.priority,
        da.lock_reason,
        da.assignment_status,
        da.assigned_at,
        da.started_at,
        da.completed_at,
        da.is_locked,
        d.document_type,
        d.file_name,
        d.version_number,
        d.version_status,
        l.title as land_title,
        l.location_text as land_location,
        u.first_name as assigner_first_name,
        u.last_name as assigner_last_name
    FROM document_assignments da
    LEFT JOIN documents d ON da.document_id = d.document_id
    LEFT JOIN lands l ON da.land_id = l.land_id
    LEFT JOIN "user" u ON da.assigned_by = u.user_id
    WHERE da.assigned_to = p_reviewer_id
    AND (p_status_filter IS NULL OR da.assignment_status = p_status_filter)
    AND d.subtask_id IS NULL
    ORDER BY da.assigned_at DESC;
END;
$$;

-- Function: Get Assignment Info
CREATE OR REPLACE FUNCTION public.get_assignment_info(p_assignment_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    document_id UUID,
    land_id UUID,
    assigned_to UUID,
    assigned_by UUID,
    reviewer_role TEXT,
    task_id UUID,
    assignment_notes TEXT,
    due_date DATE,
    priority TEXT,
    lock_reason TEXT,
    assignment_status TEXT,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_locked BOOLEAN,
    document_type TEXT,
    version_number INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.assignment_id,
        da.document_id,
        da.land_id,
        da.assigned_to,
        da.assigned_by,
        da.reviewer_role,
        da.task_id,
        da.assignment_notes,
        da.due_date,
        da.priority,
        da.lock_reason,
        da.assignment_status,
        da.assigned_at,
        da.started_at,
        da.completed_at,
        da.is_locked,
        d.document_type,
        d.version_number
    FROM document_assignments da
    LEFT JOIN documents d ON da.document_id = d.document_id
    WHERE da.assignment_id = p_assignment_id;
END;
$$;

-- Function: Update Document Assignment
CREATE OR REPLACE FUNCTION public.update_document_assignment(
    p_assignment_id UUID,
    p_assignment_status TEXT,
    p_assignment_notes TEXT,
    p_due_date DATE,
    p_priority TEXT,
    p_started_at TIMESTAMPTZ,
    p_completed_at TIMESTAMPTZ
)
RETURNS TABLE (
    assignment_id UUID,
    document_id UUID,
    land_id UUID,
    assigned_to UUID,
    assigned_by UUID,
    reviewer_role TEXT,
    task_id UUID,
    assignment_notes TEXT,
    due_date DATE,
    priority TEXT,
    lock_reason TEXT,
    assignment_status TEXT,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_locked BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE document_assignments 
    SET 
        assignment_status = COALESCE(p_assignment_status, assignment_status),
        assignment_notes = COALESCE(p_assignment_notes, assignment_notes),
        due_date = COALESCE(p_due_date, due_date),
        priority = COALESCE(p_priority, priority),
        started_at = COALESCE(p_started_at, started_at),
        completed_at = COALESCE(p_completed_at, completed_at)
    WHERE assignment_id = p_assignment_id;
    
    RETURN QUERY
    SELECT * FROM document_assignments WHERE assignment_id = p_assignment_id;
END;
$$;

-- Function: Cancel Document Assignment
CREATE OR REPLACE FUNCTION public.cancel_document_assignment(
    p_assignment_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE document_assignments 
    SET assignment_status = 'cancelled',
        assignment_notes = COALESCE(assignment_notes || ' | ', '') || p_reason
    WHERE assignment_id = p_assignment_id;
END;
$$;

-- Function: Unlock Document from Assignment
CREATE OR REPLACE FUNCTION public.unlock_document_from_assignment(p_document_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents 
    SET version_status = 'pending',
        review_locked_at = NULL,
        review_locked_by = NULL
    WHERE document_id = p_document_id;
END;
$$;

-- Function: Get Available Documents for Assignment
CREATE OR REPLACE FUNCTION public.get_available_documents_for_assignment(p_land_id UUID)
RETURNS TABLE (
    document_id UUID,
    land_id UUID,
    document_type TEXT,
    file_name TEXT,
    version_number INTEGER,
    is_latest_version BOOLEAN,
    version_status TEXT,
    version_notes TEXT,
    created_at TIMESTAMPTZ,
    first_name TEXT,
    last_name TEXT,
    uploader_email TEXT,
    is_assigned BOOLEAN,
    current_assignment_status TEXT,
    assigned_to_first_name TEXT,
    assigned_to_last_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.document_id,
        d.land_id,
        d.document_type,
        d.file_name,
        d.version_number,
        d.is_latest_version,
        d.version_status,
        d.version_notes,
        d.created_at,
        u.first_name,
        u.last_name,
        u.email as uploader_email,
        CASE WHEN da.assignment_id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned,
        da.assignment_status as current_assignment_status,
        u2.first_name as assigned_to_first_name,
        u2.last_name as assigned_to_last_name
    FROM documents d
    LEFT JOIN "user" u ON d.uploaded_by = u.user_id
    LEFT JOIN document_assignments da ON d.document_id = da.document_id 
        AND da.assignment_status IN ('assigned', 'in_progress')
    LEFT JOIN "user" u2 ON da.assigned_to = u2.user_id
    WHERE d.land_id = p_land_id
    ORDER BY d.document_type, d.version_number DESC;
END;
$$;

-- ============================================================================
-- Document Versions Stored Procedures
-- ============================================================================

-- Function: Check Land Exists
CREATE OR REPLACE FUNCTION public.check_land_exists(p_land_id UUID)
RETURNS TABLE (
    landowner_id UUID,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT l.landowner_id, l.status 
    FROM lands l
    WHERE l.land_id = p_land_id;
END;
$$;

-- Function: Get Document Versions by Type
CREATE OR REPLACE FUNCTION public.get_document_versions_by_type(
    p_land_id UUID,
    p_document_type TEXT
)
RETURNS TABLE (
    document_id UUID,
    land_id UUID,
    document_type TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    is_draft BOOLEAN,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    version_number INTEGER,
    is_latest_version BOOLEAN,
    version_status TEXT,
    version_notes TEXT,
    version_change_reason TEXT,
    review_locked_at TIMESTAMPTZ,
    review_locked_by UUID,
    created_at TIMESTAMPTZ,
    doc_slot TEXT,
    first_name TEXT,
    last_name TEXT,
    uploader_email TEXT,
    approver_first_name TEXT,
    approver_last_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.document_id,
        d.land_id,
        d.document_type,
        d.file_name,
        d.file_size,
        d.mime_type,
        d.is_draft,
        d.approved_by,
        d.approved_at,
        d.rejection_reason,
        d.version_number,
        d.is_latest_version,
        COALESCE(d.version_status, 'pending')::TEXT as version_status,
        d.version_notes,
        d.version_change_reason,
        d.review_locked_at,
        d.review_locked_by,
        d.created_at,
        COALESCE(d.doc_slot, 'D1')::TEXT as doc_slot,
        u.first_name,
        u.last_name,
        u.email as uploader_email,
        approver.first_name as approver_first_name,
        approver.last_name as approver_last_name
    FROM documents d
    LEFT JOIN "user" u ON d.uploaded_by = u.user_id
    LEFT JOIN "user" approver ON d.approved_by = approver.user_id
    WHERE d.land_id = p_land_id 
    AND d.document_type = p_document_type
    AND d.subtask_id IS NULL
    ORDER BY d.doc_slot, d.version_number DESC, d.created_at DESC;
END;
$$;

-- Function: Get Document Info for Lock
CREATE OR REPLACE FUNCTION public.get_document_info_for_lock(p_document_id UUID)
RETURNS TABLE (
    document_id UUID,
    land_id UUID,
    land_title TEXT,
    document_type TEXT,
    version_number INTEGER,
    version_status TEXT,
    review_locked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.document_id,
        l.land_id,
        l.title::TEXT as land_title,
        d.document_type::TEXT,
        d.version_number,
        d.version_status::TEXT,
        d.review_locked_at
    FROM documents d
    LEFT JOIN lands l ON d.land_id = l.land_id
    WHERE d.document_id = p_document_id;
END;
$$;

-- Function: Lock Document Version for Review
CREATE OR REPLACE FUNCTION public.lock_document_version_for_review(
    p_document_id UUID,
    p_locked_at TIMESTAMPTZ,
    p_locked_by UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents 
    SET version_status = 'under_review',
        review_locked_at = p_locked_at,
        review_locked_by = p_locked_by,
        version_change_reason = p_reason
    WHERE document_id = p_document_id;
END;
$$;

-- Function: Unlock Document Version
CREATE OR REPLACE FUNCTION public.unlock_document_version(
    p_document_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents 
    SET version_status = 'pending',
        review_locked_at = NULL,
        review_locked_by = NULL,
        version_change_reason = p_reason
    WHERE document_id = p_document_id;
END;
$$;

-- ============================================================================
-- Documents Stored Procedures
-- ============================================================================

-- Function: Check Land for Document Upload
CREATE OR REPLACE FUNCTION public.check_land_for_document_upload(p_land_id UUID)
RETURNS TABLE (
    landowner_id UUID,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT landowner_id, status 
    FROM lands 
    WHERE land_id = p_land_id;
END;
$$;

-- Function: Get Occupied Document Slots
CREATE OR REPLACE FUNCTION public.get_occupied_document_slots(
    p_land_id UUID,
    p_document_type TEXT
)
RETURNS TABLE (
    doc_slot TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT documents.doc_slot::TEXT
    FROM documents
    WHERE documents.land_id = p_land_id 
    AND documents.document_type = p_document_type
    AND documents.subtask_id IS NULL
    AND documents.doc_slot IN ('D1', 'D2');
END;
$$;

-- Function: Get Reviewer User IDs
CREATE OR REPLACE FUNCTION public.get_reviewer_user_ids()
RETURNS TABLE (
    user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT u.user_id
    FROM "user" u
    JOIN user_roles ur ON u.user_id = ur.user_id
    WHERE ur.role_key IN ('re_analyst', 're_sales_advisor', 're_governance_lead')
    AND u.is_active = true;
END;
$$;

-- Function: Get Admin User IDs
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE (
    user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT u.user_id
    FROM "user" u
    JOIN user_roles ur ON u.user_id = ur.user_id
    WHERE ur.role_key = 'administrator' 
    AND u.is_active = true;
END;
$$;

-- ============================================================================
-- Investors Stored Procedures
-- ============================================================================

-- Function: Get Land Info for Interest
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

-- Function: Check Own Interest
CREATE OR REPLACE FUNCTION public.check_own_interest(
    p_investor_id UUID,
    p_land_id UUID
)
RETURNS TABLE (
    interest_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT ii.interest_id 
    FROM investor_interests ii
    WHERE ii.investor_id = p_investor_id 
    AND ii.land_id = p_land_id
    AND (
        ii.withdrawal_requested = FALSE 
        OR ii.withdrawal_status IS NULL 
        OR ii.withdrawal_status != 'approved'
    )
    AND ii.status != 'rejected';
END;
$$;

-- Function: Check Existing Interest
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

-- Function: Get Master Sales Advisor
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

-- Function: Create Investor Interest
CREATE OR REPLACE FUNCTION public.create_investor_interest(
    p_interest_id UUID,
    p_investor_id UUID,
    p_land_id UUID,
    p_comments TEXT,
    p_nda_accepted BOOLEAN,
    p_cta_accepted BOOLEAN,
    p_master_advisor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO investor_interests (
        interest_id, investor_id, land_id, status, comments, 
        nda_accepted, cta_accepted, master_sales_advisor_id, created_at
    ) VALUES (
        p_interest_id, p_investor_id, p_land_id, 'pending', p_comments,
        p_nda_accepted, p_cta_accepted, p_master_advisor_id, CURRENT_TIMESTAMP
    );
    
    RETURN p_interest_id;
END;
$$;

-- ============================================================================
-- Tasks Stored Procedures
-- ============================================================================

-- Function: Check Land for Task
CREATE OR REPLACE FUNCTION public.check_land_for_task(p_land_id UUID)
RETURNS TABLE (
    landowner_id UUID,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT l.landowner_id, l.status 
    FROM lands l
    WHERE l.land_id = p_land_id;
END;
$$;

-- Function: Check User Exists
CREATE OR REPLACE FUNCTION public.check_user_exists(p_user_id UUID)
RETURNS TABLE (
    user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id 
    FROM "user" u
    WHERE u.user_id = p_user_id;
END;
$$;

-- Function: Check Existing Pending Task
CREATE OR REPLACE FUNCTION public.check_existing_pending_task(
    p_land_id UUID,
    p_title TEXT,
    p_assigned_to UUID
)
RETURNS TABLE (
    task_exists INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 1 as task_exists
    FROM tasks
    WHERE land_id = p_land_id
    AND title = p_title
    AND assigned_to = p_assigned_to
    AND status = 'pending'
    LIMIT 1;
END;
$$;

-- Function: Create Task
CREATE OR REPLACE FUNCTION public.create_task(
    p_task_id UUID,
    p_land_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_assigned_to UUID,
    p_assigned_role TEXT,
    p_created_by UUID,
    p_priority TEXT,
    p_due_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO tasks (
        task_id, land_id, title, description,
        assigned_to, assigned_role, created_by, status, priority,
        due_date, created_at, updated_at
    ) VALUES (
        p_task_id, p_land_id, p_title, p_description,
        p_assigned_to, p_assigned_role, p_created_by, 'pending', p_priority,
        p_due_date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    
    RETURN p_task_id;
END;
$$;

-- Function: Create Subtask
CREATE OR REPLACE FUNCTION public.create_subtask(
    p_subtask_id UUID,
    p_task_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_status TEXT,
    p_created_by UUID,
    p_order_index INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO subtasks (
        subtask_id, task_id, title, description, status,
        created_by, order_index
    ) VALUES (
        p_subtask_id, p_task_id, p_title, p_description, p_status,
        p_created_by, p_order_index
    );
    
    RETURN p_subtask_id;
END;
$$;

-- ============================================================================
-- Users Stored Procedures
-- ============================================================================

-- Function: Check User by Email
CREATE OR REPLACE FUNCTION public.check_user_by_email(p_email TEXT)
RETURNS TABLE (
    user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT user_id 
    FROM "user" 
    WHERE email = p_email;
END;
$$;

-- Function: Create User
CREATE OR REPLACE FUNCTION public.create_user(
    p_email TEXT,
    p_password_hash TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_address TEXT
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := gen_random_uuid();
    
    INSERT INTO "user" (user_id, email, password_hash, first_name, last_name, phone, address)
    VALUES (v_user_id, p_email, p_password_hash, p_first_name, p_last_name, p_phone, p_address);
    
    RETURN QUERY
    SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone::TEXT,
        u.address::TEXT,
        u.created_at,
        u.updated_at
    FROM "user" u
    WHERE u.user_id = v_user_id;
END;
$$;

-- Function: List Users with Role Filter
CREATE OR REPLACE FUNCTION public.list_users_with_role_filter(
    p_role TEXT,
    p_skip INTEGER,
    p_limit INTEGER
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.phone, 
        u.address::TEXT, 
        u.created_at, 
        u.updated_at
    FROM "user" u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    WHERE (p_role IS NULL OR ur.role_key = p_role)
    ORDER BY u.created_at DESC 
    OFFSET p_skip 
    LIMIT p_limit;
END;
$$;

-- Function: Check Email Taken by Another User
CREATE OR REPLACE FUNCTION public.check_email_taken_by_another(
    p_email TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT user_id 
    FROM "user" 
    WHERE email = p_email 
    AND user_id != p_user_id;
END;
$$;

-- Function: Update User Profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_address TEXT
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "user" 
    SET 
        email = COALESCE(p_email, email),
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        phone = COALESCE(p_phone, phone),
        address = COALESCE(p_address, address),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
    RETURN QUERY
    SELECT 
        user_id, 
        email, 
        first_name, 
        last_name, 
        phone::TEXT, 
        address::TEXT, 
        created_at, 
        updated_at
    FROM "user"
    WHERE user_id = p_user_id;
END;
$$;

-- Function: Check Shared Projects
CREATE OR REPLACE FUNCTION public.check_shared_projects(
    p_current_user_id UUID,
    p_target_user_id UUID
)
RETURNS TABLE (
    count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT as count
    FROM tasks t1
    JOIN tasks t2 ON t1.land_id = t2.land_id
    WHERE t1.assigned_to = p_current_user_id
    AND t2.assigned_to = p_target_user_id;
END;
$$;

-- ============================================================================
-- Reviews Stored Procedures
-- ============================================================================

-- Function: Check Land Exists for Review
CREATE OR REPLACE FUNCTION public.check_land_exists_for_review(p_land_id UUID)
RETURNS TABLE (
    land_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT land_id 
    FROM lands 
    WHERE land_id = p_land_id;
END;
$$;

-- Function: Get Land Status
CREATE OR REPLACE FUNCTION public.get_land_status(p_land_id UUID)
RETURNS TABLE (
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT status 
    FROM lands 
    WHERE land_id = p_land_id;
END;
$$;

-- ============================================================================
-- Reviewer Stored Procedures
-- ============================================================================

-- Function: Get Reviewer Tasks
CREATE OR REPLACE FUNCTION public.get_reviewer_tasks(
    p_reviewer_id UUID,
    p_status_filter TEXT
)
RETURNS TABLE (
    task_id UUID,
    land_id UUID,
    title TEXT,
    description TEXT,
    assigned_to UUID,
    assigned_role TEXT,
    status TEXT,
    priority TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.task_id,
        t.land_id,
        t.title,
        t.description,
        t.assigned_to,
        t.assigned_role,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at
    FROM tasks t
    WHERE t.assigned_to = p_reviewer_id
    AND (p_status_filter IS NULL OR t.status = p_status_filter)
    ORDER BY t.created_at DESC;
END;
$$;

-- Function: Get Reviewer Documents
CREATE OR REPLACE FUNCTION public.get_reviewer_documents(
    p_reviewer_id UUID,
    p_land_id UUID
)
RETURNS TABLE (
    document_id UUID,
    document_type TEXT,
    file_name TEXT,
    version_number INTEGER,
    version_status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.document_id,
        d.document_type,
        d.file_name,
        d.version_number,
        d.version_status,
        d.created_at
    FROM documents d
    JOIN document_assignments da ON d.document_id = da.document_id
    WHERE da.assigned_to = p_reviewer_id
    AND d.land_id = p_land_id
    ORDER BY d.created_at DESC;
END;
$$;

-- Function: Check Column Exists
CREATE OR REPLACE FUNCTION public.check_column_exists(
    p_table_name TEXT,
    p_column_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = p_table_name 
        AND column_name = p_column_name
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$;

-- Function: Check Existing Review Status
CREATE OR REPLACE FUNCTION public.check_existing_review_status(
    p_land_id UUID,
    p_reviewer_role TEXT
)
RETURNS TABLE (
    review_status_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT review_status_id 
    FROM review_statuses 
    WHERE land_id = p_land_id 
    AND reviewer_role = p_reviewer_role;
END;
$$;

-- Function: Release Document Lock
CREATE OR REPLACE FUNCTION public.release_document_lock(
    p_document_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents 
    SET version_status = 'active',
        review_locked_at = NULL,
        review_locked_by = NULL,
        version_change_reason = p_reason
    WHERE document_id = p_document_id;
END;
$$;

-- ============================================================================
-- Notifications Stored Procedures
-- ============================================================================

-- Function: Fetch Unread Notifications
CREATE OR REPLACE FUNCTION public.fetch_unread_notifications(
    p_user_id UUID,
    p_limit INTEGER
)
RETURNS TABLE (
    notification_id UUID,
    user_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.notification_id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.read as is_read,
        n.created_at,
        n.read_at,
        n.data as metadata
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND n.read = FALSE
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function: Check Notifications Table Exists
CREATE OR REPLACE FUNCTION public.check_notifications_table_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$;

-- Function: Mark Notification as Read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE notifications 
    SET read = TRUE, read_at = CURRENT_TIMESTAMP
    WHERE notification_id = p_notification_id 
    AND user_id = p_user_id;
END;
$$;

-- Function: Mark All Notifications as Read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE notifications 
    SET read = TRUE, read_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
    AND read = FALSE;
END;
$$;

-- Function: Get Notification Count
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

-- ============================================================================
-- Marketplace Settings Stored Procedures
-- ============================================================================

-- Function: Get Marketplace Settings
CREATE OR REPLACE FUNCTION public.get_marketplace_settings()
RETURNS TABLE (
    setting_key TEXT,
    setting_value JSONB,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        setting_key,
        setting_value,
        updated_at
    FROM marketplace_settings
    ORDER BY updated_at DESC;
END;
$$;

-- Function: Create Marketplace Settings Table
CREATE OR REPLACE FUNCTION public.create_marketplace_settings_table()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS marketplace_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
END;
$$;

-- Function: Upsert Marketplace Setting
CREATE OR REPLACE FUNCTION public.upsert_marketplace_setting(
    p_setting_key TEXT,
    p_setting_value JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO marketplace_settings (setting_key, setting_value, updated_at)
    VALUES (p_setting_key, p_setting_value, CURRENT_TIMESTAMP)
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = p_setting_value,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- ============================================================================
-- Messaging API Stored Procedures
-- ============================================================================

-- Function: Get Messages
CREATE OR REPLACE FUNCTION public.get_messages(
    p_user_id UUID,
    p_skip INTEGER,
    p_limit INTEGER
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    recipient_id UUID,
    subject TEXT,
    body TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id,
        m.sender_id,
        m.recipient_id,
        m.subject,
        m.body,
        m.is_read,
        m.created_at
    FROM messages m
    WHERE m.recipient_id = p_user_id
    ORDER BY m.created_at DESC
    OFFSET p_skip
    LIMIT p_limit;
END;
$$;

-- Function: Check Messages Table Exists
CREATE OR REPLACE FUNCTION public.check_messages_table_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'messages'
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$;

-- ============================================================================
-- Document Slots Stored Procedures
-- ============================================================================

-- Function: Update Document Slot
CREATE OR REPLACE FUNCTION public.update_document_slot(
    p_document_id UUID,
    p_doc_slot TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE documents 
    SET doc_slot = p_doc_slot
    WHERE document_id = p_document_id;
END;
$$;

-- Function: Get Document Slots for Land
CREATE OR REPLACE FUNCTION public.get_document_slots_for_land(
    p_land_id UUID,
    p_document_type TEXT
)
RETURNS TABLE (
    doc_slot TEXT,
    document_id UUID,
    version_number INTEGER,
    is_latest_version BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.doc_slot,
        d.document_id,
        d.version_number,
        d.is_latest_version
    FROM documents d
    WHERE d.land_id = p_land_id
    AND d.document_type = p_document_type
    AND d.subtask_id IS NULL
    ORDER BY d.doc_slot, d.version_number DESC;
END;
$$;

