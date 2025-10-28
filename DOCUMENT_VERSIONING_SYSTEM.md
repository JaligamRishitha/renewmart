# Document Versioning System

## Overview

The document versioning system provides comprehensive version management for landowner documents with full audit trail capabilities. This system ensures data integrity, traceability, and proper review workflow management.

## Key Features

### 1. Version Management
- **Multiple Versions**: Each document update creates a new version instead of replacing the old one
- **Version Numbering**: Automatic sequential version numbering (v1, v2, v3, etc.)
- **Status Tracking**: Each version has its own status (Active, Under Review, Archived, Locked)
- **Latest Version Indicator**: Clear marking of the most recent version

### 2. Review Lock System
- **Version Locking**: Once a version is assigned for review, it becomes locked
- **Review Isolation**: Locked versions remain unchanged even if newer versions are uploaded
- **Review Continuity**: Reviewers work with a specific locked version throughout the review process
- **Unlock Capability**: Administrators can unlock versions when needed

### 3. Audit Trail
- **Complete History**: Every action is recorded with timestamp, user, and reason
- **Action Types**: Upload, Review, Lock, Unlock, Archive, Approval/Rejection
- **User Tracking**: Full tracking of who performed each action
- **Change Reasons**: Optional reason fields for all actions
- **Review Feedback**: Captured feedback and comments for each version

### 4. Notification System
- **Assignment Notifications**: Automatic notifications when versions are assigned
- **Status Updates**: Notifications for status changes and review completion
- **Priority Handling**: Different notification levels based on assignment priority
- **User-Specific**: Notifications sent to assigned reviewers

## Components

### DocumentVersionAssignmentModal
- **Purpose**: Assign specific document versions to reviewers
- **Features**:
  - Role-based reviewer selection
  - Document type filtering
  - Version selection with status indicators
  - Priority and due date assignment
  - Assignment notes and instructions
  - Automatic version locking upon assignment

### AdminDocumentVersions
- **Purpose**: Comprehensive document version management interface
- **Features**:
  - Document type overview with version counts
  - Version listing with detailed information
  - Assignment management
  - Version history and audit trail
  - Lock/unlock/archive controls
  - Download capabilities

## API Endpoints

### Document Versions API
- `GET /documents/{landId}/status-summary` - Get document status overview
- `GET /documents/{landId}/versions/{documentType}` - Get versions for document type
- `POST /documents/{documentId}/lock` - Lock version for review
- `POST /documents/{documentId}/unlock` - Unlock version
- `POST /documents/{documentId}/archive` - Archive version
- `GET /documents/{documentId}/history` - Get version history
- `GET /documents/{documentId}/download` - Download specific version

### Document Assignment API
- `POST /document-assignments` - Create new assignment
- `GET /document-assignments/land/{landId}` - Get assignments for land
- `GET /document-assignments/reviewer/{reviewerId}` - Get reviewer assignments
- `PUT /document-assignments/{assignmentId}/status` - Update assignment status
- `POST /document-assignments/{assignmentId}/cancel` - Cancel assignment
- `POST /document-assignments/notify` - Send assignment notification

## Workflow Example

1. **Landowner Upload**: Landowner uploads `LandDeed_v1.pdf`
2. **Version Creation**: System creates version 1 with status "Active"
3. **Admin Assignment**: Admin assigns version 1 to RE Analyst for review
4. **Version Lock**: Version 1 is locked and status changes to "Under Review"
5. **New Upload**: Landowner uploads `LandDeed_v2.pdf` (updates)
6. **Version Creation**: System creates version 2 with status "Active"
7. **Review Continuity**: RE Analyst continues reviewing locked version 1
8. **Review Completion**: Version 1 review is completed with feedback
9. **Version Archive**: Version 1 is archived, version 2 can be assigned for review

## Benefits

### Data Integrity
- No data loss from overwrites
- Complete version history preservation
- Clear audit trail for compliance

### Review Accuracy
- Reviewers work with specific locked versions
- No confusion from mid-review updates
- Clear version identification

### Traceability
- Complete action history
- User accountability
- Change reason tracking

### Flexibility
- Multiple versions can coexist
- Administrators can manage version status
- Reviewers can choose to work with latest or assigned version

## Status Types

- **Active**: Available for assignment and review
- **Under Review**: Currently being reviewed (locked)
- **Archived**: No longer active but preserved for history
- **Locked**: Temporarily locked for specific operations

## Integration Points

- **Task Management**: Integrates with existing task assignment system
- **User Management**: Uses existing user roles and permissions
- **Notification System**: Leverages existing notification infrastructure
- **File Management**: Works with existing document upload system

This system provides a robust foundation for document management in renewable energy project workflows, ensuring data integrity and proper review processes.
