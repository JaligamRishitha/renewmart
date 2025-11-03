# Review Status Persistence Setup

## Overview
This document explains how to set up the database table for persisting review approvals by role, so that review statuses persist across page refreshes.

## Problem
Previously, role-based review statuses were only stored in React state, which meant:
- ❌ Data was lost on page refresh
- ❌ Reviewers couldn't see approval history
- ❌ Status tracking wasn't reliable

## Solution
We've created a new `land_reviews` table to persist review approvals in the database:
- ✅ Review statuses persist across page refreshes
- ✅ Full approval history is maintained
- ✅ Automatic sync between frontend and backend

## Database Migration Required

### Step 1: Run the Migration SQL

You need to run the migration file to create the `land_reviews` table:

```bash
# Navigate to your database
psql -U postgres -d renew
```

Then run the migration:

```sql
\i 'C:/Users/jalig/Downloads/RENEW/renewmart/backend/migrations/add_land_reviews.sql'
```

**OR** run it directly from PowerShell:

```powershell
# From the project root directory
Get-Content .\renewmart\backend\migrations\add_land_reviews.sql | psql -U postgres -d renew
```

### Step 2: Verify the Table Was Created

```sql
-- Check if the table exists
\dt land_reviews

-- View the table structure
\d land_reviews

-- Check sample data (should be empty initially)
SELECT * FROM land_reviews;
```

### Expected Output
You should see:
```
✅ Land reviews migration completed successfully!
   ✓ Created land_reviews table
   ✓ Created indexes for performance
   ✓ Created updated_at trigger
   ℹ Review approvals will now persist across page refreshes
```

## Table Structure

The `land_reviews` table stores:

| Column | Type | Description |
|--------|------|-------------|
| `review_id` | UUID | Primary key |
| `land_id` | UUID | Reference to the land/project |
| `reviewer_role` | VARCHAR(50) | Role: `re_sales_advisor`, `re_analyst`, `re_governance_lead` |
| `reviewer_id` | UUID | User who created the review |
| `reviewer_name` | VARCHAR(255) | Name of the reviewer |
| `status` | VARCHAR(50) | Status: `pending`, `approved`, `rejected` |
| `rating` | INTEGER | Rating (1-5 stars) |
| `comments` | TEXT | Review comments |
| `justification` | TEXT | Justification for approval/rejection |
| `subtasks_completed` | INTEGER | Number of completed subtasks |
| `total_subtasks` | INTEGER | Total number of subtasks |
| `documents_approved` | INTEGER | Number of approved documents |
| `total_documents` | INTEGER | Total number of documents |
| `review_data` | JSONB | Additional review data as JSON |
| `approved_at` | TIMESTAMPTZ | When the review was approved |
| `published` | BOOLEAN | Whether the review has been published |
| `published_at` | TIMESTAMPTZ | When the review was published |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Record update timestamp |

### Unique Constraint
- One review per role per land: `UNIQUE(land_id, reviewer_role)`

## API Endpoints Created

### 1. Save Review Status
```
POST /api/reviews/land/{land_id}/role/{reviewer_role}
```
Saves or updates the review status for a specific role.

**Request Body:**
```json
{
  "status": "approved",
  "reviewerName": "John Doe",
  "rating": 5,
  "comments": "All documents look good",
  "subtasksCompleted": 5,
  "totalSubtasks": 5,
  "documentsApproved": 10,
  "totalDocuments": 10,
  "published": false
}
```

### 2. Get Review Status
```
GET /api/reviews/land/{land_id}/role/{reviewer_role}
```
Retrieves the review status for a specific role.

### 3. Get All Review Statuses
```
GET /api/reviews/land/{land_id}/all
```
Retrieves review statuses for all three roles (RE Sales Advisor, RE Analyst, RE Governance Lead).

**Response:**
```json
{
  "re_sales_advisor": {
    "status": "approved",
    "published": false,
    "subtasksCompleted": 5,
    "totalSubtasks": 5,
    "documentsApproved": 10,
    "totalDocuments": 10,
    "rating": 5,
    "reviewerName": "John Doe",
    "approvedAt": "2025-10-17T10:30:00Z"
  },
  "re_analyst": {
    "status": "pending",
    "published": false,
    "subtasksCompleted": 0,
    "totalSubtasks": 5,
    "documentsApproved": 0,
    "totalDocuments": 8
  },
  "re_governance_lead": {
    "status": "pending",
    "published": false,
    "subtasksCompleted": 0,
    "totalSubtasks": 3,
    "documentsApproved": 0,
    "totalDocuments": 6
  }
}
```

### 4. Delete Review Status (Admin Only)
```
DELETE /api/reviews/land/{land_id}/role/{reviewer_role}
```
Deletes a review status (admin only).

## Frontend Integration

The frontend has been updated to:

1. **Auto-save** review statuses to the database when changes are made
2. **Auto-load** review statuses from the database on page load
3. **Persist** the "Role Status Tracking" data across page refreshes

### Updated Files:
- ✅ `frontend/src/services/api.js` - Added `reviewsAPI` methods
- ✅ `frontend/src/pages/document-review/index.jsx` - Integrated database persistence

## Testing the Setup

### Test 1: Basic Save and Load
1. Navigate to Document Review page
2. Approve documents for a role
3. Click "Approve" in the Review Panel
4. Click "Publish" for that role
5. **Refresh the page** (F5)
6. ✅ The status should still show as "APPROVED" and "PUBLISHED"

### Test 2: Multiple Roles
1. Complete review for RE Sales Advisor → Publish
2. Complete review for RE Analyst → Publish
3. Complete review for RE Governance Lead → Publish
4. **Refresh the page**
5. ✅ All three roles should show their published status

### Test 3: Cross-Session
1. Complete a review
2. Close the browser completely
3. Open browser again and navigate to Document Review
4. ✅ Review status should still be there

## Troubleshooting

### Issue: "relation 'land_reviews' does not exist"
**Solution:** Run the migration SQL file:
```bash
psql -U postgres -d renew -f renewmart/backend/migrations/add_land_reviews.sql
```

### Issue: Review statuses still not persisting
**Checks:**
1. Verify the table exists: `\dt land_reviews`
2. Check backend logs for API errors
3. Check browser console for frontend errors
4. Verify the reviews router is registered in `main.py`

### Issue: Duplicate key error
This means you're trying to create multiple reviews for the same role on the same land.
**Solution:** The system will automatically update existing records. If you still see errors:
```sql
-- Clear existing data (if needed)
DELETE FROM land_reviews WHERE land_id = 'your-land-id';
```

## Maintenance

### View All Reviews
```sql
SELECT 
    lr.land_id,
    l.title as project_name,
    lr.reviewer_role,
    lr.reviewer_name,
    lr.status,
    lr.published,
    lr.approved_at,
    lr.published_at
FROM land_reviews lr
JOIN lands l ON lr.land_id = l.land_id
ORDER BY lr.created_at DESC;
```

### Check Review Completion Status
```sql
SELECT 
    l.land_id,
    l.title,
    COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_reviews,
    COUNT(CASE WHEN lr.published = true THEN 1 END) as published_reviews,
    COUNT(*) as total_reviews
FROM lands l
LEFT JOIN land_reviews lr ON l.land_id = lr.land_id
WHERE l.status = 'under_review'
GROUP BY l.land_id, l.title;
```

### Reset Reviews for a Land (Admin)
```sql
-- Reset all reviews for a specific land
DELETE FROM land_reviews WHERE land_id = 'your-land-id-here';

-- Or reset just one role
DELETE FROM land_reviews 
WHERE land_id = 'your-land-id-here' 
AND reviewer_role = 're_sales_advisor';
```

## Benefits

✅ **Persistence**: Review data survives page refreshes and browser closes
✅ **History**: Full audit trail of who approved what and when
✅ **Reliability**: No more lost review progress
✅ **Scalability**: Database-backed solution ready for production
✅ **Performance**: Indexed for fast lookups
✅ **Integrity**: Unique constraint prevents duplicate reviews

## Next Steps

1. ✅ Run the migration
2. ✅ Verify the table was created
3. ✅ Test the complete review workflow
4. ✅ Monitor logs for any errors
5. ✅ Consider adding additional indexes if needed for your use case

## Support

If you encounter any issues:
1. Check the backend logs: `renewmart/backend/logs/`
2. Check the browser console for frontend errors
3. Verify database connection: `psql -U postgres -d renew -c "SELECT 1;"`
4. Test the API directly: `curl http://localhost:8000/api/reviews/land/{land_id}/all`

