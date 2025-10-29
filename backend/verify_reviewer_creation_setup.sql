-- ============================================================================
-- Verify Database Setup for Reviewer Creation
-- Run this in pgAdmin Query Tool to diagnose issues
-- ============================================================================

-- 1. Check if lu_roles table exists and has reviewer roles
SELECT 
    'Checking lu_roles table...' as check_step,
    COUNT(*) as role_count,
    STRING_AGG(role_key, ', ' ORDER BY role_key) as available_roles
FROM lu_roles;

-- 2. Verify specific reviewer roles exist
SELECT 
    'Reviewer Roles Check' as check_step,
    role_key,
    role_name,
    CASE 
        WHEN role_key IN ('re_analyst', 're_sales_advisor', 're_governance_lead') THEN '✓ Found'
        ELSE '✗ Missing'
    END as status
FROM lu_roles
WHERE role_key IN ('re_analyst', 're_sales_advisor', 're_governance_lead');

-- 3. Check if user_roles table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- 4. Check if user_roles has unique constraint on (user_id, role_key)
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_roles'
    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_type, kcu.ordinal_position;

-- 5. Check if "user" table exists and has required columns
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user' 
    AND column_name IN ('user_id', 'email', 'password_hash', 'first_name', 'last_name', 'phone', 'is_active')
ORDER BY ordinal_position;

-- 6. Test insert a test role if missing (DO NOT RUN IN PRODUCTION WITHOUT REVIEW)
-- Uncomment these if roles are missing:
/*
INSERT INTO lu_roles (role_key, role_name, description) VALUES
('re_analyst', 'RE Analyst', 'Technical and financial feasibility analysis')
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO lu_roles (role_key, role_name, description) VALUES
('re_sales_advisor', 'RE Sales Advisor', 'Market evaluation and investor alignment')
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO lu_roles (role_key, role_name, description) VALUES
('re_governance_lead', 'RE Governance Lead', 'Compliance, regulatory, and local authority validation')
ON CONFLICT (role_key) DO NOTHING;
*/

-- 7. Check for active database connections (might indicate locks)
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    state_change,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE datname = current_database()
    AND state != 'idle'
ORDER BY query_start DESC;

-- 8. Check for locks on user or user_roles tables
SELECT 
    l.locktype,
    l.database,
    l.relation::regclass,
    l.page,
    l.tuple,
    l.virtualxid,
    l.transactionid,
    l.mode,
    l.granted,
    a.usename,
    a.query,
    a.query_start,
    age(now(), a.query_start) AS "age"
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE (l.relation::regclass::text LIKE '%user%' OR l.relation::regclass::text LIKE '%user_roles%')
ORDER BY a.query_start;

