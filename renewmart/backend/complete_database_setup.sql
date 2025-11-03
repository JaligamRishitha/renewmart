-- ============================================================================
-- RenewMart Complete Database Setup Script for Collaboration Feature
-- Run this in pgAdmin Query Tool connected to your PostgreSQL database
-- ============================================================================

-- 1) Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- 2) Lookup Tables
CREATE TABLE IF NOT EXISTS lu_roles (
    role_key TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lu_status (
    status_key TEXT PRIMARY KEY,
    scope TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lu_task_status (
    status_key TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS lu_energy_type (
    energy_key TEXT PRIMARY KEY
);

-- 3) Users & RBAC
CREATE TABLE IF NOT EXISTS "user" (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    role_key TEXT REFERENCES lu_roles(role_key),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY(user_id, role_key)
);

-- 4) Section definitions
CREATE TABLE IF NOT EXISTS section_definitions (
    section_key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    default_role_reviewer TEXT REFERENCES lu_roles(role_key)
);

-- 5) Land, Sections, Documents
CREATE TABLE IF NOT EXISTS lands (
    land_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landowner_id UUID NOT NULL REFERENCES "user"(user_id),
    title TEXT NOT NULL,
    location_text TEXT,
    coordinates JSONB,
    area_acres NUMERIC(10,2),
    land_type TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    admin_notes TEXT,
    energy_key TEXT,
    capacity_mw NUMERIC(12,2),
    price_per_mwh NUMERIC(12,2),
    timeline_text TEXT,
    contract_term_years INT,
    developer_name TEXT,
    project_priority TEXT,
    project_due_date DATE,
    published_at TIMESTAMPTZ,
    interest_locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS land_sections (
    land_section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    section_key TEXT NOT NULL REFERENCES section_definitions(section_key),
    status TEXT NOT NULL DEFAULT 'draft',
    assigned_role TEXT REFERENCES lu_roles(role_key),
    assigned_user UUID REFERENCES "user"(user_id),
    data JSONB,
    reviewer_comments TEXT,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(land_id, section_key)
);

CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id UUID REFERENCES lands(land_id) ON DELETE CASCADE,
    land_section_id UUID REFERENCES land_sections(land_section_id) ON DELETE CASCADE,
    subtask_id UUID,  -- Will add foreign key after subtasks table is created
    uploaded_by UUID REFERENCES "user"(user_id),
    document_type TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    is_draft BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active',
    version_status TEXT,
    review_locked_by UUID REFERENCES "user"(user_id),
    review_locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6) Tasks and History
CREATE TABLE IF NOT EXISTS tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    land_section_id UUID REFERENCES land_sections(land_section_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_role TEXT REFERENCES lu_roles(role_key),
    assigned_to UUID REFERENCES "user"(user_id),
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    task_type TEXT,
    start_date DATE,
    end_date DATE,
    due_date DATE,
    completion_notes TEXT,
    created_by UUID REFERENCES "user"(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    changed_by UUID REFERENCES "user"(user_id),
    from_status TEXT,
    to_status TEXT,
    start_ts TIMESTAMPTZ DEFAULT now(),
    end_ts TIMESTAMPTZ,
    note TEXT
);

-- 7) SUBTASKS TABLE (Required for Collaboration Feature)
CREATE TABLE IF NOT EXISTS subtasks (
    subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES "user"(user_id),  -- For collaboration: assigns subtask to another reviewer
    created_by UUID NOT NULL REFERENCES "user"(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0
);

-- Add foreign key from documents to subtasks (after subtasks table exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_subtask_id_fkey'
    ) THEN
        ALTER TABLE documents 
        ADD CONSTRAINT documents_subtask_id_fkey 
        FOREIGN KEY (subtask_id) REFERENCES subtasks(subtask_id) ON DELETE SET NULL;
    END IF;
END $$;

-- 8) Investor Interests
CREATE TABLE IF NOT EXISTS investor_interests (
    interest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES "user"(user_id),
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'submitted',
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(investor_id, land_id)
);

-- 9) Review Status (for review persistence)
CREATE TABLE IF NOT EXISTS review_status (
    review_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES lu_roles(role_key),
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    subtasks_completed INTEGER DEFAULT 0,
    total_subtasks INTEGER DEFAULT 0,
    documents_approved INTEGER DEFAULT 0,
    total_documents INTEGER DEFAULT 0,
    reviewer_name TEXT,
    rating INTEGER,
    comments TEXT,
    justification TEXT,
    review_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(land_id, role_id)
);

-- 10) Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_lands_owner ON lands(landowner_id);
CREATE INDEX IF NOT EXISTS idx_lands_status ON lands(status);
CREATE INDEX IF NOT EXISTS idx_lands_published ON lands(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lands_energy ON lands(energy_key);
CREATE INDEX IF NOT EXISTS idx_land_sections_land ON land_sections(land_id);
CREATE INDEX IF NOT EXISTS idx_land_sections_status ON land_sections(status);
CREATE INDEX IF NOT EXISTS idx_sections_assignee ON land_sections(assigned_user);
CREATE INDEX IF NOT EXISTS idx_sections_role ON land_sections(assigned_role);
CREATE INDEX IF NOT EXISTS idx_docs_land ON documents(land_id);
CREATE INDEX IF NOT EXISTS idx_docs_section ON documents(land_section_id);
CREATE INDEX IF NOT EXISTS idx_docs_subtask ON documents(subtask_id) WHERE subtask_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_docs_uploader ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_docs_review_locked ON documents(review_locked_by) WHERE review_locked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_land ON tasks(land_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_role ON tasks(assigned_role) WHERE assigned_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_period ON task_history(start_ts, end_ts);
CREATE INDEX IF NOT EXISTS idx_interest_land ON investor_interests(land_id);
CREATE INDEX IF NOT EXISTS idx_review_status_land ON review_status(land_id);
CREATE INDEX IF NOT EXISTS idx_review_status_role ON review_status(role_id);

-- SUBTASKS INDEXES (Critical for Collaboration Feature Performance)
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_by ON subtasks(created_by);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_at ON subtasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed_at ON subtasks(completed_at) WHERE completed_at IS NOT NULL;

-- 11) Functions & Triggers
-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION trg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on selected tables
DROP TRIGGER IF EXISTS trg_touch_lands ON lands;
CREATE TRIGGER trg_touch_lands BEFORE UPDATE ON lands
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_land_sections ON land_sections;
CREATE TRIGGER trg_touch_land_sections BEFORE UPDATE ON land_sections
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_tasks ON tasks;
CREATE TRIGGER trg_touch_tasks BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_subtasks ON subtasks;
CREATE TRIGGER trg_touch_subtasks BEFORE UPDATE ON subtasks
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_review_status ON review_status;
CREATE TRIGGER trg_touch_review_status BEFORE UPDATE ON review_status
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- Task creation guard function
CREATE OR REPLACE FUNCTION check_tasks_only_after_submit()
RETURNS TRIGGER AS $$
DECLARE l_status TEXT;
BEGIN
    SELECT status INTO l_status FROM lands WHERE land_id = NEW.land_id;
    IF l_status IN ('draft') THEN
        RAISE EXCEPTION 'Tasks cannot be created while land is in DRAFT.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_after_submit ON tasks;
CREATE TRIGGER trg_tasks_after_submit
BEFORE INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION check_tasks_only_after_submit();

-- Task history logging function
CREATE OR REPLACE FUNCTION log_task_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP='INSERT' THEN
        INSERT INTO task_history(task_id, changed_by, from_status, to_status, start_ts, note)
        VALUES (NEW.task_id, NEW.created_by, NULL, NEW.status, now(), 'task created');
        RETURN NEW;
    ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        UPDATE task_history
            SET end_ts = now()
            WHERE task_id = NEW.task_id AND end_ts IS NULL;
        INSERT INTO task_history(task_id, changed_by, from_status, to_status, start_ts)
        VALUES (NEW.task_id, NEW.created_by, OLD.status, NEW.status, now());
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_history_insert ON tasks;
CREATE TRIGGER trg_task_history_insert
AFTER INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_history();

DROP TRIGGER IF EXISTS trg_task_history_update ON tasks;
CREATE TRIGGER trg_task_history_update
AFTER UPDATE OF status ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_history();

-- 12) Seed data
INSERT INTO lu_roles(role_key, label) VALUES
('landowner','Landowner'),
('investor','Investor'),
('re_sales_advisor','RE Sales Advisor'),
('re_analyst','RE Analyst'),
('re_governance_lead','RE Governance Lead'),
('administrator','Administrator'),
('project_manager','Project Manager')
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO lu_status(status_key, scope) VALUES
('draft','land'),('submitted','land'),('under_review','land'),('approved','land'),
('rejected','land'),('investor_ready','land'),('published','land'),
('interest_locked','land'),('rtb','land'),('complete','land'),
('assigned','task'),('in_progress','task'),('pending','task'),('delayed','task'),
('completed','task'),('rejected','task'),('on_hold','task'),
('draft','section'),('submitted','section'),('approved','section'),('rejected','section')
ON CONFLICT (status_key) DO NOTHING;

INSERT INTO lu_task_status(status_key) VALUES
('assigned'),('in_progress'),('pending'),('delayed'),('completed'),('rejected'),('on_hold')
ON CONFLICT (status_key) DO NOTHING;

INSERT INTO lu_energy_type(energy_key) VALUES
('Solar'),('Wind'),('Hydroelectric'),('Biomass'),('Geothermal')
ON CONFLICT (energy_key) DO NOTHING;

INSERT INTO section_definitions(section_key, label, default_role_reviewer) VALUES
('ownership','Ownership & Title','re_governance_lead'),
('site','Site Characteristics','re_analyst'),
('grid','Grid & Interconnection','re_analyst'),
('environment','Environmental & Permits','re_governance_lead'),
('commercial','Commercial / Lease / PPA','re_sales_advisor')
ON CONFLICT (section_key) DO NOTHING;

-- 13) Views
CREATE OR REPLACE VIEW vw_investor_listings AS
SELECT
    land_id,
    title,
    location_text,
    capacity_mw,
    price_per_mwh,
    timeline_text,
    contract_term_years,
    developer_name,
    energy_key
FROM lands
WHERE status='published';

-- ============================================================================
-- VERIFICATION QUERIES (Run after setup to verify everything is correct)
-- ============================================================================

-- Verify subtasks table exists
SELECT 'subtasks table' as check_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subtasks') 
            THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- Verify all required columns in subtasks
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subtasks' 
ORDER BY ordinal_position;

-- Verify indexes on subtasks
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'subtasks';

-- Verify foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'subtasks';

-- Count existing subtasks
SELECT COUNT(*) as total_subtasks FROM subtasks;

-- ============================================================================
-- USEFUL QUERIES FOR TESTING COLLABORATION FEATURE
-- ============================================================================

-- View all subtasks with collaboration details
/*
SELECT 
    s.subtask_id,
    s.title as subtask_title,
    s.status as subtask_status,
    s.assigned_to,
    assignee.first_name || ' ' || assignee.last_name as assigned_to_name,
    assignee.email as assigned_to_email,
    s.created_by,
    creator.first_name || ' ' || creator.last_name as created_by_name,
    creator.email as created_by_email,
    t.task_id,
    t.title as task_type,
    t.assigned_to as task_owner_id,
    task_owner.first_name || ' ' || task_owner.last_name as task_owner_name,
    t.assigned_role as task_role,
    l.land_id,
    l.title as project_title,
    CASE 
        WHEN s.assigned_to IS NULL THEN 'Unassigned'
        WHEN s.assigned_to = t.assigned_to THEN 'Assigned to Task Owner'
        ELSE 'Assigned to Collaborator'
    END as assignment_type
FROM subtasks s
JOIN tasks t ON s.task_id = t.task_id
JOIN lands l ON t.land_id = l.land_id
LEFT JOIN "user" assignee ON s.assigned_to = assignee.user_id
LEFT JOIN "user" creator ON s.created_by = creator.user_id
LEFT JOIN "user" task_owner ON t.assigned_to = task_owner.user_id
ORDER BY s.created_at DESC;
*/

-- View collaboration work for a specific user (replace USER_ID_HERE)
/*
SELECT 
    s.subtask_id,
    s.title,
    s.description,
    s.status,
    s.created_at as assigned_at,
    t.task_id,
    t.title as task_type,
    t.assigned_role,
    l.land_id,
    l.title as project_title,
    creator.first_name || ' ' || creator.last_name as assigned_by_name,
    creator.email as assigned_by_email,
    task_owner.first_name || ' ' || task_owner.last_name as task_owner_name
FROM subtasks s
JOIN tasks t ON s.task_id = t.task_id
JOIN lands l ON t.land_id = l.land_id
LEFT JOIN "user" creator ON s.created_by = creator.user_id
LEFT JOIN "user" task_owner ON t.assigned_to = task_owner.user_id
WHERE s.assigned_to = 'USER_ID_HERE'::uuid
  AND t.assigned_to != 'USER_ID_HERE'::uuid
ORDER BY s.created_at DESC;
*/

-- View all reviewers available for collaboration
/*
SELECT 
    u.user_id,
    u.first_name || ' ' || u.last_name as name,
    u.email,
    ur.role_key as role,
    lr.label as role_label,
    u.is_active
FROM "user" u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN lu_roles lr ON ur.role_key = lr.role_key
WHERE ur.role_key IN ('re_sales_advisor', 're_analyst', 're_governance_lead')
  AND u.is_active = true
ORDER BY lr.label, u.first_name, u.last_name;
*/

