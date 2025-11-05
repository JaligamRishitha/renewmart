# Document Role Mappings Flow

## Overview
When you update "Configure Document Role Mappings", the changes are saved to the database and immediately affect document filtering across all portals.

## How It Works

### 1. Saving Mappings (Admin Portal)
- Admin opens "Configure Document Role Mappings" modal
- Selects which document types each role can view
- Clicks "Save Changes"
- **Backend**: Mappings are saved to `project_document_role_mappings` table and committed to database
- **Frontend**: Success message is logged

### 2. Backend Filtering (Immediate Effect)
The backend filtering in `documents.py` queries the database **directly** on every request:

```python
# In documents.py - get_land_documents endpoint
project_mapping_query = text("""
    SELECT DISTINCT document_type
    FROM project_document_role_mappings
    WHERE land_id = :land_id AND role_key = :role_key
""")
```

**Key Points:**
- ✅ No caching - queries database directly
- ✅ Changes apply **immediately** after save
- ✅ Works for all document queries (admin, reviewer, all portals)
- ✅ Falls back to default mappings if no project-specific mappings exist

### 3. Frontend Filtering (May Need Refresh)
Frontend components also filter documents client-side:
- Components fetch project mappings when they load
- They cache mappings in component state
- When mappings are updated, components may need to refresh to see changes

**Frontend Components Updated:**
- `reviewer-dashboard/index.jsx` - Fetches project mappings
- `reviewer-dashboard/ProjectDetails.jsx` - Fetches project mappings
- `admin/AdminDocumentVersions.jsx` - Fetches project mappings
- `reviewer-projects/index.jsx` - Fetches project mappings
- `document-review/index.jsx` - Already had project mappings

### 4. Data Flow

```
Admin Updates Mappings
    ↓
Frontend: ConfigDocRoleModal.saveProjectDocumentRoleMappings()
    ↓
Backend: POST /lands/{land_id}/document-role-mappings
    ↓
Database: project_document_role_mappings table updated
    ↓
Backend Filtering: Queries database on every document request
    ↓
Reviewers: See filtered documents immediately (backend filtering)
    ↓
Frontend: May show cached mappings until refresh
```

## Testing

1. **Test Backend Filtering (Immediate)**:
   - Update mappings as admin
   - Have a reviewer query documents via API
   - ✅ Should see filtered documents immediately

2. **Test Frontend Filtering (May Need Refresh)**:
   - Update mappings as admin
   - Reviewer navigates to project page
   - If they see old documents, refresh the page
   - ✅ Should see updated document list

## Important Notes

- **Backend filtering is always active** - It queries the database directly, so changes apply immediately
- **Frontend filtering may be cached** - Components cache mappings, so a refresh may be needed
- **Both filtering layers work together** - Backend filters at API level, frontend filters at UI level
- **Default mappings are used as fallback** - If no project-specific mappings exist, default mappings are used

## Troubleshooting

If mappings don't seem to be working:

1. **Check database**: Verify mappings are saved in `project_document_role_mappings` table
2. **Check backend logs**: Look for "📋 Using project-specific mappings" messages
3. **Refresh frontend**: Components may have cached mappings
4. **Check reviewer role**: Ensure reviewer has the correct role assigned in their task
5. **Check permissions**: Ensure reviewer has a task assigned to the land

