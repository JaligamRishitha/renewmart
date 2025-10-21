# Review Panel - Document Progress & Conditional Approval

## Overview
Enhanced the Review Panel to display document approval progress with separate progress bars for pending and approved documents. The save/submit buttons are now conditional and only enabled when all documents are approved.

## Changes Made

### 1. Document Progress Tracking

#### Added Function: `getDocumentProgress()`
```javascript
const getDocumentProgress = () => {
  const allDocs = Object.values(subtaskDocuments).flat();
  const totalDocs = allDocs.length;
  const pendingDocs = allDocs.filter(doc => doc.status === 'pending').length;
  const approvedDocs = allDocs.filter(doc => doc.status === 'approved').length;
  const rejectedDocs = allDocs.filter(doc => doc.status === 'rejected').length;
  
  return {
    total: totalDocs,
    pending: pendingDocs,
    approved: approvedDocs,
    rejected: rejectedDocs,
    pendingPercentage: totalDocs > 0 ? Math.round((pendingDocs / totalDocs) * 100) : 0,
    approvedPercentage: totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0,
    allApproved: totalDocs > 0 && pendingDocs === 0 && rejectedDocs === 0
  };
};
```

This function:
- Aggregates all documents from all subtasks
- Counts pending, approved, and rejected documents
- Calculates percentages for progress bars
- Determines if all documents are approved

### 2. Auto-Fetch Documents

#### Added useEffect Hook:
```javascript
useEffect(() => {
  const fetchAllDocuments = async () => {
    if (subtasks && subtasks.length > 0) {
      for (const subtask of subtasks) {
        if (subtask.subtask_id && !subtaskDocuments[subtask.subtask_id]) {
          await fetchSubtaskDocuments(subtask.subtask_id);
        }
      }
    }
  };
  fetchAllDocuments();
}, [subtasks]);
```

Automatically fetches documents for all subtasks to calculate progress without requiring manual expansion.

### 3. Updated Review Completion Logic

#### Modified `isReviewComplete()`:
```javascript
const isReviewComplete = () => {
  const docProgress = getDocumentProgress();
  return subtasks?.length > 0 &&
    subtasks.every(s => s.status === 'completed') &&
    overallRating > 0 &&
    docProgress.allApproved;
};
```

Now requires all documents to be approved in addition to:
- All subtasks completed
- Rating provided

### 4. Document Progress UI Section

Added a new section in the footer above the review progress bar:

#### Components:

**A. Header with Summary:**
```
Document Approval Progress    X/Y Approved
```

**B. Pending Documents Bar:**
- Orange color scheme
- Clock icon
- Shows count and percentage
- Visual progress bar

**C. Approved Documents Bar:**
- Green color scheme
- CheckCircle icon
- Shows count and percentage
- Visual progress bar

**D. Rejected Documents Alert (conditional):**
- Shows only if there are rejected documents
- Red color scheme with warning icon

**E. All Approved Indicator (conditional):**
- Shows when all documents are approved
- Green success message

### 5. Conditional Action Buttons

#### Updated Button Logic:
- **Save Progress** - Disabled if documents pending
- **Request Clarification** - Disabled if documents pending
- **Reject** - Disabled if documents pending
- **Approve** - Disabled if any requirement not met

#### Added Warning Message:
Shows above buttons when documents are not approved:
```
⚠️ Please approve all pending documents before submitting your review
```

## Visual Layout

```
┌─────────────────────────────────────────────┐
│ Document Approval Progress      3/5 Approved│
├─────────────────────────────────────────────┤
│ 🕐 Pending Documents         2 (40%)        │
│ [████████░░░░░░░░░░] 40%                   │
├─────────────────────────────────────────────┤
│ ✓ Approved Documents         3 (60%)        │
│ [████████████░░░░░░] 60%                   │
├─────────────────────────────────────────────┤
│ ⚠️ Please approve all pending documents...  │
├─────────────────────────────────────────────┤
│ Subtask Review Progress      100% Complete  │
│ [████████████████████] 100%                │
├─────────────────────────────────────────────┤
│ [Save] [Clarify] [Reject] [Approve]        │
│ (All buttons disabled until docs approved)  │
└─────────────────────────────────────────────┘
```

When all documents are approved:

```
┌─────────────────────────────────────────────┐
│ Document Approval Progress      5/5 Approved│
├─────────────────────────────────────────────┤
│ 🕐 Pending Documents         0 (0%)         │
│ [░░░░░░░░░░░░░░░░░░░░] 0%                  │
├─────────────────────────────────────────────┤
│ ✓ Approved Documents         5 (100%)       │
│ [████████████████████] 100%                │
├─────────────────────────────────────────────┤
│ ✓ All documents approved! You can now save. │
├─────────────────────────────────────────────┤
│ Subtask Review Progress      100% Complete  │
│ [████████████████████] 100%                │
├─────────────────────────────────────────────┤
│ [Save] [Clarify] [Reject] [Approve]        │
│ (All buttons now enabled)                   │
└─────────────────────────────────────────────┘
```

## User Experience Flow

### For Admins:

1. **Open Review Panel**
   - Document progress section appears automatically
   - Shows pending/approved status at a glance

2. **Review Documents**
   - Expand subtasks to see individual documents
   - Approve or reject each document
   - Progress bars update in real-time

3. **Complete Review**
   - Pending bar decreases as documents are approved
   - Approved bar increases accordingly
   - Warning message disappears when all approved
   - Success message appears
   - Action buttons become enabled

4. **Submit Review**
   - Now able to click Save Progress, Clarify, Reject, or Approve
   - Complete the review workflow

### Visual Indicators:

- **Orange**: Pending documents (needs attention)
- **Green**: Approved documents (ready)
- **Red**: Rejected documents (issue alert)

## Benefits

1. **Clear Status Overview** - See document approval status at a glance
2. **Progress Tracking** - Visual bars show exactly how much is complete
3. **Prevents Premature Submission** - Buttons disabled until ready
4. **Better Workflow** - Forces review of all documents before proceeding
5. **Real-time Updates** - Progress bars update immediately after approval/rejection
6. **Professional UX** - Clear visual feedback and guidance

## Technical Details

### State Management:
- `subtaskDocuments` - Stores all fetched documents by subtask ID
- Auto-fetches on component mount/subtask change
- Updates after each approval/rejection

### Calculations:
- Aggregates documents across all subtasks
- Filters by status (pending, approved, rejected)
- Calculates percentages for visual representation

### Conditional Rendering:
- Document progress only shown if documents exist
- Rejected alert only shown if rejections exist
- Success message only shown when all approved
- Buttons disabled based on document status

## API Integration

Uses existing endpoints:
- `GET /documents/subtask/{subtask_id}` - Fetch subtask documents
- `POST /documents/approve/{document_id}` - Approve document
- `POST /documents/reject/{document_id}` - Reject document

Document status values:
- `"pending"` - Awaiting review
- `"approved"` - Admin approved
- `"rejected"` - Admin rejected

## Testing Checklist

- [ ] Document progress bars appear in footer
- [ ] Pending bar shows correct count and percentage
- [ ] Approved bar shows correct count and percentage
- [ ] Bars update after approving a document
- [ ] Bars update after rejecting a document
- [ ] Warning message shows when documents pending
- [ ] Success message shows when all approved
- [ ] Save button disabled with pending documents
- [ ] All action buttons disabled with pending documents
- [ ] Buttons enabled after all documents approved
- [ ] Progress calculates correctly with 0 documents
- [ ] Progress calculates correctly with mixed statuses
- [ ] Rejected documents show alert message

## Edge Cases Handled

1. **No Documents**: Section doesn't appear (no documents to review)
2. **All Pending**: Shows 100% pending, 0% approved
3. **All Approved**: Shows 0% pending, 100% approved
4. **Mixed Status**: Shows appropriate percentages
5. **With Rejections**: Shows rejection alert
6. **Empty Subtasks**: Handles gracefully

## Future Enhancements

1. Add document type breakdown in progress
2. Show which reviewer role's documents are pending
3. Add bulk approve/reject functionality
4. Add document review history timeline
5. Add notifications when new documents are uploaded
6. Add export/download of document approval report
7. Add comments/notes to document approvals

## Related Files

- `renewmart/frontend/src/pages/document-review/components/ReviewPanel.jsx` - Main component
- `renewmart/backend/routers/documents.py` - Document API endpoints
- `renewmart/frontend/src/services/api.js` - API service

---

**Date**: October 17, 2025  
**Author**: AI Assistant  
**Status**: ✅ Completed


