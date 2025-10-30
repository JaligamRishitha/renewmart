# Migration Chain Overview

## Your Migration Files (In Order)

### 1. **3be36e6b146e_initial_migration.py** (Base Migration)
- **Revision ID**: `3be36e6b146e`
- **Down Revision**: `None` (This is the first migration)
- **What it creates**:
  - Lookup tables: `lu_roles`, `lu_status`, `lu_task_status`, `lu_energy_types`
  - `user` table
  - `user_roles` table
  - `section_definitions` table
  - `lands` table
  - `land_sections` table
  - `documents` table (basic version)
  - `tasks` table (basic version)
  - `task_history` table
  - `investor_interests` table

### 2. **add_doc_slot_field.py**
- **Revision ID**: `add_doc_slot_field`
- **Down Revision**: `3be36e6b146e`
- **What it adds**:
  - Adds `doc_slot` column to `documents` table

### 3. **add_missing_schema_fields.py** ⭐ **FINAL/LATEST MIGRATION**
- **Revision ID**: `add_missing_schema`
- **Down Revision**: `add_doc_slot_field`
- **What it adds**:

  **Documents Table**:
  - `document_type`, `task_id`, `subtask_id`
  - `status`, `approved_by`, `approved_at`, `rejection_reason`, `admin_comments`
  - `version_number`, `is_latest_version`, `parent_document_id`, `version_notes`
  - `version_status`, `review_locked_at`, `review_locked_by`, `version_change_reason`
  - `file_data` (BYTEA), `created_at`
  - Foreign keys for relationships

  **Tasks Table**:
  - `completion_notes`

  **New Tables**:
  - `subtasks` - For breaking down tasks
  - `document_assignments` - Document assignment tracking
  - `message_threads` - Message thread organization
  - `messages` - Real-time messaging system
  - `message_reactions` - Message reactions
  - `notifications` - User notifications

## Migration Chain Diagram

```
None (no database)
    ↓
[3be36e6b146e] Initial Migration (Base schema)
    ↓
[add_doc_slot_field] Add doc_slot to documents
    ↓
[add_missing_schema] ⭐ FINAL - Add all missing fields & tables
    ↓
HEAD (Current database state)
```

## Latest/Final Migration File

**File**: `backend/alembic/versions/add_missing_schema_fields.py`
**Revision ID**: `add_missing_schema`
**Status**: This is your **HEAD** migration (most recent)

## How to Verify

Check your current migration status:
```bash
cd backend
python -m alembic current
```

Expected output if migrations are applied:
```
add_missing_schema (head)
```

Check migration history:
```bash
python -m alembic history
```

Expected output:
```
add_missing_schema -> add_missing_schema (head)
add_doc_slot_field -> add_doc_slot_field
3be36e6b146e -> 3be36e6b146e
<base> -> 3be36e6b146e (initial migration)
```

## Apply Migrations

To apply all migrations up to the latest:
```bash
python -m alembic upgrade head
```

This will run all three migrations in order:
1. `3be36e6b146e` (if not already applied)
2. `add_doc_slot_field` (if not already applied)
3. `add_missing_schema` ⭐ (latest - adds all missing fields)

## Summary

✅ **3 migration files total**
✅ **Final migration**: `add_missing_schema_fields.py` (revision: `add_missing_schema`)
✅ **Migration chain is complete** and up-to-date with your current models





