# Role Status Tracking - Implementation Guide

## Overview
Added a comprehensive Role Status Tracking card below the ReviewPanel in the Document Review page that displays approval progress for each reviewer role (RE Sales Advisor, RE Analyst, RE Governance Lead) with individual publish buttons.

## Components Created

### 1. RoleStatusTracking Component
**Location**: `frontend/src/pages/document-review/components/RoleStatusTracking.jsx`

A new component that displays:
- Status bars for each reviewer role
- Progress tracking (subtasks + documents)
- Approve/Pending/Not Started status
- Publish buttons for approved reviews
- Overall project status summary

## Features Implemented

### 1. Role Status Cards

Each role displays:
- **Role Icon & Name**: Visual identifier
- **Reviewer Name**: Who is assigned
- **Status Badge**: Approved, In Review, or Not Started
- **Progress Bar**: Combined subtask and document progress
- **Details**: Subtasks completed, Documents approved
- **Approval Date**: When the review was approved
- **Publish Button**: Available after approval
- **Published Badge**: Shows when published

### 2. Status Colors

- 🟢 **Green**: Approved status
- 🟠 **Orange**: Pending/In Review status
- ⚪ **Gray**: Not Started status

### 3. Progress Calculation

Progress is calculated as:
```javascript
Progress = (SubtasksCompleted / TotalSubtasks) * 50% 
         + (DocumentsApproved / TotalDocuments) * 50%
```

### 4. Auto-Population on Approve

When clicking "Approve" in ReviewPanel:
1. ✅ Auto-populates all review data
2. ✅ Updates role status to "approved"
3. ✅ Records approval timestamp
4. ✅ Stores rating, comments, justification
5. ✅ Tracks subtask and document completion
6. ✅ Stores reviewer name
7. ✅ Shows success notification
8. ✅ Enables publish button

### 5. Publish Functionality

When clicking "Publish":
1. Shows loading state
2. Simulates API call (to be replaced with real endpoint)
3. Updates status to "published"
4. Records publish timestamp
5. Shows success notification
6. Displays "Published" badge

## State Management

### New State Variables

```javascript
// In document-review/index.jsx
const [roleStatuses, setRoleStatuses] = useState({});
const [isPublishing, setIsPublishing] = useState(false);
```

### Role Status Structure

```javascript
{
  're_sales_advisor': {
    status: 'approved',              // approved | pending | not_started
    approvedAt: '2025-10-17T...',   // ISO timestamp
    reviewerName: 'John Doe',        // Reviewer's name
    subtasksCompleted: 8,            // Number completed
    totalSubtasks: 10,               // Total subtasks
    documentsApproved: 5,            // Documents approved
    totalDocuments: 5,               // Total documents
    rating: 4,                       // 1-5 stars
    comments: 'Review comments...',  // Review comments
    justification: 'Justification...', // Action justification
    reviewData: {...},               // Full review data
    published: true,                 // Published flag
    publishedAt: '2025-10-17T...',  // Publish timestamp
    updatedAt: '2025-10-17T...'     // Last update
  },
  're_analyst': {...},
  're_governance_lead': {...}
}
```

## User Flow

### Step 1: Review Process
1. Admin opens Document Review page
2. Selects a reviewer role
3. Reviews subtasks and documents
4. Approves/rejects documents
5. Completes all subtasks
6. Adds rating and comments
7. Provides justification

### Step 2: Approval
1. Clicks "Approve" button in ReviewPanel
2. System auto-populates all review data:
   - Reviewer role and name
   - Completion percentages
   - Document approval status
   - Subtask completion status
   - Rating and comments
   - Justification
   - Timestamp
3. Role status updates to "Approved"
4. Approve button changes to "Approved" (disabled)
5. Progress bar turns green (100%)
6. Publish button becomes enabled

### Step 3: Publishing
1. Scroll to Role Status Tracking card
2. Find the approved role
3. Click "Publish Review" button
4. Loading spinner shows
5. Review is published
6. "Published" badge appears
7. Success notification shown

### Step 4: All Roles Approved
Once all three roles are approved and published:
- Overall status shows "All Reviews Approved"
- Green checkmark indicator
- Project ready for next phase

## Visual Layout

```
┌─────────────────────────────────────────────┐
│ 📊 Project Review Status by Role           │
│ Track approval progress for each reviewer   │
├─────────────────────────────────────────────┤
│ 🔵 RE Sales Advisor                         │
│ John Doe                            [APPROVED]│
│ Review Progress         ████████████ 100%   │
│ ✓ 10/10 Subtasks  ✓ 5/5 Docs               │
│ Approved: 10/17/2025    [📄 Publish Review] │
├─────────────────────────────────────────────┤
│ 🟣 RE Analyst                               │
│ Jane Smith                       [IN REVIEW] │
│ Review Progress         ████████░░░░ 65%    │
│ ✓ 7/10 Subtasks  ✓ 3/5 Docs                │
│ Complete approval to publish                │
├─────────────────────────────────────────────┤
│ 🟢 RE Governance Lead                       │
│ Mike Johnson                   [NOT STARTED] │
│ Review Progress         ░░░░░░░░░░░░ 0%     │
│ ✓ 0/10 Subtasks  ✓ 0/5 Docs                │
│ Awaiting review                             │
├─────────────────────────────────────────────┤
│ 📊 Overall Project Status:                  │
│                      🕐 Review in Progress   │
└─────────────────────────────────────────────┘
```

## Integration Points

### 1. Document Review Page
**File**: `frontend/src/pages/document-review/index.jsx`

**Changes**:
- Imported `RoleStatusTracking` component
- Added `roleStatuses` and `isPublishing` state
- Created `updateRoleStatus` function
- Created `handleApproveReview` function
- Created `handlePublish` function
- Passed `onApprove={handleApproveReview}` to ReviewPanel
- Added RoleStatusTracking component below ReviewPanel

### 2. ReviewPanel Component
**File**: `frontend/src/pages/document-review/components/ReviewPanel.jsx`

**Changes**:
- Updated `handleSubmitReview` to include document progress
- Added `documentsApproved` and `totalDocuments` to reviewData
- Added `subtasksData` array to reviewData
- Auto-populates data when approve is clicked

## API Integration (Future)

### Endpoints to Create:

```javascript
// Approve review for a role
POST /api/reviews/approve
Body: {
  landId: UUID,
  roleId: string,
  reviewData: object
}

// Publish review for a role
POST /api/reviews/publish
Body: {
  landId: UUID,
  roleId: string
}

// Get all role statuses for a project
GET /api/reviews/status/{landId}
Response: {
  're_sales_advisor': {...},
  're_analyst': {...},
  're_governance_lead': {...}
}
```

## Benefits

1. **Clear Visibility**: See all role statuses at a glance
2. **Progress Tracking**: Visual progress bars for each role
3. **Auto-Population**: No manual data entry needed
4. **Audit Trail**: Timestamps for approvals and publications
5. **Workflow Control**: Publish only after approval
6. **Status Indicators**: Color-coded for quick understanding
7. **Reviewer Attribution**: Know who reviewed what
8. **Overall Status**: Project-wide status summary

## Testing Checklist

- [ ] Role Status Tracking card displays
- [ ] All three roles show correctly
- [ ] Status badges display correct status
- [ ] Progress bars calculate correctly
- [ ] Approve button in ReviewPanel works
- [ ] Role status updates when approved
- [ ] Review data auto-populates
- [ ] Publish button enables after approval
- [ ] Publish button works
- [ ] Published badge shows after publish
- [ ] Loading state shows during publish
- [ ] Success notifications appear
- [ ] Overall status updates correctly
- [ ] Multiple roles can be approved
- [ ] Data persists after page refresh (with backend)

## Future Enhancements

1. **Backend Integration**: Connect to real API endpoints
2. **Data Persistence**: Store in database
3. **Email Notifications**: Notify on approval/publish
4. **Approval Workflow**: Multi-step approval process
5. **Comments Thread**: Discussion per role
6. **Version History**: Track review changes
7. **Export Reports**: PDF/Excel export
8. **Role Reassignment**: Change assigned reviewers
9. **Deadline Tracking**: Show due dates
10. **Bulk Actions**: Publish multiple roles at once

## Related Files

- `renewmart/frontend/src/pages/document-review/index.jsx`
- `renewmart/frontend/src/pages/document-review/components/ReviewPanel.jsx`
- `renewmart/frontend/src/pages/document-review/components/RoleStatusTracking.jsx`

---

**Date**: October 17, 2025  
**Author**: AI Assistant  
**Status**: ✅ Completed


