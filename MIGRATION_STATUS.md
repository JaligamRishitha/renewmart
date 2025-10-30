# Migration Status Report

## Current Migration Files

Your Alembic migrations are **NOT up to date**. You have:

1. **3be36e6b146e_initial_migration.py** - Creates basic tables (user, lands, documents, tasks, etc.)
2. **add_doc_slot_field.py** - Adds `doc_slot` column to documents table
3. **add_missing_schema_fields.py** ✨ (NEW) - Adds all missing fields and tables

## Missing Fields and Tables (Now Fixed)

### Documents Table - Missing Fields (Now Added):
- ✅ `document_type`
- ✅ `task_id`, `subtask_id`
- ✅ `status`, `approved_by`, `approved_at`, `rejection_reason`, `admin_comments`
- ✅ `version_number`, `is_latest_version`, `parent_document_id`, `version_notes`
- ✅ `version_status`, `review_locked_at`, `review_locked_by`, `version_change_reason`
- ✅ `file_data` (BYTEA for blob storage)
- ✅ `created_at`

### Tasks Table - Missing Fields (Now Added):
- ✅ `completion_notes`

### Missing Tables (Now Added):
- ✅ `subtasks` - For breaking down tasks
- ✅ `document_assignments` - Tracks document assignments to reviewers
- ✅ `message_threads` - For organizing conversations
- ✅ `messages` - Real-time messaging system
- ✅ `message_reactions` - Message reactions/likes
- ✅ `notifications` - User notifications

## How to Apply the Migration

### 1. Check Current Migration Status
```bash
cd backend
python -m alembic current
```

### 2. Check Migration History
```bash
python -m alembic history
```

### 3. Apply Migration
```bash
# Apply all pending migrations
python -m alembic upgrade head

# Or apply step by step
python -m alembic upgrade +1
```

### 4. In Docker Container
```bash
# If running in Docker
docker-compose exec backend python -m alembic upgrade head
```

### 5. Check What Will Be Applied
```bash
# See what migrations will run (without applying)
python -m alembic upgrade head --sql
```

## Migration Order

The migrations will run in this order:
1. `3be36e6b146e` (initial_migration) - Base schema
2. `add_doc_slot_field` - Adds doc_slot to documents
3. `add_missing_schema` ✨ - Adds all missing fields and tables

## Verification

After applying migrations, verify with:
```bash
# Connect to database and check tables
docker-compose exec postgres psql -U renewmart_user -d renewmart_db -c "\dt"

# Check documents table structure
docker-compose exec postgres psql -U renewmart_user -d renewmart_db -c "\d documents"

# Check if new tables exist
docker-compose exec postgres psql -U renewmart_user -d renewmart_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations
   ```bash
   docker-compose exec postgres pg_dump -U renewmart_user renewmart_db > backup_before_migration.sql
   ```

2. **Test Environment**: Test migrations in a development environment first

3. **Data Safety**: The new migration adds columns with defaults, so existing data should be preserved

4. **Rollback**: If something goes wrong, you can rollback:
   ```bash
   python -m alembic downgrade -1
   ```

## Next Steps

1. Review the new migration file: `backend/alembic/versions/add_missing_schema_fields.py`
2. Test in development environment
3. Backup production database
4. Apply migration: `python -m alembic upgrade head`
5. Verify all tables and fields exist

