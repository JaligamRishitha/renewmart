# Database Migrations

This folder contains SQL migration scripts for the RenewMart database.

## Available Migrations

### 1. add_project_priority_and_due_date.sql
**Purpose**: Adds project priority and due date columns to lands table
**Status**: Applied
**Date**: 2024-XX-XX

### 2. add_document_blob_storage.sql
**Purpose**: Migrates document storage from file system to database BYTEA
**Status**: **NEW - Ready to apply**
**Date**: 2025-10-17

### 3. add_project_document_role_mappings.sql
**Purpose**: Creates project_document_role_mappings table for project-specific document type to role mappings
**Status**: **NEW - Ready to apply**
**Date**: 2025-01-XX

## How to Apply Migrations

### Using psql Command Line

```bash
# Connect to your database and run the migration
psql -U your_username -d renewmart -f add_document_blob_storage.sql

# Or using environment variable for password
PGPASSWORD=your_password psql -U your_username -d renewmart -f add_document_blob_storage.sql
```

### Using Python Script

```python
from sqlalchemy import create_engine, text
import os

# Load database URL from environment or config
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/renewmart')
engine = create_engine(DATABASE_URL)

# Read and execute migration
with open('add_document_blob_storage.sql', 'r') as f:
    migration_sql = f.read()

with engine.connect() as conn:
    conn.execute(text(migration_sql))
    conn.commit()
    print("Migration applied successfully!")
```

### Using Docker Exec

If running in Docker:

```bash
# Option 1: Using Python migration script (recommended)
docker exec -it renewmart-backend python /app/apply_project_document_role_mappings_migration.py

# Option 2: Using psql directly
docker exec -it renewmart-postgres psql -U renewmart_user -d renewmart_db -f /docker-entrypoint-initdb.d/02-renew-sql.sql

# Option 3: Copy migration file and run via psql
docker cp add_project_document_role_mappings.sql renewmart-postgres:/tmp/
docker exec -it renewmart-postgres psql -U renewmart_user -d renewmart_db -f /tmp/add_project_document_role_mappings.sql
```

## Migration: add_document_blob_storage.sql

### What it does:
1. Adds `file_data BYTEA` column to `documents` table
2. Makes `file_path` column nullable (for backward compatibility)
3. Adds index on `document_id` for faster retrieval
4. Adds column comments for documentation

### Impact:
- **Breaking**: No breaking changes - existing documents with file_path will continue to work
- **Storage**: New uploads will store binary data in database
- **Performance**: May increase database size, but simplifies deployment
- **Rollback**: Safe - can be rolled back by dropping the column

### Rollback:

```sql
-- If you need to rollback:
ALTER TABLE documents DROP COLUMN IF EXISTS file_data;
ALTER TABLE documents ALTER COLUMN file_path SET NOT NULL;
DROP INDEX IF EXISTS idx_documents_document_id;
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('file_data', 'file_path');

-- Should show:
--  column_name | data_type | is_nullable
-- -------------+-----------+-------------
--  file_path   | text      | YES
--  file_data   | bytea     | YES

-- Check if index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'documents' 
AND indexname = 'idx_documents_document_id';
```

## Testing After Migration

1. **Test Upload**: Upload a new document
   ```bash
   python backend/test_document_upload.py
   ```

2. **Check Storage**: Verify document is stored in database
   ```sql
   SELECT document_id, file_name, 
          LENGTH(file_data) as data_length,
          file_path IS NULL as using_blob_storage
   FROM documents 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Test Download**: Download a document via API
   ```bash
   curl -X GET "http://localhost:8000/documents/download/{document_id}" \
        -H "Authorization: Bearer {token}" \
        --output test_download.pdf
   ```

## Migration History

| Date | File | Description | Status |
|------|------|-------------|--------|
| 2024-XX-XX | `add_project_priority_and_due_date.sql` | Project management fields | ✅ Applied |
| 2025-10-17 | `add_document_blob_storage.sql` | Document blob storage | 🆕 Ready |
| 2025-01-XX | `add_project_document_role_mappings.sql` | Project document role mappings table | 🆕 Ready |

## Best Practices

1. **Backup First**: Always backup database before migrations
   ```bash
   pg_dump -U postgres -d renewmart > backup_before_migration.sql
   ```

2. **Test in Development**: Apply migrations in dev/staging first

3. **Check Dependencies**: Ensure application code is updated before migrating

4. **Monitor Performance**: Watch database size and query performance after migration

5. **Document Changes**: Update `schema_map.md` after applying migrations

## Related Documentation

- [DOCUMENT_BLOB_STORAGE_MIGRATION.md](../../documentation/DOCUMENT_BLOB_STORAGE_MIGRATION.md) - Full migration guide
- [schema_map.md](../../documentation/schema_map.md) - Database schema reference

## Support

For migration issues:
1. Check application logs: `backend/logs/renewmart.log`
2. Check database logs: `docker logs renewmart_db`
3. Refer to migration documentation in `documentation/` folder

