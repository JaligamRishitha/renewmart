# Subtask Permissions Fix

## Overview
This document describes the fix for subtask permissions in the Reviewer Dashboard, ensuring proper access control for administrators and reviewers.

## Problem Statement
Previously, administrators could change the status of subtasks in the Reviewer Dashboard, which was not desired. The system should allow:
1. Both admins and reviewers can **add** subtasks
2. Only reviewers (task assigned users) can **change subtask status**
3. Admins can only **view** subtask status

## Solution Implemented

### Backend Changes (`renewmart/backend/routers/tasks.py`)

#### Modified: `update_subtask` endpoint (lines 1052-1170)

**New Permission Logic:**
```python
# Check if admin is trying to update status
if is_admin and subtask_data.status is not None and not (is_task_assigned or is_task_creator or is_landowner):
    raise HTTPException(
        status_code=http_status.HTTP_403_FORBIDDEN,
        detail="Administrators can only view subtasks. Only the assigned reviewer can change subtask status."
    )
```

**Key Changes:**
- Admins cannot change subtask status unless they are also the assigned reviewer
- Admins can still add new subtasks
- Admins can update other subtask fields (title, description) but NOT status
- Task assigned users (reviewers), task creators, and landowners retain full update permissions

### Frontend Changes

#### Modified: `ReviewPanel.jsx` Component

**1. Added `currentUser` prop:**
```jsx
const ReviewPanel = ({ 
  // ... existing props
  currentUser = null,  // User info for permission checks
  // ...
}) => {
```

**2. Added permission checking logic:**
```jsx
// Check if user is admin (view-only for subtask status)
const isAdmin = currentUser?.roles?.includes('administrator') || false;
const isTaskAssignedToMe = currentTask?.assigned_to === currentUser?.user_id;

// Admin can only change status if they are also the assigned reviewer
const canChangeSubtaskStatus = !isAdmin || isTaskAssignedToMe;
```

**3. Updated checkbox handler:**
- Added validation to prevent admins from changing status
- Shows alert message when admin attempts to change status
- Checkboxes are disabled for admins (visual indicator)

**4. Added visual indicator:**
- Orange banner at the top of the review panel when admin is in view-only mode
- Clear message explaining admin can view and add subtasks but cannot change status
- Icon indicator (Eye icon) for better UX

**5. Updated subtask checkbox UI:**
- Disabled state for admin users
- Opacity reduction (60%) to show read-only state
- Tooltip on hover explaining the restriction
- Cursor change to `cursor-not-allowed` for disabled state

#### Modified: `DocumentReview` page (`index.jsx`)

**Updated ReviewPanel instantiation:**
```jsx
<ReviewPanel
  // ... existing props
  currentUser={user}  // Pass user info from AuthContext
  // ...
/>
```

## Permission Matrix

| User Role | View Subtasks | Add Subtasks | Change Subtask Status |
|-----------|--------------|--------------|----------------------|
| Admin (not assigned to task) | ✅ Yes | ✅ Yes | ❌ No |
| Admin (assigned to task) | ✅ Yes | ✅ Yes | ✅ Yes |
| Reviewer (assigned to task) | ✅ Yes | ✅ Yes | ✅ Yes |
| Task Creator | ✅ Yes | ✅ Yes | ✅ Yes |
| Landowner | ✅ Yes | ✅ Yes | ✅ Yes |

## User Experience

### For Reviewers
- Full access to all subtask operations
- Can check/uncheck subtask status
- Can add new custom subtasks
- Normal workflow unchanged

### For Administrators
1. **View Mode:**
   - See all subtasks and their statuses
   - Orange banner notification about view-only mode
   - Checkboxes are visibly disabled (grayed out)
   - Hover tooltip explains the restriction

2. **Add Subtasks:**
   - Can add new custom subtasks
   - "Add Custom Subtask" button remains enabled

3. **Status Changes:**
   - Clicking a checkbox shows an alert: "Administrators can only view subtasks. Only the assigned reviewer can change subtask status."
   - Backend enforces this restriction with 403 error if attempted via API

## Error Handling

**Backend Error Response:**
```json
{
  "detail": "Administrators can only view subtasks. Only the assigned reviewer can change subtask status."
}
```

**Frontend Validation:**
- Pre-emptive check before making API call
- User-friendly alert message
- No failed API calls for expected behavior

## Testing Checklist

- [ ] Admin can view subtasks
- [ ] Admin can add new subtasks
- [ ] Admin CANNOT change subtask status (UI disabled)
- [ ] Admin receives clear error message if attempting status change
- [ ] Reviewer can change subtask status normally
- [ ] Reviewer can add new subtasks
- [ ] Visual indicator shows for admin in view-only mode
- [ ] Admin who is also assigned to task can change status
- [ ] Backend enforces permission restrictions

## Files Modified

1. **Backend:**
   - `renewmart/backend/routers/tasks.py` - Permission logic in `update_subtask` endpoint

2. **Frontend:**
   - `renewmart/frontend/src/pages/document-review/components/ReviewPanel.jsx` - UI and permission checks
   - `renewmart/frontend/src/pages/document-review/index.jsx` - Pass user info to ReviewPanel

3. **Documentation:**
   - `renewmart/documentation/SUBTASK_PERMISSIONS_FIX.md` (this file)

## Benefits

1. **Security:** Enforced at both backend and frontend levels
2. **User Experience:** Clear visual feedback about permissions
3. **Flexibility:** Admins can still monitor and add subtasks
4. **Clarity:** Users understand their permission level immediately
5. **Consistency:** Same permission model across the application

## Future Considerations

- Consider adding more granular role-based permissions
- Add audit logging for subtask status changes
- Consider adding a "supervisor" role that can override reviewer decisions
- Add notification system for admins when subtask status changes

## Related Documentation

- See `ADMIN_TASK_ASSIGNMENT_GUIDE.md` for task assignment workflows
- See `ROLE_SWITCHING_BUG_FIX.md` for role switching implementation
- See `REVIEWER_DASHBOARD_GUIDE.md` for complete dashboard documentation

