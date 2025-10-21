# 🚀 Quick Start: Fix Review Status Persistence

## The Problem
After approving reviews and refreshing the page, the Role Status Tracking data is lost because it was only stored in React state.

## The Solution
Run this ONE command to create the database table that will persist review statuses:

## 📋 Step-by-Step

### Option 1: PowerShell (Recommended for Windows)
```powershell
# From the RENEW directory
Get-Content .\renewmart\SETUP_REVIEW_PERSISTENCE.sql | psql -U postgres -d renew
```

### Option 2: PostgreSQL Command Line
```bash
psql -U postgres -d renew -f renewmart/SETUP_REVIEW_PERSISTENCE.sql
```

### Option 3: pgAdmin
1. Open pgAdmin
2. Connect to the `renew` database
3. Open Query Tool
4. Copy and paste the contents of `renewmart/SETUP_REVIEW_PERSISTENCE.sql`
5. Execute (F5)

## ✅ Expected Output
```
=======================================
  Setting up Review Status Persistence
=======================================

✓ Created land_reviews table
✓ Created indexes for performance
✓ Created updated_at trigger
✓ Added table comments

=======================================
  ✅ Setup Complete!
=======================================

Review statuses will now persist across page refreshes.
```

## 🧪 Test It

1. **Navigate to Document Review page** in your browser
2. **Approve some documents** for a role
3. **Click "Approve"** in the Review Panel
4. **Click "Publish"** for that role
5. **Refresh the page** (F5 or Ctrl+R)
6. ✅ **Status should still be there!**

## 🔍 Verify It Worked

In PostgreSQL, run:
```sql
-- Check the table exists
\dt land_reviews

-- View the structure
\d land_reviews

-- See your data
SELECT * FROM land_reviews;
```

## 📚 What Was Changed

### Backend
- ✅ Created `land_reviews` table in database
- ✅ Created `/api/reviews` endpoints
- ✅ Added `reviewsAPI` to frontend API client

### Frontend  
- ✅ Updated `document-review/index.jsx` to save/load from database
- ✅ Added automatic persistence on every status change
- ✅ Added automatic loading on page load

## 🎉 Benefits

- ✅ **Persistence**: Data survives page refreshes
- ✅ **History**: Full audit trail
- ✅ **Reliability**: No more lost progress
- ✅ **Production-ready**: Database-backed solution

## 🆘 Troubleshooting

### Error: "relation 'land_reviews' does not exist"
**Solution:** Run the SQL script again

### Still losing data on refresh?
**Check:**
1. Backend logs for errors: `renewmart/backend/logs/`
2. Browser console for JavaScript errors
3. Database connection: `psql -U postgres -d renew -c "SELECT 1;"`

### Want to reset a review?
```sql
-- Reset all reviews for a land
DELETE FROM land_reviews WHERE land_id = 'your-land-id';

-- Reset just one role
DELETE FROM land_reviews 
WHERE land_id = 'your-land-id' 
AND reviewer_role = 're_sales_advisor';
```

## 📖 Full Documentation

See `renewmart/documentation/REVIEW_STATUS_PERSISTENCE_SETUP.md` for complete details.

---

**That's it!** Just run the SQL script and your review statuses will persist! 🎊

