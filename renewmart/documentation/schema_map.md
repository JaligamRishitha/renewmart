# Database Schema Map

## Overview
This document maintains the complete database schema for the RenewMart application. It is updated whenever schema changes are made.

**Last Updated**: October 17, 2025

---

## Tables

### 1. user
**Purpose**: Stores user account information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| first_name | VARCHAR(50) | NOT NULL | User first name |
| last_name | VARCHAR(50) | NOT NULL | User last name |
| phone | VARCHAR(20) | | Phone number |
| password_hash | TEXT | NOT NULL | Hashed password |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| is_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| verification_code | VARCHAR(10) | | Email verification code |
| verification_expires | TIMESTAMP | | Verification code expiry |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- PRIMARY KEY on user_id
- UNIQUE INDEX on email

---

### 2. user_roles
**Purpose**: Maps users to their roles (many-to-many relationship)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FOREIGN KEY → user(user_id) | User reference |
| role_key | VARCHAR(50) | FOREIGN KEY → lu_roles(role_key) | Role reference |
| assigned_at | TIMESTAMP | DEFAULT NOW() | Role assignment timestamp |

**Constraints**:
- PRIMARY KEY (user_id, role_key)
- ON DELETE CASCADE for user_id

---

### 3. lu_roles
**Purpose**: Lookup table for available user roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_key | VARCHAR(50) | PRIMARY KEY | Role identifier |
| label | VARCHAR(100) | NOT NULL | Display name |

**Standard Roles**:
- `administrator` - System administrator
- `landowner` - Land owner
- `investor` - Investor
- `re_analyst` - Real Estate Analyst
- `re_sales_advisor` - Real Estate Sales Advisor
- `re_governance_lead` - Governance Lead
- `project_manager` - Project Manager

---

### 4. lands
**Purpose**: Stores land listing information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| land_id | UUID | PRIMARY KEY | Unique land identifier |
| landowner_id | UUID | FOREIGN KEY → user(user_id) | Owner reference |
| title | TEXT | NOT NULL | Land title/name |
| location_text | TEXT | | Location description |
| coordinates | JSONB | | GPS coordinates {lat, lng} |
| area_acres | DECIMAL(10,2) | | Land area in acres |
| land_type | VARCHAR(100) | | Terrain type |
| status | VARCHAR(50) | DEFAULT 'draft' | Land status |
| energy_key | VARCHAR(50) | FOREIGN KEY → lu_energy_types | Energy type |
| capacity_mw | DECIMAL(10,2) | | Planned capacity (MW) |
| price_per_mwh | DECIMAL(10,2) | | Price per MWh |
| timeline_text | TEXT | | Implementation timeline |
| contract_term_years | INTEGER | | Contract duration |
| developer_name | VARCHAR(200) | | Developer/partner name |
| admin_notes | TEXT | | Admin-only notes |
| published_at | TIMESTAMP | | Publication timestamp |
| interest_locked_at | TIMESTAMP | | Interest lock timestamp |
| project_priority | VARCHAR(20) | | Project priority (low/medium/high/urgent) |
| project_due_date | TIMESTAMP | | Project deadline |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- PRIMARY KEY on land_id
- INDEX on landowner_id
- INDEX on status
- INDEX on energy_key

**Statuses**:
- `draft` - Initial state
- `published` - Visible to investors
- `under_review` - Being reviewed
- `approved` - Approved for investment
- `rejected` - Rejected
- `archived` - Archived

---

### 5. land_sections
**Purpose**: Stores section data for lands (forms/questionnaires)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| land_section_id | UUID | PRIMARY KEY | Unique section identifier |
| land_id | UUID | FOREIGN KEY → lands(land_id) | Land reference |
| section_key | VARCHAR(50) | FOREIGN KEY → section_definitions | Section type |
| status | VARCHAR(50) | DEFAULT 'draft' | Section status |
| data | JSONB | | Section form data |
| assigned_role | VARCHAR(50) | | Assigned reviewer role |
| assigned_user | UUID | FOREIGN KEY → user(user_id) | Assigned reviewer |
| reviewer_comments | TEXT | | Reviewer feedback |
| submitted_at | TIMESTAMP | | Submission timestamp |
| approved_at | TIMESTAMP | | Approval timestamp |
| rejected_at | TIMESTAMP | | Rejection timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Constraints**:
- PRIMARY KEY on land_section_id
- UNIQUE (land_id, section_key)
- ON DELETE CASCADE for land_id

---

### 6. section_definitions
**Purpose**: Defines available section types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| section_key | VARCHAR(50) | PRIMARY KEY | Section identifier |
| label | VARCHAR(200) | NOT NULL | Display name |
| default_role_reviewer | VARCHAR(50) | | Default reviewer role |

---

### 7. documents
**Purpose**: Stores document metadata and binary data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| document_id | UUID | PRIMARY KEY | Unique document identifier |
| land_id | UUID | FOREIGN KEY → lands(land_id) | Associated land |
| land_section_id | UUID | FOREIGN KEY → land_sections | Associated section |
| uploaded_by | UUID | FOREIGN KEY → user(user_id) | Uploader reference |
| document_type | TEXT | | Document category |
| file_name | TEXT | NOT NULL | Original filename |
| file_path | TEXT | | **[DEPRECATED]** Legacy file path |
| file_data | BYTEA | | **[NEW]** Binary document data |
| file_size | INTEGER | | File size in bytes |
| mime_type | TEXT | | MIME type |
| is_draft | BOOLEAN | DEFAULT TRUE | Draft status |
| created_at | TIMESTAMP | DEFAULT NOW() | Upload timestamp |

**Indexes**:
- PRIMARY KEY on document_id
- INDEX on land_id
- INDEX on document_id (for faster retrieval)

**Storage Method**: 
- **Current**: Binary data stored in `file_data` BYTEA column
- **Legacy**: Files stored in filesystem with path in `file_path`
- See: `DOCUMENT_BLOB_STORAGE_MIGRATION.md`

**Supported MIME Types**:
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/tiff`
- `text/plain`

---

### 8. tasks
**Purpose**: Stores tasks assigned to reviewers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| task_id | UUID | PRIMARY KEY | Unique task identifier |
| land_id | UUID | FOREIGN KEY → lands(land_id) | Associated land |
| land_section_id | UUID | FOREIGN KEY → land_sections | Associated section |
| task_type | VARCHAR(100) | NOT NULL | Task type/category |
| description | TEXT | | Task description |
| status | VARCHAR(50) | DEFAULT 'pending' | Task status |
| priority | VARCHAR(20) | DEFAULT 'medium' | Task priority |
| assigned_to | UUID | FOREIGN KEY → user(user_id) | Assigned user |
| assigned_role | VARCHAR(50) | | Assigned role |
| created_by | UUID | FOREIGN KEY → user(user_id) | Task creator |
| completion_notes | TEXT | | Completion notes |
| due_date | DATE | | Task deadline |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- PRIMARY KEY on task_id
- INDEX on land_id
- INDEX on assigned_to
- INDEX on status

**Task Statuses**:
- `pending` - Not started
- `in_progress` - Being worked on
- `completed` - Finished
- `cancelled` - Cancelled
- `on_hold` - Temporarily paused

**Task Priorities**:
- `low` - Low priority
- `medium` - Normal priority
- `high` - High priority
- `urgent` - Urgent priority

---

### 9. subtasks
**Purpose**: Stores subtasks for tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| subtask_id | UUID | PRIMARY KEY | Unique subtask identifier |
| task_id | UUID | FOREIGN KEY → tasks(task_id) | Parent task |
| title | VARCHAR(255) | NOT NULL | Subtask title |
| description | TEXT | | Subtask description |
| status | VARCHAR(50) | DEFAULT 'pending' | Subtask status |
| assigned_to | UUID | FOREIGN KEY → user(user_id) | Assigned user |
| created_by | UUID | FOREIGN KEY → user(user_id) | Creator |
| order_index | INTEGER | DEFAULT 0 | Display order |
| completed_at | TIMESTAMP | | Completion timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Constraints**:
- PRIMARY KEY on subtask_id
- ON DELETE CASCADE for task_id

---

### 10. task_history
**Purpose**: Tracks task status changes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| history_id | UUID | PRIMARY KEY | Unique history identifier |
| task_id | UUID | FOREIGN KEY → tasks(task_id) | Task reference |
| from_status | VARCHAR(50) | | Previous status |
| to_status | VARCHAR(50) | | New status |
| note | TEXT | | Change notes |
| changed_by | UUID | FOREIGN KEY → user(user_id) | User who made change |
| start_ts | TIMESTAMP | DEFAULT NOW() | Change timestamp |
| end_ts | TIMESTAMP | | End of this status period |

**Constraints**:
- PRIMARY KEY on history_id
- ON DELETE CASCADE for task_id

---

### 11. investor_listings
**Purpose**: Investor profile information (for investor users)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| investor_id | UUID | PRIMARY KEY, FOREIGN KEY → user(user_id) | Investor user |
| company_name | VARCHAR(200) | | Company name |
| investment_focus | TEXT | | Investment focus areas |
| min_investment | DECIMAL(15,2) | | Minimum investment amount |
| max_investment | DECIMAL(15,2) | | Maximum investment amount |
| preferred_regions | TEXT | | Preferred geographic regions |
| contact_info | TEXT | | Contact information |
| is_verified | BOOLEAN | DEFAULT FALSE | Verification status |
| created_at | TIMESTAMP | DEFAULT NOW() | Profile creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

---

### 12. investor_interests
**Purpose**: Tracks investor interest in land listings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| interest_id | UUID | PRIMARY KEY | Unique interest identifier |
| investor_id | UUID | FOREIGN KEY → user(user_id) | Investor reference |
| land_id | UUID | FOREIGN KEY → lands(land_id) | Land reference |
| status | TEXT | NOT NULL | Interest status (interested, pending, contacted, approved, rejected) |
| comments | TEXT | NULL | Investor comments |
| created_at | TIMESTAMP WITH TIME ZONE | NULL | Interest timestamp |

**Constraints**:
- PRIMARY KEY on interest_id
- UNIQUE (investor_id, land_id)

**Note**: The actual database schema differs from earlier documentation. Columns like `investment_amount`, `interest_level`, `contact_preference`, and `updated_at` are not present in the current implementation.

---

### 13. lu_status
**Purpose**: Lookup table for various status values

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| status_key | VARCHAR(50) | PRIMARY KEY | Status identifier |
| scope | VARCHAR(50) | NOT NULL | Scope (land/section/task) |

---

### 14. lu_task_status
**Purpose**: Lookup table for task status values

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| status_key | VARCHAR(50) | PRIMARY KEY | Task status identifier |

---

### 15. lu_energy_types
**Purpose**: Lookup table for energy types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| energy_key | VARCHAR(50) | PRIMARY KEY | Energy type identifier |

**Standard Values**:
- `solar` - Solar energy
- `wind` - Wind energy
- `hydro` - Hydroelectric
- `biomass` - Biomass
- `geothermal` - Geothermal
- `hybrid` - Hybrid/mixed

---

## Entity Relationships

### User → Lands
- One-to-Many: A user (landowner) can own multiple lands
- Foreign Key: `lands.landowner_id` → `user.user_id`

### User → Roles
- Many-to-Many: Users can have multiple roles, roles belong to multiple users
- Junction Table: `user_roles`

### Lands → Documents
- One-to-Many: A land can have multiple documents
- Foreign Key: `documents.land_id` → `lands.land_id`
- ON DELETE CASCADE

### Lands → Sections
- One-to-Many: A land can have multiple sections
- Foreign Key: `land_sections.land_id` → `lands.land_id`
- ON DELETE CASCADE

### Lands → Tasks
- One-to-Many: A land can have multiple tasks
- Foreign Key: `tasks.land_id` → `lands.land_id`

### Tasks → Subtasks
- One-to-Many: A task can have multiple subtasks
- Foreign Key: `subtasks.task_id` → `tasks.task_id`
- ON DELETE CASCADE

### Tasks → History
- One-to-Many: A task has multiple history entries
- Foreign Key: `task_history.task_id` → `tasks.task_id`
- ON DELETE CASCADE

### Investors → Interests
- One-to-Many: An investor can show interest in multiple lands
- Foreign Key: `investor_interests.investor_id` → `user.user_id`

### Lands → Interests
- One-to-Many: A land can have multiple interested investors
- Foreign Key: `investor_interests.land_id` → `lands.land_id`

---

## Recent Schema Changes

### October 17, 2025 - Document Blob Storage Migration
**Migration File**: `migrations/add_document_blob_storage.sql`

**Changes**:
1. Added `documents.file_data` BYTEA column
2. Made `documents.file_path` nullable (marked as deprecated)
3. Added index on `documents.document_id`

**Impact**: Documents now stored in database instead of file system

**See**: `DOCUMENT_BLOB_STORAGE_MIGRATION.md` for full details

---

## Database Configuration

### PostgreSQL Version
Minimum: PostgreSQL 12+
Recommended: PostgreSQL 14+

### Extensions Required
- `uuid-ossp` (for UUID generation)
- `pgcrypto` (for cryptographic functions)

### Character Encoding
- Database: UTF8
- Collation: en_US.UTF-8

### Connection Pooling
- Recommended: Use connection pooling (pgBouncer or SQLAlchemy pool)
- Max connections: Configure based on workload

---

## Backup and Maintenance

### Backup Strategy
```bash
# Full backup (includes document blobs)
pg_dump -U postgres -d renewmart > backup.sql

# Schema only
pg_dump -U postgres -d renewmart --schema-only > schema.sql

# Data only (excluding large documents table)
pg_dump -U postgres -d renewmart --data-only --exclude-table=documents > data.sql
```

### Maintenance Tasks
```sql
-- Vacuum analyze (run weekly)
VACUUM ANALYZE;

-- Reindex (if needed)
REINDEX DATABASE renewmart;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance Optimization

### Recommended Indexes
All critical indexes are created via migrations. Additional indexes for specific queries can be added as needed.

### Query Optimization
- Use prepared statements (parameterized queries)
- Avoid SELECT * in production code
- Use LIMIT for large result sets
- Index foreign keys

### Monitoring
```sql
-- Slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;

-- Table statistics
SELECT * FROM pg_stat_user_tables;

-- Index usage
SELECT * FROM pg_stat_user_indexes;
```

---

## Migration History

| Date | Migration File | Description |
|------|----------------|-------------|
| 2024-XX-XX | `3be36e6b146e_initial_migration.py` | Initial schema creation |
| 2024-XX-XX | `add_project_priority_and_due_date.sql` | Added priority and due date to lands |
| 2025-10-17 | `add_document_blob_storage.sql` | Document blob storage migration |

---

## Related Documentation
- `DOCUMENT_BLOB_STORAGE_MIGRATION.md` - Document storage changes
- `PROJECT_PRIORITY_DUE_DATE_IMPLEMENTATION.md` - Project management features
- `ROLE_SYNC_FIX_SUMMARY.md` - Role management
- `SUBTASK_PERMISSIONS_FIX.md` - Subtask permissions

---

## Notes
- All timestamps use UTC timezone
- UUIDs are generated using `uuid_generate_v4()`
- Soft deletes are not implemented; use `is_active` flags where needed
- Foreign key constraints use ON DELETE CASCADE where appropriate

