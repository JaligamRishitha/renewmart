# RenewMart Application Modules Documentation

This document provides a comprehensive overview of all modules in the RenewMart application, along with their key features.

---

## 1. Authentication Module (`/api/auth`)

**Purpose:** Handles user authentication, registration, and password management.

### Features:
1. **User Registration** - Register new users with email verification (pre-registration and post-registration verification)
2. **JWT Token Authentication** - Secure login with OAuth2 password flow and JWT token generation
3. **Email Verification** - Send and verify email verification codes with Redis-based temporary storage
4. **Password Reset** - Request, verify, and reset passwords with secure code-based workflow
5. **Current User Profile** - Retrieve authenticated user's profile information

---

## 2. Users Module (`/api/users`)

**Purpose:** Manages user accounts, profiles, and role assignments.

### Features:
1. **User Profile Management** - View and update user profiles (name, email, phone, address)
2. **Role-Based Access Control** - Assign and manage user roles (administrator, investor, landowner, reviewers)
3. **User Listing & Search** - List users with filtering by role, pagination support
4. **Admin User Creation** - Administrators can create users with predefined roles
5. **User Access Control** - View user information based on shared projects and relationships

---

## 3. Lands/Projects Module (`/api/lands`)

**Purpose:** Manages renewable energy land listings and project information.

### Features:
1. **Project Creation & Management** - Create, update, and manage land/project listings with comprehensive details
2. **Project Status Workflow** - Manage project lifecycle (draft, submitted, under_review, approved, published, ready_to_buy)
3. **Admin Dashboard** - View all projects with filters, investor interest counts, and reviewer assignment status
4. **Project Search & Filtering** - Search projects by location, energy type, capacity, status, and other criteria
5. **Project Export** - Export project data to Excel and PDF formats for reporting

---

## 4. Documents Module (`/api/documents`)

**Purpose:** Handles document upload, storage, and management for land projects.

### Features:
1. **Document Upload** - Upload documents with support for multiple file types (PDF, DOC, images) up to 10MB
2. **Document Versioning** - Automatic version tracking for non-draft lands with parent-child relationships
3. **Document Review System** - Role-based document access with reviewer-specific document filtering
4. **Document Approval/Rejection** - Admin approval workflow with comments and rejection reasons
5. **Document Download** - Secure document download with permission checks and binary storage support

---

## 5. Tasks Module (`/api/tasks`)

**Purpose:** Manages task assignment, tracking, and completion for project reviews.

### Features:
1. **Task Creation & Assignment** - Create tasks and assign them to reviewers with roles (re_sales_advisor, re_analyst, re_governance_lead)
2. **Subtask Management** - Create and manage subtasks with default templates based on reviewer roles
3. **Task Status Tracking** - Track task progress (pending, in_progress, completed, cancelled, on_hold) with history
4. **Task Collaboration** - Assign subtasks to different reviewers for cross-functional collaboration
5. **Task Statistics** - Get task statistics including pending, in-progress, completed, and overdue tasks

---

## 6. Investors Module (`/api/investors`)

**Purpose:** Manages investor interests, withdrawals, and master sales advisor assignments.

### Features:
1. **Express Interest** - Investors can express interest in published lands with NDA and CTA acceptance
2. **Interest Management** - View, update, and manage investor interests with status tracking (pending, approved, rejected)
3. **Withdrawal Requests** - Investors can request withdrawal with reason, requiring master sales advisor approval
4. **Master Sales Advisor Assignment** - Admin assigns master sales advisors to projects for investor interest management
5. **Investor Dashboard** - Dashboard with metrics, interest trends, and project type distribution

---

## 7. Reviews Module (`/api/reviews`)

**Purpose:** Manages review status and completion for different reviewer roles.

### Features:
1. **Review Status Tracking** - Save and track review status for each reviewer role (re_sales_advisor, re_analyst, re_governance_lead)
2. **Review Completion Metrics** - Track subtasks completed, documents approved, and overall review progress
3. **Review Publishing** - Publish reviews and auto-publish lands to marketplace when reviews are complete
4. **Multi-Role Review Management** - Get all review statuses for a land across all three reviewer roles
5. **Review History** - Track review changes and approval/rejection history with timestamps

---

## 8. Messaging Module (`/api/messaging`)

**Purpose:** Real-time messaging system for task-based communication.

### Features:
1. **Task-Based Messaging** - Send and receive messages within task contexts with thread support
2. **Real-Time Communication** - WebSocket-based real-time messaging with message history
3. **Message Threading** - Organize messages into threads for better conversation management
4. **Message Search** - Search messages by content with optional task filtering
5. **Message Statistics** - Get message counts, unread counts, and user messaging statistics

---

## 9. Notifications Module (`/api/notifications`)

**Purpose:** System notifications for user activities and events.

### Features:
1. **Notification Creation** - Create notifications for various events (task assignment, document upload, subtask assignment)
2. **Notification Retrieval** - Get user notifications with filtering (unread only, pagination)
3. **Notification Management** - Mark notifications as read (individual or bulk), delete notifications
4. **Unread Count** - Get unread notification count for real-time badge updates
5. **Notification Categories** - Categorize notifications (task, project, document, collaboration)

---

## 10. Document Versions Module (`/api/document-versions`)

**Purpose:** Manages document version history and review workflow.

### Features:
1. **Version History** - View all versions of a document type for a land with version numbers
2. **Document Locking** - Lock documents for review to prevent concurrent edits
3. **Version Approval/Rejection** - Approve or reject document versions with comments and reasons
4. **Status Summary** - Get status summary of all documents for a land (pending, under_review, approved, rejected)
5. **Audit Trail** - Track all document changes with action history, timestamps, and user information

---

## 11. Document Assignments Module (`/api/document-assignments`)

**Purpose:** Assigns specific document versions to reviewers for review.

### Features:
1. **Document Assignment** - Assign document versions to specific reviewers with due dates and priorities
2. **Assignment Tracking** - Track assignment status (assigned, in_progress, completed) with timestamps
3. **Reviewer Assignments** - Get all document assignments for a specific reviewer with filtering
4. **Assignment Management** - Update assignment status, notes, due dates, and priorities
5. **Available Documents** - List all available document versions that can be assigned to reviewers

---

## 12. Document Slots Module (`/api/document-slots`)

**Purpose:** Manages D1/D2 independent review slots for multi-slot document types.

### Features:
1. **Slot-Based Review** - Mark documents in specific slots (D1, D2) for independent review
2. **Slot Status Management** - Unlock slots from review and manage slot-level review status
3. **Slot Status Summary** - Get review status summary for all document slots in a land
4. **Multi-Slot Document Types** - Support for ownership-documents and government-nocs with D1/D2 slots
5. **Slot Status Indicators** - Visual indicators showing which slots are under review or active

---

## 13. Reviewer Module (`/api/reviewer`)

**Purpose:** Reviewer-specific endpoints for document review workflow.

### Features:
1. **Assigned Documents** - Get all documents assigned to the current reviewer for review
2. **Claim Documents** - Claim documents for review with automatic release of previous versions
3. **Complete Review** - Complete document review with result (approve, reject, request_changes) and comments
4. **Available Documents** - View documents available for review that haven't been claimed yet
5. **Review Workflow** - Manage the complete review workflow from claim to completion

---

## 14. Sections Module (`/api/sections`)

**Purpose:** Manages land section data and section-based review workflow.

### Features:
1. **Section Management** - Create, update, and manage land sections with JSON data storage
2. **Section Assignment** - Assign sections to specific roles or users for review
3. **Section Review** - Approve or reject sections with reviewer comments
4. **Section Status Tracking** - Track section status (draft, submitted, approved, rejected) with timestamps
5. **My Assigned Sections** - Get all sections assigned to the current user or their roles

---

## 15. Marketplace Settings Module (`/api/marketplace-settings`)

**Purpose:** Configures marketplace display templates and settings.

### Features:
1. **Template Configuration** - Configure which fields to display on marketplace project cards (capacity, price, location, etc.)
2. **Design Settings** - Customize card style, color scheme, layout (grid/list/masonry), and cards per row
3. **Feature Toggles** - Enable/disable display of specific project attributes (area, contract term, developer name, interest count)
4. **Settings Persistence** - Save and retrieve marketplace template settings as JSONB in database
5. **Admin-Only Configuration** - Only administrators can modify marketplace display settings

---

## 16. WebSocket Module (`/ws`)

**Purpose:** Real-time bidirectional communication for messaging and notifications.

### Features:
1. **WebSocket Connection** - Establish WebSocket connections with JWT token authentication
2. **Task-Based Rooms** - Join and leave task-specific rooms for focused messaging
3. **Real-Time Messaging** - Send and receive messages in real-time through WebSocket connections
4. **Message Broadcasting** - Broadcast messages to all users in a task room
5. **Connection Management** - Handle connection lifecycle, disconnections, and reconnections

---

## 17. Cache Module (`/api/cache`)

**Purpose:** Manages Redis-based caching and session management.

### Features:
1. **Cache Status** - Get comprehensive cache system status including Redis health and statistics
2. **Cache Invalidation** - Invalidate cache entries by pattern matching (admin only)
3. **User Cache Management** - Clear user-specific cache entries for account updates
4. **Active Sessions** - Get information about active user sessions (admin only)
5. **Cache Statistics** - View cache hit/miss ratios, memory usage, and performance metrics

---

## 18. Health Module (`/api/health`)

**Purpose:** System health monitoring and diagnostics.

### Features:
1. **Basic Health Check** - Quick health check of application, database, and Redis connectivity
2. **Detailed Health Check** - Comprehensive system metrics including CPU, memory, disk usage (admin only)
3. **Application Metrics** - Performance metrics suitable for monitoring systems (Prometheus-compatible)
4. **Readiness Probe** - Kubernetes-style readiness probe for container orchestration
5. **Liveness Probe** - Kubernetes-style liveness probe to verify application is running

---

## 19. Logs Module (`/api/logs`)

**Purpose:** System log querying and analysis.

### Features:
1. **Log Querying** - Query logs with filters (level, source, message, time range) with pagination
2. **Log Statistics** - Analyze logs with statistics by level, recent errors, and top messages
3. **Log File Management** - List available log files (general, errors, access) with metadata
4. **Log Parsing** - Parse structured log entries with timestamp, level, source, and message extraction
5. **Time-Based Filtering** - Filter logs by time range with start and end time parameters

---

## Summary

The RenewMart application consists of **19 main modules** covering:

- **User Management**: Authentication, user profiles, role management
- **Project Management**: Land listings, project lifecycle, status tracking
- **Document Management**: Upload, versioning, review, approval workflows
- **Task Management**: Task assignment, subtasks, collaboration, tracking
- **Investment Management**: Investor interests, withdrawals, advisor assignments
- **Review System**: Multi-role reviews, status tracking, completion metrics
- **Communication**: Real-time messaging, notifications, WebSocket support
- **System Management**: Caching, health monitoring, logging, marketplace configuration

Each module is designed with role-based access control, comprehensive error handling, and follows RESTful API principles with proper authentication and authorization.

