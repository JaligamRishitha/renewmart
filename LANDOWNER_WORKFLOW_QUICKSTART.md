# 🚀 Landowner Dashboard - Quick Start Guide

## What's New?

The landowner dashboard now follows the complete workflow from **Workflow.txt**:
- ✅ Upload land details in accordion-style sections
- ✅ Save as Draft (visible to admin in view-only)  
- ✅ Submit for Admin Review
- ✅ Track status through workflow stages

## Quick Visual Guide

### Status Badges You'll See:

```
📝 Draft             - Gray badge, FileText icon
                       "Not submitted - visible to admin"
                       Actions: Continue | Submit

⏳ Under Review      - Blue badge, Clock icon
                       "Submitted - admin reviewing"
                       Actions: View Only

🔍 In Review         - Yellow badge, Search icon
                       "Admin assigned sections"
                       Actions: View Only

✅ Approved          - Green badge, CheckCircle icon
                       "Ready for publishing"
                       Actions: View Only

🌐 Published         - Primary badge, Globe icon
                       "Visible to investors"
                       Actions: View Interest

💰 RTB               - Emerald badge, DollarSign icon
                       "Ready to Buy - Final status"
                       Actions: View Interest

🔒 Interest Locked   - Purple badge, Lock icon
                       "Investor expressed interest"
                       Actions: View Details
```

## How to Use

### 1. Upload New Land

**Click:** "Upload Land Details" button (top right)

This takes you to document upload page with accordion sections:
- Land details
- Ownership documents  
- Survey reports
- Financial models
- Compliance documents

### 2. Save as Draft

**What happens:**
- ✅ Your data is saved
- ✅ Admin can VIEW your draft (read-only)
- ❌ Admin CANNOT take action yet
- ✅ You can continue editing

**Status shows:** 📝 Draft

### 3. Submit for Review

**When ready:**
- Click "Submit" button next to your draft
- Success notification appears
- Status changes to "Under Review"

**Status shows:** ⏳ Under Review

### 4. Wait for Admin Review

**Admin workflow:**
1. Reviews your submission
2. Assigns sections to specialists:
   - 💼 RE Sales Advisor - Market evaluation
   - 📊 RE Analyst - Technical analysis
   - 📋 RE Governance Lead - Compliance

**Status shows:** 🔍 In Review

### 5. Track Progress

**Once approved:**
- Status: ✅ Approved
- Admin publishes to investors
- Status: 🌐 Published

**Final stages:**
- Admin completes all approvals
- Status: 💰 RTB (Ready to Buy)
- Investor shows interest
- Status: 🔒 Interest Locked

## Actions Available

### For Draft Projects:

| Action | Description |
|--------|-------------|
| **Continue** | Resume editing your draft |
| **Submit** | Submit for admin review |
| **View** | See project details |
| **Edit** | Modify project info |

**Example:**
```
Mountain View Solar    📝 Draft
[Continue] [Submit] [View] [Edit]
```

### For Under Review Projects:

| Status | What It Means |
|--------|---------------|
| **⏳ Awaiting Review** | Admin hasn't reviewed yet |

**Example:**
```
Green Valley Hydro    ⏳ Under Review
⏳ Awaiting Admin Review [View]
```

### For Published Projects:

| Action | Description |
|--------|-------------|
| **View Interest** | See which investors are interested |
| **View** | See project details |

**Example:**
```
Sunrise Solar Farm    🌐 Published
[View Interest] [View]
```

## Workflow Flow Chart

```
┌─────────────────┐
│  Upload Land    │
│    Details      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   Save Draft    │────▶│ Continue     │
│   📝 Gray       │     │ Editing      │
└────────┬────────┘     └──────────────┘
         │
         │ Click "Submit"
         ▼
┌─────────────────┐
│  Under Review   │
│   ⏳ Blue       │
└────────┬────────┘
         │
         │ Admin reviews
         ▼
┌─────────────────┐
│   In Review     │ ← Admin assigns sections
│   🔍 Yellow     │    to reviewers
└────────┬────────┘
         │
         │ Reviews complete
         ▼
┌─────────────────┐
│    Approved     │
│   ✅ Green      │
└────────┬────────┘
         │
         │ Admin publishes
         ▼
┌─────────────────┐
│   Published     │ ← Visible to
│   🌐 Primary    │    investors
└────────┬────────┘
         │
         │ All approvals done
         ▼
┌─────────────────┐     ┌──────────────┐
│      RTB        │────▶│   Interest   │
│   💰 Emerald    │     │   Locked     │
└─────────────────┘     │  🔒 Purple   │
                        └──────────────┘
```

## Sample Projects in Dashboard

### Example 1: Draft (Not Submitted)
```
🏠 Mountain View Solar
📝 Draft - Not yet submitted (visible to admin)
📍 Phoenix, Arizona | ☀️ Solar | ⚡ 18.2 MW
🗓️ Updated: Jan 3, 2025

Actions: [Continue Draft] [Submit] [View] [Edit]
```

### Example 2: Under Admin Review
```
🏠 Green Valley Hydro
⏳ Under Review - Submitted - admin reviewing
📍 Denver, Colorado | 💧 Hydroelectric | ⚡ 12.8 MW
🗓️ Updated: Jan 5, 2025

⏳ Awaiting Admin Review [View]
```

### Example 3: Published to Investors
```
🏠 Sunrise Solar Farm
🌐 Published - Visible to investors
📍 Austin, Texas | ☀️ Solar | ⚡ 25.5 MW
🗓️ Updated: Jan 10, 2025

Actions: [View Investor Interest] [View]
```

### Example 4: Ready to Buy
```
🏠 Prairie Wind Project
💰 RTB - Ready to Buy - All approvals completed
📍 Oklahoma City | 🌬️ Wind | ⚡ 45.0 MW
🗓️ Updated: Jan 8, 2025

Actions: [View Investor Interest] [View]
```

## Tips & Best Practices

### ✅ DO:
- Save drafts frequently
- Review all sections before submitting
- Wait for admin review (don't edit while under review)
- Check notifications for updates
- Monitor investor interest on published projects

### ❌ DON'T:
- Submit incomplete information
- Edit while under review (not allowed)
- Expect immediate admin response
- Ignore notification updates

## Keyboard Shortcuts (Future)

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New project |
| `Ctrl + S` | Save draft |
| `Ctrl + Enter` | Submit for review |
| `Escape` | Close modal/dropdown |

## Mobile Experience

### On Mobile Devices:
- ✅ Full-width action buttons
- ✅ Stacked layout for better touch
- ✅ Swipe gestures (coming soon)
- ✅ Optimized for small screens

**Example Mobile View:**
```
┌─────────────────────────┐
│  🏠 Mountain View Solar │
│  📝 Draft               │
│  📍 Phoenix, AZ         │
│  ⚡ 18.2 MW             │
├─────────────────────────┤
│ [Continue Draft]  ████  │
│ [Submit for Review]████ │
│ [View Details]     ████ │
│ [Edit]             ████ │
└─────────────────────────┘
```

## Notifications

### You'll Receive Notifications When:
- ✅ Draft successfully saved
- ✅ Project submitted for review
- ✅ Admin approved your project
- ✅ Project published to investors
- ✅ Investor expresses interest
- ✅ Status changes to RTB

**Example Notification:**
```
┌──────────────────────────────────┐
│ ✅ Submitted for Review          │
│ Mountain View Solar has been     │
│ submitted for admin review.      │
│ You'll be notified once reviewed.│
└──────────────────────────────────┘
```

## Quick Actions Menu

**Bottom right corner:** Quick Actions button

Available actions:
- 📝 New project
- 💾 Save draft
- 📤 Submit for review
- 🔄 Refresh data

## Getting Help

### Need Assistance?
1. **In-app Help**: Click "Help" in header menu
2. **Live Chat**: Bottom right chat icon (coming soon)
3. **Email Support**: support@landinvest.pro
4. **Phone**: 1-800-LAND-PRO

## Frequently Asked Questions

**Q: Can admin see my drafts?**  
A: Yes, but in **view-only mode**. They cannot take action until you submit.

**Q: Can I edit after submitting?**  
A: No, once submitted you must wait for admin review.

**Q: How long does review take?**  
A: Typically 3-5 business days, depending on complexity.

**Q: What happens when investor shows interest?**  
A: Your land becomes "Interest Locked" and hidden from other investors.

**Q: Can I have multiple drafts?**  
A: Yes, unlimited drafts! Submit when ready.

**Q: What's the difference between Published and RTB?**  
A: Published = visible to investors. RTB = all approvals completed, final status.

---

## Summary

✅ **Upload** → Save as Draft → **Submit** → Wait for Review → Get Approved → **Published** → RTB 🎉

**Ready to get started?** Click "Upload Land Details" and begin your renewable energy project journey!

🚀 **Happy submitting!**

