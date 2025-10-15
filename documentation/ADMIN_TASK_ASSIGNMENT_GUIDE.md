# Admin Task Assignment Guide

## 🎯 Overview
This guide explains how administrators can assign review tasks to different roles (RE Sales Advisor, RE Analyst, RE Governance Lead) for land projects submitted by landowners.

## 📋 Table of Contents
1. [Workflow](#workflow)
2. [How to Assign Reviewers](#how-to-assign-reviewers)
3. [Reviewer Roles & Responsibilities](#reviewer-roles--responsibilities)
4. [Task Types](#task-types)
5. [API Endpoints](#api-endpoints)

---

## Workflow

```
┌─────────────┐
│  Landowner  │
│  Submits    │
│  Project    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Admin Dashboard                             │
│  - Views all submitted projects                         │
│  - Projects appear in "Active Reviews" table           │
│  - Status: "Pending" for newly submitted projects       │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│          Admin Assigns Reviewers                         │
│  Clicks "Assign" button on unassigned project          │
│                                                          │
│  Selects:                                               │
│  1. Reviewer Role (RE Sales/Analyst/Governance)        │
│  2. Specific User from that role                       │
│  3. Task Type (Market Evaluation, Technical, etc.)     │
│  4. Description, Due Date, Priority                     │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│        Reviewer Receives Task                           │
│  - Task appears in their dashboard                      │
│  - They can review documents and update status          │
│  - Statuses: Pending → In Progress → Completed         │
└─────────────────────────────────────────────────────────┘
```

---

## How to Assign Reviewers

### Step 1: Access Admin Dashboard
1. Login as administrator
2. Navigate to `/admin-dashboard`
3. You'll see all submitted projects in the "Active Reviews" table

### Step 2: Identify Unassigned Projects
- Look for projects with:
  - **Assigned Reviewer**: "Unassigned"
  - **Reviewer Role**: "Pending Assignment"
  - **Blue "Assign" button** in the Actions column

### Step 3: Open Assignment Modal
1. Click the **"Assign"** button on any unassigned project
2. The Assignment Modal will open showing:
   - Project details (Title, Location, Landowner, Energy Type, Capacity)
   - Assignment form

### Step 4: Fill Assignment Form

#### Required Fields:

**1. Select Reviewer Role** *
Choose from:
- **RE Sales Advisor** - Market evaluation and investor alignment
- **RE Analyst** - Technical and financial feasibility analysis
- **RE Governance Lead** - Compliance, regulatory, and local authority validation

**2. Assign To** *
Select a specific user from the chosen role
- List updates based on selected role
- Shows user name and email

**3. Task Type** *
Choose the type of work:
- Market Evaluation
- Technical Analysis
- Financial Analysis
- Compliance Review
- Document Verification
- Site Assessment
- Regulatory Approval
- Environmental Review

#### Optional Fields:

**4. Task Description**
Enter detailed instructions, requirements, or notes for the reviewer

**5. Due Date**
Set a deadline for task completion

**6. Priority**
- Low Priority
- Medium Priority (default)
- High Priority
- Urgent

### Step 5: Submit Assignment
1. Review all entered information
2. Click **"Assign Reviewer"** button
3. Success notification will appear
4. Project status updates in the table
5. Task is created and assigned to the selected reviewer

---

## Reviewer Roles & Responsibilities

### 🎯 RE Sales Advisor

**Type of Work**: Market evaluation and investor alignment

**Required Documents to Review**:
- Land valuation reports
- Ownership documents
- Proposed sale contract

**Typical Tasks**:
- Market evaluation
- Investor outreach
- Pricing analysis
- Contract negotiation

**Goal**: Ensure the project is marketable and aligned with investor interests

---

### 🔬 RE Analyst

**Type of Work**: Technical and financial feasibility analysis

**Required Documents to Review**:
- Topographical surveys
- Grid connectivity details
- Financial models

**Typical Tasks**:
- Technical analysis
- Financial feasibility
- Site assessment
- Capacity calculations
- Grid connectivity review

**Goal**: Validate technical viability and financial returns

---

### ⚖️ RE Governance Lead

**Type of Work**: Compliance, regulatory, and local authority validation

**Required Documents to Review**:
- Zoning approvals
- Environmental impact assessment
- Government NOCs (No Objection Certificates)

**Typical Tasks**:
- Compliance review
- Regulatory approval verification
- Environmental review
- Legal documentation
- Local authority coordination

**Goal**: Ensure all legal, regulatory, and compliance requirements are met

---

## Task Types

| Task Type | Description | Typical Role |
|-----------|-------------|--------------|
| **Market Evaluation** | Assess market conditions and pricing | RE Sales Advisor |
| **Technical Analysis** | Review technical specifications and feasibility | RE Analyst |
| **Financial Analysis** | Analyze financial models and ROI | RE Analyst |
| **Compliance Review** | Verify regulatory compliance | RE Governance Lead |
| **Document Verification** | Validate all submitted documents | Any Role |
| **Site Assessment** | Evaluate physical site conditions | RE Analyst |
| **Regulatory Approval** | Confirm government approvals | RE Governance Lead |
| **Environmental Review** | Assess environmental impact | RE Governance Lead |

---

## API Endpoints

### Create Task (Assign Reviewer)

**Endpoint**: `POST /api/tasks`

**Request Body**:
```json
{
  "land_id": "uuid-of-land-project",
  "task_type": "technical_analysis",
  "description": "Review technical specifications and grid connectivity",
  "assigned_to": "uuid-of-reviewer",
  "due_date": "2025-11-15",
  "priority": "high"
}
```

**Response**:
```json
{
  "task_id": "uuid-of-task",
  "land_id": "uuid-of-land-project",
  "task_type": "technical_analysis",
  "status": "pending",
  "assigned_to": "uuid-of-reviewer",
  "assigned_by": "uuid-of-admin",
  "created_at": "2025-10-15T14:30:00",
  "due_date": "2025-11-15"
}
```

### Get All Tasks

**Endpoint**: `GET /api/tasks`

**Query Parameters**:
- `land_id` - Filter by land project
- `assigned_to` - Filter by assigned user
- `status` - Filter by status (pending, in_progress, completed)
- `task_type` - Filter by task type

### Get Tasks Assigned to User

**Endpoint**: `GET /api/tasks/assigned/me`

Returns all tasks assigned to the current logged-in user.

### Update Task Status

**Endpoint**: `PUT /api/tasks/{task_id}`

**Request Body**:
```json
{
  "status": "in_progress",
  "completion_notes": "Started technical review"
}
```

---

## Task Status Flow

```
┌─────────┐     ┌─────────────┐     ┌───────────┐
│ Pending │ --> │ In Progress │ --> │ Completed │
└─────────┘     └─────────────┘     └───────────┘
                       │
                       ▼
                 ┌───────────┐
                 │  On Hold  │
                 └───────────┘
```

**Status Definitions**:
- **Pending**: Task created, waiting to be started
- **In Progress**: Reviewer is actively working on the task
- **On Hold**: Task temporarily paused (requires admin action)
- **Completed**: Task finished successfully
- **Cancelled**: Task no longer needed

---

## Best Practices

### 1. **Assign Multiple Reviewers for Complex Projects**
For large projects, create separate tasks for each reviewer role:
```
Project: Arizona Solar Complex (150 MW)
├── Task 1: Market Evaluation → RE Sales Advisor
├── Task 2: Technical Analysis → RE Analyst
└── Task 3: Compliance Review → RE Governance Lead
```

### 2. **Set Realistic Deadlines**
- Market Evaluation: 3-5 days
- Technical Analysis: 5-7 days
- Compliance Review: 7-10 days

### 3. **Provide Clear Descriptions**
Include specific requirements:
```
"Review topographical survey for slope analysis and calculate optimal 
panel placement. Verify grid connectivity within 5km radius. Assess 
soil conditions for foundation requirements."
```

### 4. **Monitor Task Progress**
- Check task statuses regularly
- Follow up on overdue tasks
- Reassign if needed

### 5. **Parallel vs Sequential Review**
- **Parallel**: Assign all roles simultaneously for faster completion
- **Sequential**: Assign roles in order (Sales → Analyst → Governance) for dependencies

---

## Troubleshooting

### Issue: "Assign" button not visible
**Solution**: The project may already be assigned. Check the "Assigned Reviewer" column.

### Issue: No users available in "Assign To" dropdown
**Solution**: Ensure users with the selected role exist in the system. Contact system administrator to create reviewer accounts.

### Issue: Task creation fails
**Solution**: 
1. Verify the land project exists
2. Ensure you have administrator permissions
3. Check that the assigned user has the correct role
4. Verify backend API is running

### Issue: Reviewer can't see assigned task
**Solution**:
1. Verify the task was created successfully
2. Check the reviewer is logged in with correct credentials
3. Ensure the reviewer has the role matching the assignment

---

## Database Schema

### Tasks Table
```sql
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY,
    land_id UUID NOT NULL,
    task_type VARCHAR(100),
    description TEXT,
    assigned_to UUID,
    assigned_by UUID,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (land_id) REFERENCES lands(land_id),
    FOREIGN KEY (assigned_to) REFERENCES "user"(user_id),
    FOREIGN KEY (assigned_by) REFERENCES "user"(user_id)
);
```

### Task History Table
```sql
CREATE TABLE task_history (
    history_id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    changed_by UUID NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (changed_by) REFERENCES "user"(user_id)
);
```

---

## Next Steps

After assigning reviewers:
1. **Monitor Progress**: Check task statuses in admin dashboard
2. **Review Completed Tasks**: Verify reviewer findings
3. **Compile Results**: Gather all reviewer feedback
4. **Update Project Status**: Move to "Under Review" → "Approved" → "Published"
5. **Publish to Investors**: Once all reviews complete and approved

---

## Contact & Support

For issues or questions:
- Check the troubleshooting section above
- Review API documentation: `/api/docs`
- Contact system administrator

---

**Last Updated**: October 15, 2025
**Version**: 1.0

