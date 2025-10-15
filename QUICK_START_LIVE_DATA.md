# Quick Start - Landowner Dashboard with Live Data

## What Changed?

Your landowner dashboard now uses **real database data** instead of mock data! 🎉

---

## How to Test

### 1. Start the Backend
```bash
cd renewmart/backend
python server.py
```

Expected output:
```
Uvicorn running on http://localhost:8000
```

### 2. Start the Frontend
```bash
cd renewmart/frontend
npm run dev
```

Expected output:
```
Local: http://localhost:5173/
```

### 3. Access the Dashboard

1. **Login**:
   - Go to http://localhost:5173/login
   - Use existing credentials OR register a new account with role "landowner"

2. **Navigate to Dashboard**:
   - After login, go to http://localhost:5173/landowner-dashboard
   - OR click on "Landowner Dashboard" in the menu

3. **What You'll See**:
   - **If you have projects**: They'll load from the database
   - **If you have no projects**: Empty state with "Upload Land Details" button

---

## Try These Features

### Create a New Project
1. Click "Upload Land Details" button
2. Fill in the form:
   - Project Name: "My Solar Farm"
   - Location: "Austin, TX"
   - Type: Solar
   - Capacity: 25 MW
   - etc.
3. Save as draft
4. See it appear in your dashboard!

### Submit for Review
1. Find a draft project in the table
2. Click "Submit" button
3. Watch it change status to "Submitted"
4. Notice the submit button disappears

### Use Filters
1. Type in the search box to filter by name/location
2. Use dropdown filters for status, type, timeline
3. See results update instantly

---

## What's New?

### Real-Time Data
- Summary cards show actual totals from your database
- Projects list fetches from lands table
- All actions update the database

### API Endpoints
- `GET /api/lands/dashboard/summary` - Your statistics
- `GET /api/lands/dashboard/projects` - Your projects
- `POST /api/lands/{id}/submit` - Submit for review

### Better UX
- Loading spinner while fetching data
- Error messages if something goes wrong
- Success notifications for actions
- Empty state when no projects exist

---

## Troubleshooting

**"Access Denied" error?**
- ✅ Already fixed! Refresh the page.

**Dashboard stuck on "Loading..."?**
- Check if backend is running
- Open browser console (F12) for errors

**No projects showing?**
- This is normal for new users
- Click "Upload Land Details" to create one

**Can't submit project?**
- Only draft projects can be submitted
- Check project status in the table

---

## Database Status Names

Your projects can have these statuses:

| Status | Meaning |
|--------|---------|
| `draft` | Not submitted yet |
| `submitted` | Waiting for admin review |
| `under_review` | Admin is reviewing |
| `approved` | Approved, ready to publish |
| `published` | Visible to investors |
| `rtb` | Ready to Buy |
| `interest_locked` | Investor interested |
| `rejected` | Needs changes |

---

## Documentation

For more details, see:
- **Full Documentation**: `documentation/LANDOWNER_DASHBOARD_API_INTEGRATION.md`
- **Implementation Summary**: `LIVE_DATA_INTEGRATION_COMPLETE.md`

---

## Need Help?

Check the browser console (F12) for error messages. Most issues are:
1. Backend not running
2. Database not set up
3. Authentication token expired (just re-login)

---

**Status**: ✅ Ready to test!  
**Time to test**: 5-10 minutes

