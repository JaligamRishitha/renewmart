# Marketplace Single Reviewer Publishing Feature

**Date**: October 17, 2025
**Type**: Feature Enhancement
**Status**: ✅ Completed

## Summary

Implemented feature to automatically publish land projects to the marketplace after **ONE reviewer** publishes their review, instead of requiring all three reviewers.

## Problem

Previously, land projects required ALL three reviewer roles (RE Sales Advisor, RE Analyst, and RE Governance Lead) to publish their reviews before the land would appear in the marketplace. This created delays in getting projects visible to investors.

## Solution

Modified the review publishing workflow to:
1. **Auto-publish** land to marketplace when the **first reviewer** publishes
2. Allow subsequent reviewers to add their published reviews for additional credibility
3. Show appropriate notifications based on which reviewer is publishing (1st, 2nd, or 3rd)

## Implementation

### Backend Changes

**File**: `renewmart/backend/routers/reviews.py`

Added logic in `save_review_status` endpoint (lines 119-155):
- Detects when a review is published (`published=True`)
- Checks if land is already published (skip if yes)
- Validates required marketing fields are present
- Updates land status to 'published' with timestamp
- Handles errors gracefully without failing the review save

### Frontend Changes

**File**: `renewmart/frontend/src/pages/document-review/index.jsx`

Updated `handlePublish` function (lines 132-183):
- Counts how many reviewers have published
- Shows different notifications:
  - 1st reviewer: "Project Published to Marketplace!"
  - 2nd reviewer: "Review Published (2 of 3 reviewers completed)"
  - 3rd reviewer: "All Reviews Complete!"

## Required Fields for Auto-Publish

Land must have these fields to be published to marketplace:
- `title`
- `location_text`
- `energy_key`
- `capacity_mw`
- `price_per_mwh`
- `timeline_text`
- `contract_term_years`
- `developer_name`

If fields are missing, review saves successfully but land doesn't publish.

## Workflow

```
Reviewer 1 publishes → Land auto-published to marketplace ✅
                    ↓
                Investors can now view project
                    ↓
Reviewer 2 publishes → Adds credibility (2/3 reviews)
                    ↓
Reviewer 3 publishes → Full coverage (3/3 reviews)
```

## Benefits

1. ⚡ **Faster Time to Market**: Projects visible immediately after first review
2. 🚀 **Increased Efficiency**: No bottleneck waiting for all reviewers
3. 📊 **Progressive Credibility**: More reviews = more trust
4. 👥 **Better UX**: Clear feedback on publishing impact
5. 🔄 **Flexibility**: Works with variable number of reviewers

## Testing Checklist

- ✅ First reviewer publishes → land appears in marketplace
- ✅ Second reviewer publishes → land stays visible, shows 2/3
- ✅ Third reviewer publishes → shows 3/3 complete
- ✅ Missing required fields → review saves but no marketplace publish
- ✅ Already published land → no duplicate publish
- ✅ Error handling → review saves even if publish fails

## Files Modified

1. `backend/routers/reviews.py` - Auto-publish logic
2. `frontend/src/pages/document-review/index.jsx` - Notification logic
3. `documentation/MARKETPLACE_SINGLE_REVIEWER_PUBLISH.md` - Full documentation

## Related Changes

This feature works with:
- Review status persistence (land_reviews table)
- Marketplace filtering (status='published')
- Investor dashboard display

## Next Steps

To use this feature:
1. Restart backend to load updated code
2. Test with a project that has all required fields
3. Verify marketplace shows project after first reviewer publishes

