-- RenewMart complete Postgres schema (idempotent)
-- Run inside the Postgres container or via docker-compose (see instructions)

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================
-- Lookup tables
-- =============================
CREATE TABLE IF NOT EXISTS lu_roles (
    role_key      TEXT PRIMARY KEY,
    label         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lu_status (
    status_key    TEXT PRIMARY KEY,
    status_name   TEXT NOT NULL,
    description   TEXT
);

CREATE TABLE IF NOT EXISTS lu_task_status (
    status_key    TEXT PRIMARY KEY,
    status_name   TEXT NOT NULL,
    description   TEXT
);

CREATE TABLE IF NOT EXISTS lu_energy_types (
    energy_type_key  TEXT PRIMARY KEY,
    energy_type_name TEXT NOT NULL,
    description      TEXT
);

-- Seed minimal roles (safe if already present)
INSERT INTO lu_roles (role_key, label) VALUES
  ('administrator','Administrator')
ON CONFLICT (role_key) DO NOTHING;
INSERT INTO lu_roles (role_key, label) VALUES
  ('landowner','Landowner')
ON CONFLICT (role_key) DO NOTHING;
INSERT INTO lu_roles (role_key, label) VALUES
  ('investor','Investor')
ON CONFLICT (role_key) DO NOTHING;

-- Backward compatibility: add label if missing and populate from role_name/role_key
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='lu_roles' AND column_name='label'
    ) THEN
        ALTER TABLE lu_roles ADD COLUMN label TEXT;
        UPDATE lu_roles SET label = COALESCE(label, NULLIF(role_name, ''), role_key);
        ALTER TABLE lu_roles ALTER COLUMN label SET NOT NULL;
    END IF;
END $$;

-- =============================
-- Users and roles
-- =============================
CREATE TABLE IF NOT EXISTS "user" (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    phone         TEXT,
    primary_role  TEXT REFERENCES lu_roles(role_key),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Backfill missing column if needed
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='user' AND column_name='is_verified'
    ) THEN
        ALTER TABLE "user" ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='user' AND column_name='primary_role'
    ) THEN
        ALTER TABLE "user" ADD COLUMN primary_role TEXT REFERENCES lu_roles(role_key);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id    UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    role_key   TEXT REFERENCES lu_roles(role_key),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, role_key)
);

-- Backfill primary_role from first available user_roles entry (idempotent)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='user' AND column_name='primary_role'
    ) THEN
        UPDATE "user" u
        SET primary_role = fr.role_key
        FROM (
            SELECT user_id, MIN(role_key) AS role_key
            FROM user_roles
            GROUP BY user_id
        ) fr
        WHERE u.user_id = fr.user_id
          AND (u.primary_role IS NULL OR u.primary_role = '');
    END IF;
END $$;

-- =============================
-- Lands and sections
-- =============================
CREATE TABLE IF NOT EXISTS section_definitions (
    section_key   TEXT PRIMARY KEY,
    section_name  TEXT NOT NULL,
    description   TEXT,
    required_role TEXT REFERENCES lu_roles(role_key),
    order_index   INTEGER
);

CREATE TABLE IF NOT EXISTS lands (
    land_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landowner_id   UUID NOT NULL REFERENCES "user"(user_id),
    title          TEXT NOT NULL,
    location_text  TEXT,
    coordinates    JSONB,
    area_acres     NUMERIC(10,2),
    land_type      TEXT,
    energy_type    TEXT REFERENCES lu_energy_types(energy_type_key),
    description    TEXT,
    status         TEXT NOT NULL DEFAULT 'draft' REFERENCES lu_status(status_key),
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS land_sections (
    land_section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id         UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    section_key     TEXT NOT NULL REFERENCES section_definitions(section_key),
    status          TEXT NOT NULL DEFAULT 'draft' REFERENCES lu_status(status_key),
    assigned_role   TEXT REFERENCES lu_roles(role_key),
    assigned_user   UUID REFERENCES "user"(user_id),
    data            JSONB,
    reviewer_comments TEXT,
    submitted_at    TIMESTAMPTZ,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- Documents
-- =============================
CREATE TABLE IF NOT EXISTS documents (
    document_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id            UUID REFERENCES lands(land_id) ON DELETE CASCADE,
    land_section_id    UUID REFERENCES land_sections(land_section_id) ON DELETE CASCADE,
    filename           TEXT NOT NULL,
    original_filename  TEXT NOT NULL,
    file_path          TEXT NOT NULL,
    file_size          INTEGER,
    mime_type          TEXT,
    description        TEXT,
    uploaded_by        UUID NOT NULL REFERENCES "user"(user_id),
    uploaded_at        TIMESTAMPTZ DEFAULT now(),
    -- Versioning & workflow fields (added over time)
    document_type      TEXT,
    task_id            UUID,
    subtask_id         UUID,
    status             VARCHAR(50) DEFAULT 'pending',
    approved_by        UUID REFERENCES "user"(user_id),
    approved_at        TIMESTAMPTZ,
    rejection_reason   TEXT,
    admin_comments     TEXT,
    version_number     INTEGER DEFAULT 1,
    is_latest_version  BOOLEAN DEFAULT TRUE,
    parent_document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
    version_notes      TEXT,
    version_status     VARCHAR(50) DEFAULT 'active',
    review_locked_at   TIMESTAMPTZ,
    review_locked_by   UUID REFERENCES "user"(user_id),
    version_change_reason TEXT,
    file_data          BYTEA
);

-- Optional doc_slot support
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='doc_slot'
    ) THEN
        ALTER TABLE documents ADD COLUMN doc_slot VARCHAR(10) DEFAULT 'D1';
    END IF;
END $$;

-- =============================
-- Tasks & history
-- =============================
CREATE TABLE IF NOT EXISTS tasks (
    task_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id         UUID REFERENCES lands(land_id) ON DELETE CASCADE,
    land_section_id UUID REFERENCES land_sections(land_section_id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    assigned_role   TEXT REFERENCES lu_roles(role_key),
    assigned_to     UUID REFERENCES "user"(user_id),
    status          TEXT NOT NULL DEFAULT 'assigned' REFERENCES lu_task_status(status_key),
    start_date      DATE,
    end_date        DATE,
    created_by      UUID NOT NULL REFERENCES "user"(user_id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    completion_notes TEXT
);

CREATE TABLE IF NOT EXISTS task_history (
    history_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    old_status  TEXT,
    new_status  TEXT NOT NULL,
    changed_by  UUID NOT NULL REFERENCES "user"(user_id),
    comments    TEXT,
    start_ts    TIMESTAMPTZ DEFAULT now(),
    end_ts      TIMESTAMPTZ
);

-- Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
    subtask_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',
    assigned_to  UUID REFERENCES "user"(user_id),
    created_by   UUID NOT NULL REFERENCES "user"(user_id),
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    order_index  INTEGER DEFAULT 0
);

-- =============================
-- Messaging & notifications
-- =============================
CREATE TABLE IF NOT EXISTS message_threads (
    thread_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    created_by  UUID NOT NULL REFERENCES "user"(user_id),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    message_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id         UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    task_id         UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    thread_id       UUID REFERENCES message_threads(thread_id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    subject         VARCHAR(255) NOT NULL DEFAULT '',
    content         TEXT NOT NULL,
    message_type    VARCHAR(50) DEFAULT 'text',
    is_read         BOOLEAN DEFAULT FALSE,
    is_urgent       BOOLEAN DEFAULT FALSE,
    parent_message_id UUID REFERENCES messages(message_id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    read_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS message_reactions (
    reaction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id    UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (message_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    category        TEXT,
    data            JSONB,
    read            BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================
-- Document assignments (review workflow)
-- =============================
CREATE TABLE IF NOT EXISTS document_assignments (
    assignment_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    land_id          UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    assigned_to      UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    assigned_by      UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    reviewer_role    VARCHAR(50) NOT NULL,
    task_id          UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    assignment_status VARCHAR(50) DEFAULT 'assigned',
    assignment_notes TEXT,
    assigned_at      TIMESTAMPTZ DEFAULT now(),
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    due_date         TIMESTAMPTZ,
    priority         VARCHAR(20) DEFAULT 'medium',
    is_locked        BOOLEAN DEFAULT TRUE,
    lock_reason      TEXT
);

-- =============================
-- Investor interests
-- =============================
CREATE TABLE IF NOT EXISTS investor_interests (
    interest_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id           UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    investor_id       UUID NOT NULL REFERENCES "user"(user_id),
    investment_amount NUMERIC(15,2),
    message           TEXT,
    status            TEXT DEFAULT 'pending',
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- Indexes (idempotent creates)
-- =============================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_documents_version') THEN
        CREATE INDEX idx_documents_version ON documents (land_id, document_type, version_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_documents_latest') THEN
        CREATE INDEX idx_documents_latest ON documents (land_id, document_type, is_latest_version);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_documents_status') THEN
        CREATE INDEX idx_documents_status ON documents (status, version_status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_subtasks_task') THEN
        CREATE INDEX idx_subtasks_task ON subtasks (task_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_messages_recipient') THEN
        CREATE INDEX idx_messages_recipient ON messages (recipient_id, is_read);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_messages_sender') THEN
        CREATE INDEX idx_messages_sender ON messages (sender_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_notifications_user_read') THEN
        CREATE INDEX idx_notifications_user_read ON notifications (user_id, read);
    END IF;
END $$;

COMMIT;

-- How to run (from project root):
-- docker-compose exec postgres_db psql -U renewmart_user -d renewmart_db -f /app/migrations/complete_schema.sql


