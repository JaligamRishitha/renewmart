# Admin Review Panel - Subtask Documents Display

## Overview
Updated the Admin Review Panel to display documents uploaded for each subtask directly in the Review tab, with approval/rejection controls. Documents have been removed from the Task Details tab for a cleaner, more focused review workflow.

## Changes Made

### 1. ReviewPanel Component (`frontend/src/pages/document-review/components/ReviewPanel.jsx`)

#### Added Features:
- **Subtask Document Display**: Each subtask now has a collapsible section showing uploaded documents
- **Document Status Badges**: Shows PENDING, APPROVED, or REJECTED status for each document
- **Admin Controls**: Approve and reject buttons for pending documents (admin only)
- **Document Download**: Download button available for all users
- **Auto-loading**: Documents are fetched automatically when expanding a subtask

#### New State Management:
```javascript
const [subtaskDocuments, setSubtaskDocuments] = useState({});
const [expandedSubtasks, setExpandedSubtasks] = useState({});
const [loadingDocs, setLoadingDocs] = useState({});
const [processingDoc, setProcessingDoc] = useState(null);
```

#### New Functions:
- `fetchSubtaskDocuments(subtaskId)` - Fetches documents for a specific subtask
- `toggleSubtaskExpanded(subtaskId)` - Toggles the expanded/collapsed state
- `handleApproveDocument(docId, subtaskId)` - Approves a document (admin only)
- `handleRejectDocument(docId, subtaskId)` - Rejects a document with reason (admin only)
- `handleDownloadDocument(doc)` - Downloads a document

#### UI Updates:
- Added chevron icon (up/down) to toggle document visibility
- Document count displayed next to each subtask
- Compact document cards with file info, status, and action buttons
- Loading spinner while fetching documents
- Empty state message when no documents are uploaded

### 2. TaskDetails Component (`frontend/src/pages/document-review/components/TaskDetails.jsx`)

#### Removed:
- Entire "Task Documents" section
- Document fetching logic
- Document approve/reject handlers
- Document download handler
- Related state variables (`documents`, `loading`, `processing`)

#### Reason:
Documents are now managed per-subtask in the Review tab for better organization and workflow.

## User Experience

### For Administrators:
1. Navigate to Document Review page
2. Select the "Review" tab
3. Expand any subtask to see uploaded documents
4. For pending documents:
   - Click ✓ (CheckCircle) to approve
   - Click ✗ (XCircle) to reject with reason
5. Status updates immediately after approval/rejection
6. All documents (approved, rejected, pending) remain visible with status badges

### For Reviewers:
1. View their subtasks in the Review tab
2. Expand subtasks to see what documents have been uploaded
3. Check document status (approved/rejected/pending)
4. Download documents for review
5. Cannot approve/reject (admin privilege only)

## Visual Layout

```
Review Tab
├── Subtask Section Header
│   └── Add Subtask Button
│
└── Subtasks
    ├── Subtask Row
    │   ├── Checkbox (complete/incomplete)
    │   ├── Title
    │   ├── Status Badge
    │   └── Chevron Toggle ▼
    │
    └── Expanded Documents Section (collapsible)
        ├── "Uploaded Documents (X)" Header
        │
        └── Document Cards
            ├── File Icon
            ├── File Name
            ├── Upload Date
            ├── Status Badge (PENDING/APPROVED/REJECTED)
            └── Action Buttons
                ├── ✓ Approve (pending docs, admin only)
                ├── ✗ Reject (pending docs, admin only)
                └── ⬇ Download (all users)
```

## Technical Details

### API Endpoints Used:
- `GET /documents/subtask/{subtask_id}` - Fetch documents for a subtask
- `POST /documents/approve/{document_id}` - Approve a document
- `POST /documents/reject/{document_id}` - Reject a document
- `GET /documents/download/{document_id}` - Download a document

### Status Flow:
1. **PENDING** - Initial status when document is uploaded
2. **APPROVED** - Admin approves the document
3. **REJECTED** - Admin rejects with reason

### Permissions:
- **Admins**: Can approve, reject, and download documents
- **Reviewers**: Can only view and download documents
- **Landowners**: Can upload documents (from their dashboard)

## Benefits

1. **Organized Review**: Documents are contextually grouped with their subtasks
2. **Clear Status**: Visual indication of approval status at a glance
3. **Streamlined Workflow**: Approve/reject directly in the review flow
4. **Reduced Tab Switching**: No need to switch to Task Details tab for documents
5. **Better Context**: See exactly which subtask each document relates to

## Testing Checklist

- [ ] Documents load when expanding subtask
- [ ] Status badges display correctly (PENDING/APPROVED/REJECTED)
- [ ] Approve button works (admin only)
- [ ] Reject button prompts for reason (admin only)
- [ ] Download button works for all users
- [ ] Non-admin users cannot see approve/reject buttons
- [ ] Loading spinner shows while fetching documents
- [ ] Empty state message displays when no documents
- [ ] Document count updates after approval/rejection
- [ ] Multiple subtasks can be expanded simultaneously

## Future Enhancements

1. Add document preview modal
2. Bulk approve/reject multiple documents
3. Add comment/note to individual documents
4. Filter documents by status
5. Sort documents by date/name
6. Show who approved/rejected and when
7. Add document version history
8. Allow document replacement

## Related Files

- `renewmart/frontend/src/pages/document-review/components/ReviewPanel.jsx`
- `renewmart/frontend/src/pages/document-review/components/TaskDetails.jsx`
- `renewmart/frontend/src/services/api.js`
- `renewmart/backend/routers/documents.py`

---

**Date**: October 17, 2025  
**Author**: AI Assistant  
**Status**: ✅ Completed


