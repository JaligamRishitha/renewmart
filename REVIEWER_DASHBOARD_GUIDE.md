# Reviewer Dashboard Implementation Guide

## Overview
The Reviewer Dashboard provides role-specific access to documents and task management for three key reviewer roles as defined in `Workflow.txt`:
- **RE Sales Advisor**: Market evaluation and investor alignment
- **RE Analyst**: Technical and financial feasibility analysis
- **RE Governance Lead**: Compliance, regulatory, and local authority validation

---

## 🎯 Key Features

### 1. **Role-Based Document Filtering**
Each reviewer role sees ONLY the documents relevant to their responsibilities:

| Role | Document Types | Purpose |
|------|---------------|---------|
| **RE Sales Advisor** | • Land valuation reports<br>• Ownership documents<br>• Proposed sale contract | Market evaluation and investor alignment |
| **RE Analyst** | • Topographical surveys<br>• Grid connectivity details<br>• Financial models | Technical and financial feasibility analysis |
| **RE Governance Lead** | • Zoning approvals<br>• Environmental impact assessment<br>• Government NOCs | Compliance, regulatory, and local authority validation |

### 2. **Task Management**
- View all tasks assigned to the logged-in reviewer
- See task details: type, description, priority, due date
- Update task status with notes
- Track progress with visual status indicators

### 3. **Status Updates**
Reviewers can update task status to:
- **Pending** (gray): Not yet started
- **In Progress** (blue): Currently working on
- **Delayed** (orange): Behind schedule
- **Completed** (green): Finished successfully
- **Rejected** (red): Issues found, requires attention

### 4. **Document Review**
- Download documents for offline review
- View document metadata (name, type, upload date)
- All documents are pre-filtered based on role

---

## 🛠️ Technical Implementation

### Files Created/Modified

#### **New File:**
- `frontend/src/pages/reviewer-dashboard/index.jsx`
  - Main reviewer dashboard component
  - Role-based document filtering logic
  - Task status update modal
  - Summary statistics

#### **Modified Files:**
1. **`frontend/src/Routes.jsx`**
   - Added `/reviewer-dashboard` route with `ReviewerRoute` protection

2. **`frontend/src/components/RoleBasedRedirect.jsx`**
   - Updated role-based redirect logic to send reviewers to `/reviewer-dashboard`

3. **`frontend/src/components/ProtectedRoute.jsx`**
   - Updated `getRoleDashboard()` helper function

4. **`frontend/src/pages/login/components/LoginForm.jsx`**
   - Updated login redirect logic for reviewer roles

5. **`backend/models/schemas.py`**
   - Fixed `TaskBase` schema (removed `title`, added `task_type`)
   - Updated `TaskUpdate` schema to match

---

## 📋 Document Type Configuration

### Backend Document Types (Must Match)

When uploading documents, use these exact document type values:

#### **For RE Sales Advisor:**
```
'land-valuation'
'land_valuation'
'ownership-documents'
'ownership_documents'
'sale-contract'
'sale_contract'
```

#### **For RE Analyst:**
```
'topographical-survey'
'topographical_survey'
'grid-connectivity'
'grid_connectivity'
'financial-model'
'financial_model'
```

#### **For RE Governance Lead:**
```
'zoning-approval'
'zoning_approval'
'environmental-assessment'
'environmental_assessment'
'government-noc'
'government_noc'
```

> **Note:** Both hyphenated and underscored formats are supported for compatibility.

---

## 🚀 Testing Workflow

### **Step 1: Setup Test Users**
Ensure you have users with the following roles in your database:
- `re_sales_advisor`
- `re_analyst`
- `re_governance_lead`

### **Step 2: Admin Assigns Task**
1. Login as **Administrator**
2. Go to **Admin Dashboard**
3. Click "Assign" button on a submitted project
4. Select reviewer role (e.g., RE Sales Advisor)
5. Select specific user to assign
6. Choose task type (e.g., Market Evaluation)
7. Set priority and due date
8. Submit assignment

### **Step 3: Reviewer Logs In**
1. Logout from admin account
2. Login as **RE Sales Advisor** (or other reviewer role)
3. Should automatically redirect to **Reviewer Dashboard**

### **Step 4: Reviewer Views Tasks**
- See all assigned tasks in "My Tasks" section
- View task details: type, description, priority, due date
- Check current status

### **Step 5: Reviewer Reviews Documents**
- Scroll to "Documents to Review" section
- See only documents relevant to your role
- Download documents for review
- Example: RE Sales Advisor sees land valuation, ownership, and sale contract documents

### **Step 6: Reviewer Updates Status**
1. Click "Update Status" button on a task
2. Select new status from dropdown
3. Add optional notes about the review
4. Click "Update Status" to save
5. Status updates in real-time

### **Step 7: Admin Monitors Progress**
- Admin can see updated task statuses in Admin Dashboard
- Track which reviewers have completed their work
- Publish land when all reviews are complete

---

## 🔄 Complete Workflow Example

```
1. Landowner uploads land details + documents
   ↓
2. Landowner submits for review
   ↓
3. Admin reviews submission
   ↓
4. Admin assigns tasks to reviewers:
   - RE Sales Advisor: Review market viability
   - RE Analyst: Review technical feasibility
   - RE Governance Lead: Review compliance
   ↓
5. Each reviewer logs in and sees:
   - Assigned task
   - Only relevant documents
   - Current status: "Pending"
   ↓
6. Reviewers update status:
   - RE Sales Advisor: "In Progress" → "Completed"
   - RE Analyst: "In Progress" → "Completed"
   - RE Governance Lead: "In Progress" → "Delayed" (with notes)
   ↓
7. Admin monitors all reviewer statuses
   ↓
8. Once all approved, Admin publishes land
   ↓
9. Investors can now see the land in marketplace
```

---

## 🎨 UI Components

### **Dashboard Header**
- Role title (e.g., "RE Sales Advisor Dashboard")
- Role description
- Refresh button

### **Summary Cards**
- Total Tasks
- In Progress Tasks
- Completed Tasks
- Documents to Review

### **My Tasks Section**
- List of all assigned tasks
- Task type badge
- Status badge with color coding
- Priority indicator
- Due date
- "Update Status" button

### **Documents to Review Section**
- Filterable table of documents
- Document name, type, upload date
- Download button for each document

### **Status Update Modal**
- Status dropdown
- Notes textarea
- Cancel/Submit buttons
- Loading state during submission

---

## 🔒 Security & Permissions

### **Access Control**
- Only users with `re_sales_advisor`, `re_analyst`, or `re_governance_lead` roles can access
- Each role sees ONLY their assigned documents
- Cannot modify other reviewers' tasks
- Cannot access documents outside their scope

### **Route Protection**
```javascript
<Route path="/reviewer-dashboard" element={
  <ReviewerRoute>
    <ReviewerDashboard />
  </ReviewerRoute>
} />
```

### **API Endpoints Used**
- `GET /api/tasks/assigned/me` - Get tasks assigned to current user
- `GET /api/documents/land/{land_id}` - Get documents for a land (filtered client-side)
- `PUT /api/tasks/{task_id}` - Update task status
- `GET /api/documents/download/{document_id}` - Download document

---

## 📊 Data Flow

```
User Login
    ↓
Authentication (JWT)
    ↓
Role Check (re_sales_advisor | re_analyst | re_governance_lead)
    ↓
Redirect to /reviewer-dashboard
    ↓
Fetch Tasks: taskAPI.getTasksAssignedToMe()
    ↓
For each task, fetch documents: documentsAPI.getDocuments(land_id)
    ↓
Client-side filter documents by role
    ↓
Display in dashboard
```

---

## 🐛 Troubleshooting

### **Issue: Reviewer sees no documents**
**Solutions:**
1. Check document `document_type` matches role mappings
2. Ensure documents are uploaded to the correct land
3. Verify task has `land_id` associated

### **Issue: Can't update task status**
**Solutions:**
1. Check user has correct reviewer role
2. Verify task is assigned to current user
3. Check backend `/api/tasks/{task_id}` endpoint is working
4. Ensure backend is restarted after schema changes

### **Issue: Wrong dashboard displayed**
**Solutions:**
1. Check user roles in database
2. Verify login redirect logic
3. Clear browser cache and cookies
4. Check `RoleBasedRedirect` component logic

### **Issue: All documents showing instead of filtered**
**Solutions:**
1. Verify `ROLE_DOCUMENTS` mapping in `reviewer-dashboard/index.jsx`
2. Check document type format (hyphen vs underscore)
3. Ensure filter logic is working correctly

---

## 🔮 Future Enhancements

Potential improvements for the reviewer dashboard:

1. **Real-time Notifications**
   - Get notified when new tasks are assigned
   - See updates from other reviewers

2. **Inline Document Viewer**
   - Preview PDFs and images without downloading
   - Add comments directly on documents

3. **Collaboration Tools**
   - Chat with admin about specific tasks
   - Request additional documents

4. **Advanced Filtering**
   - Filter tasks by status, priority, due date
   - Search documents by name or type

5. **Analytics**
   - Time spent on each task
   - Average completion time
   - Performance metrics

6. **Batch Actions**
   - Update multiple tasks at once
   - Download multiple documents

---

## 📞 Support

If you encounter any issues or need clarification:

1. Check the console for error messages
2. Verify backend logs for API errors
3. Ensure all migrations are up to date
4. Confirm user roles are correctly assigned in database

---

**Last Updated:** October 15, 2025  
**Version:** 1.0.0

