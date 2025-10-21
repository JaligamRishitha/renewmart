# 🎯 Admin Marketplace - Quick Start Guide

**Status**: ✅ Ready to Use
**URL**: `/admin-marketplace`
**Access**: Admins & Reviewers Only

## 🚀 How to Access

### Method 1: From Admin Dashboard
1. Login as admin or reviewer
2. Navigate to Admin Dashboard
3. Click **"Marketplace"** button (top right, next to Review Queue)

### Method 2: Direct URL
1. Login as admin or reviewer
2. Navigate to: `http://localhost:4028/admin-marketplace`

## 📊 What You'll See

### Dashboard Overview
At the top of the page, you'll see 4 key statistics:

1. **Total Published** 🏢
   - Number of projects currently in marketplace
   
2. **Total Capacity** ⚡
   - Sum of all project capacities (in MW)
   
3. **Average Price** 💰
   - Average price across all projects ($/MWh)
   
4. **Total Interest** 👥
   - Number of investors interested in projects

### Published Projects List
Below the statistics, you'll see detailed cards for each published project showing:
- Project title and energy type
- Location and capacity
- Pricing and timeline
- Developer and landowner information
- Number of interested investors
- When it was published

## 🔍 How to Use Filters

### Quick Search
Type in the search box to filter by:
- Project title
- Location
- Developer name
- Landowner name

### Advanced Filters

**Energy Type**
- Select from: Solar, Wind, Hydro, Biomass, Geothermal
- Or leave as "All Types"

**Capacity Range**
- Set minimum MW (e.g., 50)
- Set maximum MW (e.g., 500)

**Price Range**
- Set minimum $/MWh (e.g., 40)
- Set maximum $/MWh (e.g., 60)

**Location**
- Type city or state name

### Applying Filters
1. Set your desired filters
2. Click **"Apply Filters"** button
3. Projects list updates immediately

### Clearing Filters
- Click **"Clear Filters"** to reset all filters
- Page shows all projects again

## 🎯 Common Tasks

### Task 1: View All Published Projects
1. Navigate to Admin Marketplace
2. Scroll through the project list
3. View statistics at the top

**Use Case**: Get overview of marketplace health

### Task 2: Find Solar Projects Over 50 MW
1. Set Energy Type: "Solar"
2. Set Min Capacity: "50"
3. Click "Apply Filters"

**Use Case**: Target specific project types

### Task 3: Check Project Details
1. Find the project you want to review
2. Click **"View Details"** button
3. Opens document review page for that project

**Use Case**: Deep dive into specific project

### Task 4: Search by Location
1. Type location in search box (e.g., "California")
2. Results filter automatically
3. See all California projects

**Use Case**: Geographic targeting

### Task 5: Find High-Interest Projects
1. Look at "Interest Count" on each project card
2. Higher numbers = more investor interest
3. Sort mentally by interest level

**Use Case**: Identify hot projects

## 💡 Tips & Tricks

### 🎨 Color Coding
Projects are color-coded by energy type:
- 🟡 **Yellow** = Solar
- 🔵 **Blue** = Wind
- 🔷 **Cyan** = Hydro
- 🟢 **Green** = Biomass
- 🟠 **Orange** = Geothermal

### 🔄 Refresh Data
- Click **"Refresh"** button to get latest data
- Useful after projects are newly published

### 📱 Mobile Friendly
- Works on tablets and phones
- Sidebar collapses automatically
- Touch-friendly buttons

### ⚡ Performance
- Search filters instantly (no delay)
- Client-side filtering = super fast
- Apply Filters fetches fresh data from server

## ❓ FAQ

### Q: Who can access this page?
**A**: Only administrators and reviewers (RE Sales Advisor, RE Analyst, RE Governance Lead)

### Q: When do projects appear here?
**A**: Immediately after the first reviewer publishes their review (new feature!)

### Q: Can I unpublish a project from here?
**A**: Not currently - use Admin Dashboard task management for that

### Q: Why don't I see any projects?
**A**: Either no projects have been published yet, or you have filters applied. Try clicking "Clear Filters"

### Q: What does "Interest Count" mean?
**A**: Number of investors who have expressed interest in that project

### Q: Can investors see this page?
**A**: No, this is admin/reviewer only. Investors see a different marketplace view

### Q: How often is data updated?
**A**: Data loads when you open the page. Click "Refresh" to get latest updates

### Q: Can I edit projects from here?
**A**: No, click "View Details" to go to document review page where you can review/manage the project

## 🎓 Tutorial Walkthrough

### Example: Finding High-Value Wind Projects

**Scenario**: You want to find wind projects over 100 MW priced under $50/MWh

**Steps**:
1. Navigate to Admin Marketplace
2. Set filters:
   - Energy Type: "Wind"
   - Min Capacity: "100"
   - Max Price: "50"
3. Click "Apply Filters"
4. Review the filtered results
5. Click "View Details" on interesting projects

**Expected Result**: List of wind projects meeting your criteria

### Example: Monitoring Market Growth

**Scenario**: Track marketplace growth over time

**Steps**:
1. Navigate to Admin Marketplace
2. Note the "Total Published" count
3. Check again later/next day
4. Compare numbers

**Insight**: Growing count = healthy marketplace

## 🐛 Troubleshooting

### Issue: Page Won't Load
**Solution**: 
- Check backend is running (should be on port 8000)
- Check browser console for errors
- Refresh the page

### Issue: No Projects Showing
**Solution**:
- Click "Clear Filters" to remove any active filters
- Check if any projects are actually published
- Click "Refresh" to reload data

### Issue: Filters Not Working
**Solution**:
- Make sure you clicked "Apply Filters" after setting them
- Try clearing filters and starting over
- Check if filter values are valid (e.g., min < max)

### Issue: "View Details" Doesn't Work
**Solution**:
- Check project has a valid land_id
- Ensure you have permissions for document review page
- Try refreshing the page

### Issue: Statistics Show Zero
**Solution**:
- This is normal if no projects are published yet
- Publish a project review to see stats populate
- Refresh the page

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Look at browser console (F12)
3. Verify backend is running
4. Check your user role permissions
5. Contact system administrator

## 🎉 Success Indicators

You're using it right if you can:
- ✅ See published projects list
- ✅ Filter projects by different criteria
- ✅ View project details
- ✅ Understand marketplace statistics
- ✅ Navigate back to admin dashboard

## 🔗 Related Pages

- **Admin Dashboard**: Main admin control panel
- **Document Review**: Detailed project review page
- **Review Queue**: Projects waiting for review
- **Marketplace** (Investor): Public marketplace view

## 📚 Documentation

For more details, see:
- `documentation/ADMIN_MARKETPLACE_FEATURE.md` - Full technical documentation
- `context/2025-10-17_admin_marketplace_routing.md` - Implementation details

---

**Ready to explore?** Navigate to `/admin-marketplace` and start browsing published projects! 🚀

