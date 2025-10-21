# Admin Investor Interests Fix

**Date**: October 17, 2025  
**Status**: ✅ Completed

## Issue

The admin portal's investor interests endpoint was returning a 500 Internal Server Error due to SQL column mismatches between the query and the actual database schema.

**Error Message**:
```
column ii.investment_amount does not exist
LINE 6:             ii.investment_amount,
```

## Root Cause

The `investor_interests` table in the database had a different schema than what was documented and expected. The endpoint query was trying to access columns that didn't exist in the actual table.

### Expected Columns (from query)
- `investment_amount`
- `message`
- `updated_at`
- `interest_level`

### Actual Columns (in database)
- `interest_id`
- `investor_id`
- `land_id`
- `status`
- `comments`
- `created_at`

## Solution

### Backend Changes

**File**: `renewmart/backend/routers/lands.py`

1. **Updated SQL Query** (Line 185-210)
   - Removed non-existent columns: `investment_amount`, `message`, `updated_at`
   - Updated to use actual columns: `comments`, `status`
   
   ```sql
   SELECT 
       ii.interest_id,
       ii.land_id,
       ii.investor_id,
       ii.status,
       ii.comments,
       ii.created_at,
       l.title as project_title,
       l.location_text as project_location,
       -- ... other fields
   FROM investor_interests ii
   INNER JOIN lands l ON ii.land_id = l.land_id
   INNER JOIN "user" investor ON ii.investor_id = investor.user_id
   LEFT JOIN "user" landowner ON l.landowner_id = landowner.user_id
   WHERE l.status != 'draft'
   ORDER BY ii.created_at DESC
   ```

2. **Updated Response Mapping** (Line 216-236)
   - Removed `investmentAmount`, `message`, `updatedAt` fields
   - Added `comments` field to match database schema
   
   ```python
   interest = {
       "interestId": str(row.interest_id),
       "landId": str(row.land_id),
       "investorId": str(row.investor_id),
       "status": row.status,
       "comments": row.comments,
       "createdAt": row.created_at.isoformat() if row.created_at else None,
       "projectTitle": row.project_title,
       # ... other fields
   }
   ```

### Frontend Changes

**File**: `renewmart/frontend/src/pages/admin-investor-interests/index.jsx`

1. **Updated Statistics Section** (Line 173-213)
   - Removed "Total Investment" card (relied on non-existent `investmentAmount`)
   - Changed grid from 4 columns to 3 columns
   - Updated "Pending" card to include both 'pending' and 'interested' statuses

2. **Updated Table Headers** (Line 251-269)
   - Removed "Investment Amount" column

3. **Updated Table Body** (Line 282-327)
   - Removed investment amount cell
   - Changed `interest.message` to `interest.comments`
   - Updated button title from "View Message" to "View Comments"
   - Changed default status from 'pending' to 'interested'

4. **Updated Status Filter** (Line 152-169)
   - Added 'interested' as the first status option
   - Reordered status options for better UX

5. **Updated Status Colors** (Line 59-68)
   - Added purple color for 'interested' status
   ```javascript
   'interested': 'bg-purple-100 text-purple-800 border-purple-200',
   ```

## Verification

### Testing the Endpoint

1. **Check Table Structure**:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'investor_interests'
   ORDER BY ordinal_position;
   ```

2. **Test API Endpoint**:
   ```
   GET http://127.0.0.1:8000/api/lands/admin/investor-interests
   Authorization: Bearer <admin_token>
   ```

### Expected Response Format

```json
[
  {
    "interestId": "uuid",
    "landId": "uuid",
    "investorId": "uuid",
    "status": "interested",
    "comments": "Investor comments...",
    "createdAt": "2025-10-17T12:00:00",
    "projectTitle": "Solar Farm Project",
    "projectLocation": "California",
    "projectType": "solar",
    "projectCapacity": 50.0,
    "projectPrice": 45.5,
    "projectStatus": "published",
    "investorName": "John Doe",
    "investorEmail": "john@example.com",
    "investorPhone": "+1234567890",
    "landownerName": "Jane Smith"
  }
]
```

## UI Features

The admin investor interests page now includes:

1. **Statistics Cards**:
   - Total Interests
   - Pending/Interested count
   - Unique Investors count

2. **Filters**:
   - Search by investor name, email, or project title
   - Status filter (Interested, Pending, Contacted, Approved, Rejected)

3. **Table Columns**:
   - Investor (name, email, phone)
   - Project (title, type, location, capacity, price)
   - Status (with color-coded badges)
   - Date (created timestamp)
   - Actions (View Project, View Comments)

## Status Lifecycle

The investor interest status values:
- **interested** (default) - Initial interest expressed
- **pending** - Under review by admin
- **contacted** - Admin has reached out
- **approved** - Interest approved for next steps
- **rejected** - Interest declined

## Notes

- The database table currently has NO records, so the endpoint will return an empty array `[]` until investors express interest in published projects
- The frontend handles empty states gracefully with appropriate messaging
- Comments button only appears if comments exist for the interest record

## Files Modified

### Backend
- `renewmart/backend/routers/lands.py` - Fixed SQL query and response mapping

### Frontend
- `renewmart/frontend/src/pages/admin-investor-interests/index.jsx` - Updated UI to match actual data structure

### Documentation
- `renewmart/documentation/ADMIN_INVESTOR_INTERESTS_FIX.md` - This file

## Related Features

- Admin Dashboard displays investor interest count
- Clicking "Investor Interest" card on dashboard navigates to this page
- Each task row in dashboard shows investor interest count badge (orange)
- View Project button navigates to document review page for that land

