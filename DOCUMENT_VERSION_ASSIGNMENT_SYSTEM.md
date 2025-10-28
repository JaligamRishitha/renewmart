# Document Version Assignment and Locking System

## Overview

This document describes the new document version assignment and locking system implemented for the RenewMart platform. This system allows administrators to assign specific document versions to reviewers, lock documents during review, and manage the review workflow efficiently.

## Features Implemented

### 1. Document Version Assignment
- **Specific Version Assignment**: Admins can assign specific document versions (not just the latest) to reviewers
- **Multi-Document Assignment**: Assign multiple document versions to a single reviewer in one operation
- **Role-Based Assignment**: Assign documents to reviewers based on their roles (RE Sales Advisor, RE Analyst, RE Governance Lead)
- **Assignment Tracking**: Track assignment status, due dates, priority levels, and notes

### 2. Document Locking Mechanism
- **Automatic Locking**: Documents are automatically locked when assigned to reviewers
- **Version-Specific Locking**: Only the assigned version is locked, other versions remain available
- **Lock Status Tracking**: Track who locked the document, when, and why
- **Unlock Capability**: Admins can unlock documents when needed

### 3. Admin Interface Enhancements
- **Document Version Viewer**: Admins can view all document versions similar to landowner view
- **Assignment Management**: View and manage all document assignments for a project
- **Status Overview**: See assignment status, reviewer information, and due dates
- **Bulk Operations**: Assign multiple document versions at once

### 4. Notification System
- **New Version Notifications**: Admins are notified when landowners upload new document versions
- **Assignment Notifications**: Reviewers are notified when documents are assigned to them
- **Status Change Notifications**: Notifications for assignment status changes and document unlocks

## Database Schema

### New Table: `document_assignments`

```sql
CREATE TABLE document_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL,
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    assignment_status VARCHAR(50) DEFAULT 'assigned',
    assignment_notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium',
    is_locked BOOLEAN DEFAULT TRUE,
    lock_reason TEXT
);
```

### Updated Document Model
The existing `documents` table already includes version control fields:
- `version_number`: Version number of the document
- `is_latest_version`: Whether this is the latest version
- `version_status`: Status (active, under_review, archived, locked)
- `review_locked_at`: When the document was locked
- `review_locked_by`: Who locked the document

## API Endpoints

### Document Assignment Endpoints

#### Assign Document to Reviewer
```http
POST /api/document-assignments/assign
```
**Body:**
```json
{
  "document_id": "uuid",
  "assigned_to": "uuid",
  "reviewer_role": "re_analyst",
  "assignment_notes": "Please review for technical accuracy",
  "due_date": "2025-02-01T00:00:00Z",
  "priority": "high"
}
```

#### Get Land Document Assignments
```http
GET /api/document-assignments/land/{land_id}
```

#### Get Reviewer Assignments
```http
GET /api/document-assignments/reviewer/{reviewer_id}?status_filter=assigned
```

#### Update Assignment
```http
PUT /api/document-assignments/{assignment_id}
```

#### Cancel Assignment
```http
DELETE /api/document-assignments/{assignment_id}?reason=No longer needed
```

#### Get Available Documents
```http
GET /api/document-assignments/land/{land_id}/available-documents
```

### Document Version Endpoints

#### Get Document Versions
```http
GET /api/document-versions/land/{land_id}/document-type/{document_type}
```

#### Lock Document for Review
```http
POST /api/document-versions/{document_id}/lock-for-review?reason=Assigned for review
```

#### Unlock Document
```http
POST /api/document-versions/{document_id}/unlock?reason=Review completed
```

#### Get Document Status Summary
```http
GET /api/document-versions/land/{land_id}/status-summary
```

## Frontend Components

### 1. DocumentVersionAssignmentModal
- **Location**: `frontend/src/pages/admin-dashboard/components/DocumentVersionAssignmentModal.jsx`
- **Purpose**: Modal for assigning specific document versions to reviewers
- **Features**:
  - Select reviewer role and specific user
  - Choose multiple document versions to assign
  - Set assignment notes, due date, and priority
  - View document version details and current assignment status

### 2. AdminDocumentVersions
- **Location**: `frontend/src/pages/admin-dashboard/components/AdminDocumentVersions.jsx`
- **Purpose**: View and manage all document versions for a project
- **Features**:
  - Browse document types and versions
  - View assignment details and status
  - See document version history
  - Manage assignments and locks

### 3. Updated TaskTable
- **Location**: `frontend/src/pages/admin-dashboard/components/TaskTable.jsx`
- **New Features**:
  - "Assign Documents" button for document version assignment
  - "View Document Versions" button for viewing document versions
  - Integration with new assignment workflow

## Workflow

### 1. Document Upload Workflow
1. Landowner uploads a new document version
2. System automatically sends notification to admins
3. Document version is marked as "active" and "latest"
4. Previous versions remain available but marked as not latest

### 2. Document Assignment Workflow
1. Admin opens "Assign Documents" modal for a project
2. System loads all available document versions
3. Admin selects specific versions to assign
4. Admin chooses reviewer role and specific user
5. Admin sets assignment details (notes, due date, priority)
6. System creates assignment records and locks documents
7. Reviewers receive notifications about new assignments

### 3. Review Workflow
1. Reviewer receives notification about assigned documents
2. Reviewer can view assigned document versions
3. Reviewer updates assignment status (in_progress, completed)
4. System tracks review progress and completion
5. Admin can unlock documents when review is complete

### 4. New Version Upload During Review
1. Landowner uploads new version of assigned document
2. System sends notification to admin about new version
3. Admin can choose to:
   - Assign new version to same reviewer
   - Assign new version to different reviewer
   - Keep existing assignment unchanged

## Migration Instructions

### 1. Database Migration
Run the migration script to create the new table:
```bash
cd backend
python run_document_assignment_migration.py
```

### 2. Backend Setup
The new API endpoints are automatically available when the backend starts. No additional configuration needed.

### 3. Frontend Setup
The new components are integrated into the admin dashboard. No additional setup required.

## Usage Examples

### Assigning Document Versions
1. Navigate to Admin Dashboard
2. Find a project in the task table
3. Click "Assign Documents" button
4. Select document versions to assign
5. Choose reviewer role and user
6. Set assignment details
7. Click "Assign Documents"

### Viewing Document Versions
1. Navigate to Admin Dashboard
2. Find a project in the task table
3. Click "View Document Versions" button
4. Browse document types and versions
5. View assignment details and status
6. Manage assignments as needed

### Managing Assignments
1. Open document versions view
2. Switch to "Assignments" tab
3. View all assignments for the project
4. Update assignment status or cancel assignments
5. Unlock documents when reviews are complete

## Security Considerations

- **Admin Only**: Document assignment and locking features are restricted to administrators
- **Role Validation**: System validates that assigned users have the correct reviewer role
- **Permission Checks**: All operations include proper permission validation
- **Audit Trail**: All assignment and locking actions are logged for audit purposes

## Performance Considerations

- **Indexed Queries**: Database indexes are created for efficient querying
- **Lazy Loading**: Document versions are loaded on-demand
- **Caching**: Assignment data is cached for better performance
- **Batch Operations**: Multiple assignments can be created in a single operation

## Future Enhancements

1. **Bulk Assignment**: Assign multiple document types to multiple reviewers
2. **Assignment Templates**: Predefined assignment templates for common scenarios
3. **Review Deadlines**: Automatic reminders for approaching deadlines
4. **Review Comments**: Allow reviewers to add comments to assigned documents
5. **Assignment History**: Detailed history of all assignment changes
6. **Integration with Tasks**: Link document assignments with existing task system

## Troubleshooting

### Common Issues

1. **Documents Not Showing**: Ensure the land has uploaded documents
2. **Assignment Fails**: Check that the user has the correct reviewer role
3. **Lock Issues**: Verify document is not already assigned to another reviewer
4. **Notification Issues**: Check notification service configuration

### Debug Information

- Check browser console for frontend errors
- Check backend logs for API errors
- Verify database table exists and has correct structure
- Ensure all required environment variables are set

## Support

For technical support or questions about the document version assignment system, please contact the development team or refer to the API documentation at `/docs` when the backend is running.
