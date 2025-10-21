# Apply Priority & Due Date Changes - Quick Setup Guide

## ⚠️ Important: Run Database Migration First

Before starting the application, you MUST run the database migration to add the new columns.

### Option 1: Using Docker (Recommended)
```bash
docker exec -i renewmart-db psql -U postgres -d renewmart < backend/migrations/add_project_priority_and_due_date.sql
```

### Option 2: Using Local PostgreSQL
```bash
cd renewmart/backend
psql -U your_postgres_user -d renewmart -f migrations/add_project_priority_and_due_date.sql
```

### Option 3: Manual SQL Execution
Open your PostgreSQL client (pgAdmin, DBeaver, etc.) and run:

```sql
-- Add project_priority column
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_priority VARCHAR(50);

-- Add project_due_date column  
ALTER TABLE lands ADD COLUMN IF NOT EXISTS project_due_date TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN lands.project_priority IS 'Project-level priority (low, medium, high, critical) - used when no task is assigned yet';
COMMENT ON COLUMN lands.project_due_date IS 'Project-level due date - used when no task is assigned yet';
```

## What This Fixes

### ✅ Fixed Issues:
1. **Priority Selection** - Priority dropdown now works correctly in task edit modal
2. **UUID Error** - No more "invalid UUID" errors when editing projects
3. **Default Values** - Projects without reviewers now show "Not Assigned" for priority and due date
4. **Project-Level Settings** - Can now set priority and due date even before assigning reviewers
5. **Overdue Tracking** - Projects show as "Overdue" when current date passes the due date

### 🎯 How It Works:

#### For Projects WITHOUT Reviewers:
- Edit button opens modal with project-level settings
- Blue info banner indicates "This is a project-level setting"
- Changes update the land/project record
- Values persist and display in the table
- When reviewer is assigned, task inherits these values

#### For Projects WITH Reviewers:
- Edit button opens modal with task-level settings  
- Changes update the task record
- Task values take precedence

## Testing the Changes

1. **Start the Application:**
   ```bash
   cd renewmart
   # Use your existing start script
   ```

2. **Test Priority Setting:**
   - Go to Admin Dashboard
   - Click Edit on any project
   - Select a priority (Low/Medium/High/Critical)
   - Click Update
   - ✅ Verify priority is saved and displayed

3. **Test Due Date:**
   - Click Edit on a project
   - Set a due date
   - Click Update
   - ✅ Verify date is saved

4. **Test Overdue Display:**
   - Set a due date in the past
   - ✅ Verify row is highlighted in red
   - ✅ Verify "Overdue" label appears

5. **Test Project Without Reviewer:**
   - Find a project with "Unassigned" reviewer
   - Click Edit
   - ✅ See blue info banner about project-level settings
   - Set priority and due date
   - ✅ Verify values persist

## Files Changed

### Backend:
- ✅ `backend/models/lands.py` - Added columns to Land model
- ✅ `backend/models/schemas.py` - Updated schemas
- ✅ `backend/routers/lands.py` - Updated endpoints
- ✅ `backend/migrations/add_project_priority_and_due_date.sql` - Migration script

### Frontend:
- ✅ `frontend/src/pages/admin-dashboard/index.jsx` - Dashboard logic
- ✅ `frontend/src/pages/admin-dashboard/components/TaskEditModal.jsx` - Edit modal
- ✅ `frontend/src/pages/admin-dashboard/components/TaskTable.jsx` - Task table

### Documentation:
- ✅ `documentation/PROJECT_PRIORITY_DUE_DATE_IMPLEMENTATION.md` - Full documentation
- ✅ `APPLY_PRIORITY_DUE_DATE_CHANGES.md` - This quick guide

## Troubleshooting

### Issue: "column does not exist" error
**Solution:** Run the database migration (see top of this file)

### Issue: Priority not saving
**Solution:** Clear browser cache and refresh page

### Issue: "Not Assigned" not showing
**Solution:** The fixes have already been applied. Make sure frontend changes are deployed.

### Issue: Can't edit projects without reviewers
**Solution:** The validation has been removed. Make sure latest code is running.

## Need Help?

Check the full documentation: `documentation/PROJECT_PRIORITY_DUE_DATE_IMPLEMENTATION.md`

