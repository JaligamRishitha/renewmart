# Project Priority and Due Date Implementation

**Date:** October 16, 2025  
**Feature:** Project-level priority and due date tracking for admin task management

## Overview

This feature adds project-level priority and due date fields to the lands table, allowing admins to set priorities and deadlines for projects even before tasks/reviewers are assigned. When the due date passes, the project will show as "Overdue" in the admin dashboard.

## Changes Made

### 1. Database Changes

#### New Columns in `lands` table:
- `project_priority` (VARCHAR(50)) - Stores priority level: low, medium, high, critical
- `project_due_date` (TIMESTAMP WITH TIME ZONE) - Stores the project deadline

#### Migration File:
- Location: `backend/migrations/add_project_priority_and_due_date.sql`
- Run this migration to add the columns to your database

```sql
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_priority VARCHAR(50);
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_due_date TIMESTAMP WITH TIME ZONE;
```

### 2. Backend Changes

#### Models (`backend/models/lands.py`):
- Added `project_priority` and `project_due_date` columns to the `Land` model

#### Schemas (`backend/models/schemas.py`):
- Updated `LandUpdate` schema to accept `project_priority` and `project_due_date`
- Updated `Land` response schema to include these fields

#### Routes (`backend/routers/lands.py`):
- Updated `update_land` endpoint to handle the new fields
- Updated `get_admin_projects` query to return the new fields in the response

### 3. Frontend Changes

#### Admin Dashboard (`frontend/src/pages/admin-dashboard/index.jsx`):
- Modified placeholder task creation to use `project_priority` and `project_due_date` from the land record
- Updated `handleTaskUpdate` to:
  - Update land record when editing placeholder tasks (projects without assigned reviewers)
  - Update task record when editing actual tasks
- Modified task data mapping to display project-level priorities and due dates

#### Task Edit Modal (`frontend/src/pages/admin-dashboard/components/TaskEditModal.jsx`):
- Removed placeholder validation that prevented editing
- Added info banner for placeholder tasks indicating these are project-level settings
- Updated to pass `isPlaceholder` and `landId` flags to the update handler
- Modified display logic to show current values correctly for both projects and tasks

#### Task Table (`frontend/src/pages/admin-dashboard/components/TaskTable.jsx`):
- Removed alert that prevented editing placeholder tasks
- Updated `handleTaskUpdate` to pass additional parameters for placeholder detection

#### API Service (`frontend/src/services/api.js`):
- No changes needed - existing `landsAPI.updateLand` handles the new fields

## How It Works

### For Projects Without Assigned Reviewers (Placeholder Tasks):
1. Admin clicks "Edit" on a project in the task table
2. Modal opens showing current project-level priority and due date
3. Admin can set/update these values
4. On save, the land record is updated with `project_priority` and `project_due_date`
5. These values persist and display in the admin dashboard
6. When a reviewer is eventually assigned, the task inherits these values

### For Projects With Assigned Tasks:
1. Admin clicks "Edit" on a task
2. Modal opens showing task-level priority and due date
3. Admin can update these values
4. On save, the task record is updated with `priority` and `due_date`
5. Task-specific values take precedence over project-level values

### Overdue Detection:
- If current date > `endDate` (due_date/project_due_date) AND status ≠ 'Completed'
- Task/project row is highlighted in red
- "Overdue" label is displayed
- Appears in Deadline Alerts section

## User Instructions

### Setting Priority and Due Date:

1. Navigate to Admin Dashboard
2. Locate the project in the Active Reviews table
3. Click the "Edit" icon (pencil) button
4. In the modal:
   - **End Date**: Select a future date or leave empty for "Not Assigned"
   - **Priority**: Choose Low, Medium, High, Critical, or "Not Assigned"
5. Click "Update" to save

### For Projects Without Reviewers:
- A blue info banner will indicate "This is a project-level setting"
- Values will be inherited when a reviewer is assigned

### For Projects With Reviewers:
- Edit updates the task-specific values
- No info banner is shown

## Database Schema Update

### Before Deployment:
Run the migration script on your PostgreSQL database:

```bash
psql -U your_user -d renewmart -f backend/migrations/add_project_priority_and_due_date.sql
```

Or if using Docker:
```bash
docker exec -i renewmart-db psql -U postgres -d renewmart < backend/migrations/add_project_priority_and_due_date.sql
```

## API Changes

### Updated Endpoints:

#### PUT `/api/lands/{land_id}`
**New Request Fields:**
```json
{
  "project_priority": "high",  // optional: low, medium, high, critical
  "project_due_date": "2025-12-31"  // optional: ISO date string
}
```

#### GET `/api/lands/admin/projects`
**New Response Fields:**
```json
{
  "id": "uuid",
  "title": "Project Title",
  "project_priority": "high",  // nullable
  "project_due_date": "2025-12-31T00:00:00Z",  // nullable
  ...
}
```

## Testing

### Manual Testing Steps:
1. ✅ Open Admin Dashboard
2. ✅ Edit a project without a reviewer assigned
3. ✅ Set priority to "High" and a due date 3 days from now
4. ✅ Save and verify values persist after page refresh
5. ✅ Assign a reviewer to the project
6. ✅ Verify the task inherits the project priority and due date
7. ✅ Edit the task and change priority/due date
8. ✅ Verify task-level values are saved correctly
9. ✅ Set a due date in the past
10. ✅ Verify project shows as "Overdue" with red highlighting

## Files Modified

### Backend:
- `backend/models/lands.py`
- `backend/models/schemas.py`
- `backend/routers/lands.py`
- `backend/migrations/add_project_priority_and_due_date.sql` (new)

### Frontend:
- `frontend/src/pages/admin-dashboard/index.jsx`
- `frontend/src/pages/admin-dashboard/components/TaskEditModal.jsx`
- `frontend/src/pages/admin-dashboard/components/TaskTable.jsx`

### Documentation:
- `documentation/PROJECT_PRIORITY_DUE_DATE_IMPLEMENTATION.md` (this file)

## Notes

- Priority values are case-insensitive on the backend
- Due dates are stored in UTC timezone
- Clearing a priority or due date (selecting "Not Assigned" or leaving empty) stores NULL in the database
- The overdue calculation runs client-side on the admin dashboard
- Project-level settings provide a way to track deadlines before the formal review process begins

