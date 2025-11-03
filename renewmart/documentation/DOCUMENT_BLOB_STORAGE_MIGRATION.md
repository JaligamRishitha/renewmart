# Document Blob Storage Migration

## Overview
This document describes the migration from file system-based document storage to database blob storage using PostgreSQL BYTEA columns.

## Migration Date
October 17, 2025

## Changes Made

### 1. Database Schema Changes
- **Added Column**: `file_data BYTEA` - stores document binary data directly in the database
- **Modified Column**: `file_path TEXT` - changed from NOT NULL to nullable (kept for backward compatibility)
- **Index Added**: `idx_documents_document_id` - improves document retrieval performance

### 2. Benefits of Blob Storage

#### Production Advantages
- **Simplified Deployment**: No need to manage separate file storage volumes
- **Atomic Transactions**: Document data and metadata are stored together, ensuring consistency
- **Backup Simplicity**: Database backups automatically include all documents
- **No File System Issues**: Eliminates file permission, path, and disk space management problems
- **Better Security**: Documents are protected by database access controls
- **Containerization**: Easier Docker deployment without volume mounting for documents

#### Performance Considerations
- Documents up to 10MB are stored efficiently in PostgreSQL
- BYTEA columns are optimized for binary data
- Retrieval is fast with proper indexing
- Database handles concurrent access and locking automatically

### 3. Backend Changes

#### Model Updates (`backend/models/documents.py`)
```python
from sqlalchemy.dialects.postgresql import BYTEA

class Document(Base):
    file_path = Column(Text, nullable=True)  # Legacy field
    file_data = Column(BYTEA, nullable=True)  # New binary storage
```

#### Router Updates (`backend/routers/documents.py`)

**Upload Endpoint**:
- Removed file system write operations
- Reads file content into memory as bytes
- Stores bytes directly in `file_data` column
- No more `UPLOAD_DIR` or physical file management

**Download Endpoint**:
- Retrieves binary data from `file_data` column
- Returns as `Response` object with appropriate headers
- Sets correct MIME type and filename for browser download

**Delete Endpoint**:
- Simplified - only deletes database record
- No file system cleanup needed
- Binary data is automatically deleted with the record

### 4. Schema Updates (`backend/models/schemas.py`)
- `file_path` marked as Optional and deprecated
- File name validation updated to allow spaces
- MIME type validation includes TIFF format

## Migration Steps

### For New Installations
1. Run the migration SQL:
   ```bash
   psql -U your_user -d your_database -f backend/migrations/add_document_blob_storage.sql
   ```

2. Restart the application - new uploads will automatically use blob storage

### For Existing Installations with Documents

#### Option 1: Fresh Start (Recommended for Testing/Development)
If you don't need existing documents:
1. Run the migration SQL
2. Old documents in file system can be deleted
3. New uploads will use blob storage

#### Option 2: Migrate Existing Documents (Production)
Create a migration script to move existing documents:

```python
# migrate_documents_to_blob.py
from sqlalchemy import create_engine, text
import os

engine = create_engine('postgresql://user:pass@localhost/db')

with engine.connect() as conn:
    # Get all documents with file_path
    docs = conn.execute(text("""
        SELECT document_id, file_path 
        FROM documents 
        WHERE file_path IS NOT NULL AND file_data IS NULL
    """)).fetchall()
    
    for doc_id, file_path in docs:
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            # Update database with binary data
            conn.execute(text("""
                UPDATE documents 
                SET file_data = :file_data 
                WHERE document_id = :document_id
            """), {"file_data": file_data, "document_id": doc_id})
            
            print(f"Migrated: {file_path}")
    
    conn.commit()
```

## File Size Limits

### Current Limit
- Maximum file size: **10MB** per document
- Configured in `MAX_FILE_SIZE` constant

### PostgreSQL Limits
- BYTEA columns can store up to **1GB** per value
- For larger files, consider chunking or external storage

### Adjusting Limits
To increase file size limit:
```python
# In backend/routers/documents.py
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
```

## API Behavior

### Upload Endpoint: `POST /documents/upload/{land_id}`
- **Request**: Multipart form with file and document_type
- **Response**: Document metadata (without binary data)
- **Storage**: Binary data saved to `file_data` column

### Download Endpoint: `GET /documents/download/{document_id}`
- **Response**: Binary file with appropriate headers
- **Headers**: `Content-Disposition: attachment; filename="..."`
- **MIME Type**: Set based on document's mime_type field

### List Endpoints
- Return document metadata only (no binary data)
- `file_path` will be null for new documents
- Frontend should use `/download/{id}` to retrieve actual files

## Frontend Compatibility

### No Changes Required
The frontend document handling remains the same:
- Upload using FormData multipart
- Download using document_id
- Display metadata from list endpoints

### Example Upload (unchanged)
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('document_type', 'Land Valuation');

await api.post(`/documents/upload/${landId}`, formData);
```

### Example Download (unchanged)
```javascript
const response = await api.get(`/documents/download/${documentId}`, {
  responseType: 'blob'
});
const url = window.URL.createObjectURL(response.data);
// Use url for download or display
```

## Docker Deployment

### Before (with file storage)
```yaml
volumes:
  - ./uploads:/app/uploads  # Need volume for persistence
```

### After (with blob storage)
```yaml
# No volume needed for documents!
# Only database volume required
volumes:
  - postgres_data:/var/lib/postgresql/data
```

## Backup Strategy

### Database Backup (includes documents)
```bash
# Full backup with documents
pg_dump -U user -d renewmart > backup_with_docs.sql

# Restore
psql -U user -d renewmart < backup_with_docs.sql
```

### Selective Backup (exclude large documents)
```bash
# Backup schema and small tables
pg_dump -U user -d renewmart -T documents > backup_without_docs.sql
```

## Performance Monitoring

### Queries to Monitor
```sql
-- Check total document storage size
SELECT pg_size_pretty(pg_total_relation_size('documents'));

-- Check average document size
SELECT 
  COUNT(*) as total_docs,
  pg_size_pretty(AVG(LENGTH(file_data))::bigint) as avg_size,
  pg_size_pretty(SUM(LENGTH(file_data))::bigint) as total_size
FROM documents 
WHERE file_data IS NOT NULL;

-- Find largest documents
SELECT 
  document_id, 
  file_name, 
  pg_size_pretty(LENGTH(file_data)::bigint) as size
FROM documents 
WHERE file_data IS NOT NULL
ORDER BY LENGTH(file_data) DESC 
LIMIT 10;
```

## Rollback Plan

If you need to rollback to file system storage:

1. Keep the `file_path` column (don't drop it)
2. Modify upload endpoint to write files again
3. Optionally export blob data back to files:

```python
for doc in documents:
    if doc.file_data and not doc.file_path:
        file_path = f"uploads/documents/{doc.document_id}.{ext}"
        with open(file_path, 'wb') as f:
            f.write(doc.file_data)
        # Update file_path in database
```

## Security Considerations

### Access Control
- Documents protected by existing authentication/authorization
- Only authorized users can download documents
- Database credentials must be secured

### SQL Injection Prevention
- Using parameterized queries (SQLAlchemy text with parameters)
- Binary data properly escaped by database driver

### File Type Validation
- File extensions validated before storage
- MIME types checked and stored
- Maximum file size enforced

## Testing

### Test Upload
```bash
curl -X POST "http://localhost:8000/documents/upload/{land_id}" \
  -H "Authorization: Bearer {token}" \
  -F "file=@test.pdf" \
  -F "document_type=Test Document"
```

### Test Download
```bash
curl -X GET "http://localhost:8000/documents/download/{document_id}" \
  -H "Authorization: Bearer {token}" \
  --output downloaded_file.pdf
```

### Verify in Database
```sql
SELECT 
  document_id, 
  file_name, 
  file_size,
  LENGTH(file_data) as data_length,
  file_path IS NULL as using_blob_storage
FROM documents 
LIMIT 5;
```

## Troubleshooting

### Issue: "Document file data not found in database"
- **Cause**: Document record exists but file_data is NULL
- **Solution**: Re-upload the document or run migration script

### Issue: Large database size
- **Cause**: Many large documents stored
- **Solution**: 
  - Reduce MAX_FILE_SIZE
  - Implement document cleanup policy
  - Archive old documents

### Issue: Slow upload/download
- **Cause**: Large files or many concurrent uploads
- **Solution**:
  - Check database performance
  - Add connection pooling
  - Consider CDN for frequently accessed documents

## Future Enhancements

### Potential Improvements
1. **Compression**: Compress documents before storing (e.g., gzip)
2. **Chunking**: Split large documents into chunks for better performance
3. **Caching**: Cache frequently accessed documents in Redis
4. **Versioning**: Keep multiple versions of documents
5. **Thumbnails**: Generate and store thumbnails for images/PDFs

## Related Files
- `backend/migrations/add_document_blob_storage.sql` - Database migration
- `backend/models/documents.py` - Document model
- `backend/routers/documents.py` - Document API endpoints
- `backend/models/schemas.py` - Document schemas

## Support
For issues or questions, refer to the main documentation or contact the development team.

