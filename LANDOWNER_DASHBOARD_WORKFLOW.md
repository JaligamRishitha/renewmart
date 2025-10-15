# ✅ Landowner Dashboard - Workflow Implementation

## Overview

Updated the landowner dashboard according to **Workflow.txt** requirements to properly reflect the land submission and review workflow.

## Workflow States (from Workflow.txt)

### 1. **Draft** 📝
- **Status**: Not submitted for admin review
- **Visibility**: Visible to admin in **view-only mode**
- **Actions**: 
  - Continue editing
  - Submit for review
- **Rule**: Admin cannot take action until submitted

### 2. **Under Review** ⏳
- **Status**: Submitted for admin review
- **Visibility**: Admin can now review and take action
- **Actions**: 
  - View details (landowner cannot edit)
  - Wait for admin response
- **Rule**: Landowner waits for admin to review

### 3. **In Review** 🔍
- **Status**: Admin reviewing, sections assigned to reviewers
- **Visibility**: Review roles working on assigned sections
- **Actions**: View progress
- **Assigned Roles**:
  - `re_sales_advisor` - Market evaluation
  - `re_analyst` - Technical & financial analysis  
  - `re_governance_lead` - Compliance & regulatory

### 4. **Approved** ✅
- **Status**: Admin approved, ready for publishing
- **Visibility**: Admin can publish to investors
- **Actions**: View details

### 5. **Published** 🌐
- **Status**: Visible to investors
- **Visibility**: All investors can see
- **Actions**: View investor interest
- **Rule**: Available for investor interest

### 6. **RTB (Ready to Buy)** 💰
- **Status**: All approvals completed, final status
- **Visibility**: Fully approved and ready for purchase
- **Actions**: View and track investor interest
- **Note**: Final status after all approvals satisfied

### 7. **Interest Locked** 🔒
- **Status**: Investor expressed interest
- **Visibility**: Hidden from other investors
- **Actions**: View specific investor details
- **Rule**: When investor shows interest, parcel is hidden from others to avoid ambiguity

## Changes Implemented

### 1. Updated Status Badges (`components/StatusBadge.jsx`)

**Added all workflow statuses with icons:**
```javascript
- draft         → FileText icon (gray)
- under-review  → Clock icon (blue)
- in-review     → Search icon (yellow)
- approved      → CheckCircle icon (green)
- published     → Globe icon (primary)
- rtb           → DollarSign icon (emerald)
- interest-locked → Lock icon (purple)
```

**Visual Design:**
- Each status has unique color scheme
- Icons provide visual context
- Descriptions for clarity

### 2. Updated Project Table (`components/ProjectTable.jsx`)

**Actions by Status:**

| Status | Actions Available |
|--------|------------------|
| Draft | "Continue Draft" + "Submit for Review" |
| Under Review | "Awaiting Admin Review" (no edit) |
| In Review | View only |
| Approved | View only |
| Published | "View Investor Interest" |
| RTB | "View Investor Interest" |
| Interest Locked | "View Investor Details" |

**Key Features:**
- **Submit for Review Button**: Primary action for drafts
- **Status-based Actions**: Different actions per workflow state
- **Mobile Responsive**: Optimized layout for mobile devices
- **Clear Messaging**: Status indicators show what's happening

### 3. Updated Main Dashboard (`index.jsx`)

**New Features:**
- `handleSubmitForReview()` - Submits draft to admin
- Success notifications on submission
- Updated project IDs: `LAND-001` format (instead of PRJ)
- Workflow-aware descriptions

**Updated Mock Data:**
```javascript
- LAND-001: Published (visible to investors)
- LAND-002: RTB (ready to buy)
- LAND-003: Under Review (awaiting admin)
- LAND-004: Draft (not submitted)
- LAND-005: In Review (admin reviewing)
- LAND-006: Interest Locked (investor interested)
```

**Updated UI Text:**
- Button: "Upload Land Details" (was "Add New Project")
- Description: "Upload land details, save as drafts, and submit for admin review"
- Info: "Drafts are visible to admins in view-only mode until submitted"

## User Experience Flow

### Landowner Workflow:

```
1. Upload Land Details
   ↓
2. Save as Draft (visible to admin in view-only)
   ↓
3. Continue editing until ready
   ↓
4. Submit for Admin Review
   ↓
5. Wait for admin to review
   ↓
6. Admin assigns sections to reviewers
   ↓
7. Admin approves and publishes
   ↓
8. Investors can view and express interest
   ↓
9. Status moves to RTB (Ready to Buy)
```

### Key Actions:

**For Draft Projects:**
- ✅ Continue editing
- ✅ Submit for review
- ℹ️ Admin can view but not act

**For Under Review:**
- ⏳ Wait for admin review
- 👁️ View details only
- ❌ Cannot edit while reviewing

**For Published/RTB:**
- 👥 View investor interest
- 📊 Track engagement
- 💰 Monitor progress

## Components Structure

```
landowner-dashboard/
├── index.jsx                 # Main dashboard container
├── components/
│   ├── StatusBadge.jsx      # Status badges with workflow states
│   ├── ProjectTable.jsx     # Table with workflow actions
│   ├── ProjectSummaryCards.jsx
│   ├── ProjectFilters.jsx
│   └── EmptyState.jsx
```

## Visual Design

### Status Colors:
- **Draft**: Gray (#gray-700) - Not submitted
- **Under Review**: Blue (#blue-700) - Submitted
- **In Review**: Yellow (#yellow-700) - Admin reviewing
- **Approved**: Green (#green-700) - Ready to publish
- **Published**: Primary color - Live to investors
- **RTB**: Emerald (#emerald-700) - Final approved
- **Interest Locked**: Purple (#purple-700) - Investor interest

### Action Buttons:
- **Continue** - Outline style, Edit icon
- **Submit** - Primary style, Send icon (emphasized)
- **View Interest** - Outline style, Users icon
- **Awaiting Review** - Text with Clock icon (non-interactive)

## API Integration Points

### When Implementing Backend:

1. **Submit for Review Endpoint:**
```javascript
POST /api/lands/:id/submit
Body: { landId: string }
Response: { status: 'under-review', message: 'Submitted successfully' }
```

2. **Get Projects Endpoint:**
```javascript
GET /api/lands/my-projects
Response: { projects: [...] }
```

3. **Update Project Status:**
```javascript
// Admin updates status via their dashboard
PUT /api/lands/:id/status
Body: { status: 'approved' | 'published' | 'rtb' }
```

## Testing

### Test Scenarios:

**1. Draft Workflow:**
- [ ] Create new land entry
- [ ] Save as draft
- [ ] Verify "Draft" status badge shows
- [ ] Verify "Continue" and "Submit" buttons appear
- [ ] Click Submit
- [ ] Verify success notification
- [ ] Verify status changes to "Under Review"

**2. Under Review State:**
- [ ] Verify "Awaiting Admin Review" shows
- [ ] Verify cannot edit
- [ ] Verify can only view details

**3. Published State:**
- [ ] Verify "View Investor Interest" button shows
- [ ] Click to view interest
- [ ] Verify proper navigation

**4. Status Badge Display:**
- [ ] All statuses show correct icons
- [ ] Colors match workflow states
- [ ] Mobile and desktop views work

## Mobile Responsiveness

✅ **Desktop View**: Horizontal actions layout  
✅ **Mobile View**: Stacked actions, full-width buttons  
✅ **Tablets**: Adaptive layout  
✅ **Touch-friendly**: Larger touch targets  

## Notifications

### Success Notifications:
```javascript
{
  type: 'success',
  title: 'Submitted for Review',
  message: '[Project Name] has been submitted for admin review. You'll be notified once reviewed.'
}
```

### Features:
- Auto-dismiss after 8 seconds
- Position: top-right
- Green background for success
- Clear messaging

## Workflow Rules (from Workflow.txt)

### ✅ Draft Mode Rule:
> "Documents visible to Admin in view-only mode. No action by Admin until submission."

**Implementation:**
- Drafts show as "Draft" status
- Landowner can continue editing
- Submit button prominently displayed
- Admin sees but cannot act (not implemented in landowner view)

### ✅ Investor Interest Rule:
> "If an investor expresses interest in a land parcel, that parcel is hidden from other investors to avoid ambiguity"

**Implementation:**
- "Interest Locked" status with Lock icon
- Purple color to highlight exclusivity
- Description: "Investor expressed interest"
- Hidden from other investors (backend logic)

## Summary of Changes

| File | Changes |
|------|---------|
| `StatusBadge.jsx` | Added 7 workflow statuses with icons & colors |
| `ProjectTable.jsx` | Added Submit action, status-based buttons, view interest |
| `index.jsx` | Added submit handler, updated mock data, workflow descriptions |

## Benefits

✅ **Clear Workflow**: Landowners understand each stage  
✅ **Action-Oriented**: Obvious next steps at each status  
✅ **Visual Feedback**: Icons and colors convey state  
✅ **Admin-Friendly**: Drafts visible but protected  
✅ **Investor Ready**: RTB status clearly marked  
✅ **Mobile Optimized**: Works on all devices  

## Next Steps

### For Complete Implementation:

1. **Backend API**:
   - Implement submit for review endpoint
   - Add status update endpoints
   - Implement visibility rules for drafts

2. **Admin Dashboard**:
   - View-only mode for drafts
   - Review and approval workflow
   - Section assignment to reviewers

3. **Reviewer Dashboards**:
   - RE Sales Advisor view
   - RE Analyst view
   - RE Governance Lead view

4. **Investor Portal**:
   - View published lands
   - Express interest
   - Hide lands when interest is locked

## Quick Reference

### Status Flow:
```
Draft → Under Review → In Review → Approved → Published → RTB
                                                    ↓
                                            Interest Locked
```

### Landowner Actions:
```
Draft:          Continue | Submit
Under Review:   View Only
In Review:      View Only
Approved:       View Only
Published:      View Interest
RTB:            View Interest
Interest Locked: View Details
```

---

**The landowner dashboard now fully implements the Workflow.txt requirements!** 🎉

