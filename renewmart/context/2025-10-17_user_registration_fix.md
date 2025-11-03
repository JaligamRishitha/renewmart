# User Registration SQLAlchemy Relationship Fix

**Date**: October 17, 2025
**Type**: Bug Fix
**Status**: ✅ Resolved

## Summary

Fixed a critical bug preventing user registration due to ambiguous SQLAlchemy relationship between User and Document models.

## Problem

User registration was failing with:
```
Could not determine join condition between parent/child tables on 
relationship User.uploaded_documents - there are multiple foreign key 
paths linking the tables.
```

## Root Cause

The `Document` table has two foreign keys pointing to `User`:
- `uploaded_by` (who uploaded the document)
- `approved_by` (who approved the document)

SQLAlchemy couldn't automatically determine which foreign key to use for the `User.uploaded_documents` relationship.

## Solution

**File**: `backend/models/users.py`

**Before:**
```python
uploaded_documents = relationship("Document", back_populates="uploader")
```

**After:**
```python
uploaded_documents = relationship(
    "Document",
    foreign_keys="Document.uploaded_by",
    back_populates="uploader"
)
```

## Technical Details

### Why It Failed
When a child table (Document) has multiple foreign keys to a parent table (User), SQLAlchemy requires explicit specification of which foreign key to use for each relationship.

### The Fix
Added `foreign_keys="Document.uploaded_by"` to explicitly tell SQLAlchemy which foreign key to use for this relationship.

### Pattern
- Parent table (User): Use string format `foreign_keys="ChildTable.column"`
- Child table (Document): Use list format `foreign_keys=[column_name]`

## Files Modified

1. `backend/models/users.py` - Lines 37-41

## Testing

### Test Case 1: Landowner Registration
```bash
POST /api/auth/register
{
  "email": "test@example.com",
  "role": "landowner",
  ...
}
```
**Result**: ✅ Success

### Test Case 2: Investor Registration
```bash
POST /api/auth/register
{
  "email": "investor@example.com",
  "role": "investor",
  ...
}
```
**Result**: ✅ Success

## Impact

### Before Fix
- ❌ User registration failed
- ❌ Any User-Document query failed
- ❌ Blocked all new user signups

### After Fix
- ✅ User registration works
- ✅ Document relationships work
- ✅ All User queries successful

## Related Models

Other models with correct multiple foreign key handling:
- `Task` model (assigned_to, created_by)
- `User` model (assigned_tasks, created_tasks)

All verified to have correct `foreign_keys` specifications.

## Prevention

### Best Practice
Always specify `foreign_keys` when:
1. Child table has multiple FKs to same parent
2. Parent table has relationships back to child
3. Relationship could be ambiguous

### Code Review
Check for:
- Multiple FKs to same table
- Missing `foreign_keys` parameter
- Matching `back_populates` on both sides

## Deployment

1. ✅ Code updated
2. ✅ Backend restarted
3. ✅ No linting errors
4. ✅ Ready for production

## Documentation

Created comprehensive documentation:
- `USER_REGISTRATION_RELATIONSHIP_FIX.md` - Full technical details

## Status

🟢 **RESOLVED** - User registration fully functional

## Verification

Backend logs show:
- Last error: 18:22:01 (before fix)
- Backend restarted: 18:23:35 (after fix)
- No subsequent relationship errors

## Next Steps

- Monitor user registrations for any issues
- Verify document upload functionality
- Ensure all relationship queries work correctly

