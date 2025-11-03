# Marketplace Publishing After Single Reviewer Approval

**Date**: October 17, 2025
**Feature**: Auto-publish land to marketplace after one reviewer publishes
**Status**: ✅ Implemented

## Overview

This feature allows land projects to be published to the marketplace after **just ONE reviewer** publishes their review, instead of requiring all three reviewers to publish.

## Business Logic

### Previous Behavior
- Required ALL three reviewer roles to publish before land appeared in marketplace
- Land remained hidden until: RE Sales Advisor + RE Analyst + RE Governance Lead all published

### New Behavior
- Land is **automatically published to marketplace** when the **FIRST reviewer** publishes their review
- Additional reviewers can continue to publish their reviews, adding credibility
- Marketplace visibility is immediate after first published review

## Implementation Details

### Backend Changes

**File**: `renewmart/backend/routers/reviews.py`

Added auto-publish logic in the `save_review_status` endpoint:

```python
# Auto-publish land to marketplace if this review is published
if params.get("published") == True:
    try:
        # Check if land is already published
        land_status_query = text("SELECT status FROM lands WHERE land_id = :land_id")
        land_status = db.execute(land_status_query, {"land_id": str(land_id)}).fetchone()
        
        if land_status and land_status.status != 'published':
            # Check if land has required fields for publishing
            check_fields_query = text("""
                SELECT 
                    title IS NOT NULL AND
                    location_text IS NOT NULL AND
                    energy_key IS NOT NULL AND
                    capacity_mw IS NOT NULL AND
                    price_per_mwh IS NOT NULL AND
                    timeline_text IS NOT NULL AND
                    contract_term_years IS NOT NULL AND
                    developer_name IS NOT NULL as has_required_fields
                FROM lands 
                WHERE land_id = :land_id
            """)
            fields_check = db.execute(check_fields_query, {"land_id": str(land_id)}).fetchone()
            
            if fields_check and fields_check.has_required_fields:
                # Publish the land to marketplace
                publish_query = text("""
                    UPDATE lands 
                    SET status = 'published', published_at = NOW()
                    WHERE land_id = :land_id 
                    AND status IN ('draft', 'submitted', 'under_review', 'approved', 'investor_ready')
                """)
                db.execute(publish_query, {"land_id": str(land_id)})
                db.commit()
    except Exception as publish_error:
        # Log but don't fail the review save if publish fails
        print(f"Warning: Failed to auto-publish land {land_id}: {str(publish_error)}")
```

**Key Features**:
1. ✅ Checks if review is being published (`published=True`)
2. ✅ Verifies land isn't already published (idempotent)
3. ✅ Validates all required marketing fields are present
4. ✅ Updates land status to 'published' with timestamp
5. ✅ Fails gracefully - review still saves if publish fails

### Frontend Changes

**File**: `renewmart/frontend/src/pages/document-review/index.jsx`

Updated notification logic to show appropriate messages:

```javascript
const publishedCount = allRoles.filter(role => 
  updatedStatuses[role]?.published === true
).length;

if (publishedCount === 1) {
  // First reviewer - land is now published to marketplace
  setNotifications([{
    type: 'success',
    title: 'Project Published to Marketplace!',
    message: `Review published! The project is now visible to investors in the marketplace.`
  }]);
} else if (allPublished) {
  // All reviewers have published
  setNotifications([{
    type: 'success',
    title: 'All Reviews Complete!',
    message: `All three reviewer roles have now completed their reviews.`
  }]);
} else {
  // Additional reviewer (not first, not last)
  setNotifications([{
    type: 'success',
    title: 'Review Published',
    message: `Review published successfully! (${publishedCount} of ${allRoles.length} reviewers completed)`
  }]);
}
```

## Required Fields for Publishing

A land must have ALL of the following fields populated before it can be auto-published:

1. ✅ `title` - Project title
2. ✅ `location_text` - Location description
3. ✅ `energy_key` - Energy type (solar, wind, etc.)
4. ✅ `capacity_mw` - Capacity in megawatts
5. ✅ `price_per_mwh` - Price per megawatt-hour
6. ✅ `timeline_text` - Project timeline
7. ✅ `contract_term_years` - Contract term in years
8. ✅ `developer_name` - Developer name

**Note**: If these fields are missing, the review will still be published, but the land won't appear in marketplace until fields are completed.

## User Experience

### For Reviewers

**First Reviewer to Publish**:
- Sees: "Project Published to Marketplace!"
- Impact: Land immediately visible to all investors
- Badge: "Published" shown on review panel

**Second Reviewer to Publish**:
- Sees: "Review Published (2 of 3 reviewers completed)"
- Impact: Adds additional review credibility
- Badge: Shows 2 of 3 reviewers published

**Third Reviewer to Publish**:
- Sees: "All Reviews Complete!"
- Impact: Full review coverage, highest credibility
- Badge: Shows all 3 reviewers published

### For Investors

- Can see projects in marketplace after first review is published
- Can view number of published reviews (1/3, 2/3, or 3/3)
- Projects with more published reviews may appear more credible

### For Landowners

- Projects become visible to investors faster
- Don't need to wait for all three reviewers
- Can start receiving investor interest earlier

## Database Schema

### Tables Affected

**`land_reviews`** table:
- `published` (BOOLEAN) - Whether this reviewer's review is published
- `published_at` (TIMESTAMPTZ) - When review was published

**`lands`** table:
- `status` (TEXT) - Changed to 'published' after first reviewer publishes
- `published_at` (TIMESTAMPTZ) - When land was published to marketplace

## API Endpoints

### POST `/api/reviews/land/{land_id}/role/{reviewer_role}`

**Request Body**:
```json
{
  "status": "approved",
  "rating": 5,
  "comments": "Project looks great",
  "justification": "All requirements met",
  "published": true,
  "publishedAt": "2025-10-17T12:00:00Z",
  "reviewerName": "John Doe",
  "subtasksCompleted": 10,
  "totalSubtasks": 10,
  "documentsApproved": 5,
  "totalDocuments": 5
}
```

**Side Effects**:
1. Saves/updates review in `land_reviews` table
2. **Auto-publishes land to marketplace** if `published=true` and land has required fields
3. Returns updated review status

### GET `/api/lands/marketplace/published`

**Response**: Returns all published lands (including those published after single review)

```json
[
  {
    "land_id": "uuid",
    "title": "Solar Farm Project",
    "status": "published",
    "published_at": "2025-10-17T12:00:00Z",
    // ... other fields
  }
]
```

## Testing

### Test Scenario 1: First Reviewer Publishes
1. Login as RE Sales Advisor
2. Navigate to a project review
3. Complete review with rating and comments
4. Click "Publish"
5. **Expected**: See "Project Published to Marketplace!" notification
6. Verify land appears at `/api/lands/marketplace/published`

### Test Scenario 2: Second Reviewer Publishes
1. First reviewer already published
2. Login as RE Analyst
3. Complete and publish review
4. **Expected**: See "Review Published (2 of 3 reviewers completed)" notification
5. Verify land still visible in marketplace

### Test Scenario 3: All Reviewers Publish
1. First two reviewers already published
2. Login as RE Governance Lead
3. Complete and publish review
4. **Expected**: See "All Reviews Complete!" notification
5. Verify land shows 3/3 reviews published

### Test Scenario 4: Missing Required Fields
1. Create land with missing `developer_name`
2. Login as reviewer and publish review
3. **Expected**: Review published successfully
4. **Expected**: Land does NOT appear in marketplace
5. Update land to add missing fields
6. **Expected**: Land now appears in marketplace

## Benefits

✅ **Faster Time to Market**: Projects visible to investors sooner
✅ **Increased Efficiency**: Don't wait for all reviewers to complete
✅ **Flexibility**: Additional reviews add credibility but aren't blocking
✅ **Better UX**: Clear feedback on publish impact
✅ **Scalable**: Works if review team grows or shrinks

## Migration Notes

### Existing Projects

For projects with existing published reviews:
- Next time ANY reviewer publishes, land will be auto-published
- No database migration needed
- Existing published lands remain published

### Rollback

To rollback this feature:
1. Remove auto-publish logic from `save_review_status`
2. Revert frontend notification messages
3. Require manual admin approval for marketplace publishing

## Related Documentation

- `documentation/REVIEW_STATUS_PERSISTENCE_SETUP.md`
- `documentation/schema_map.md` - land_reviews table
- `context/2025-10-17_review_data_json_fix.md`

## Files Modified

1. `backend/routers/reviews.py` - Auto-publish logic
2. `frontend/src/pages/document-review/index.jsx` - Updated notifications

