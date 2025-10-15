# Landowner Dashboard - Live API Integration

## Overview
This document describes the integration of live API data for the Landowner Dashboard, replacing mock data with real-time database queries.

**Date**: October 14, 2025  
**Status**: ✅ Completed

---

## Architecture Changes

### Backend Endpoints

#### 1. Dashboard Summary Endpoint
**Endpoint**: `GET /api/lands/dashboard/summary`  
**Authentication**: Required (Bearer Token)  
**Access**: Landowner role

**Response Schema**:
```json
{
  "totalLandArea": 1247.5,
  "activeProjects": 6,
  "completedSubmissions": 3,
  "estimatedRevenue": 581.00,
  "totalProjects": 8
}
```

**Calculation Logic**:
- `totalLandArea`: Sum of `area_acres` for all user's lands
- `activeProjects`: Count of lands with status: `published`, `rtb`, or `interest_locked`
- `completedSubmissions`: Count of lands with status: `published` or `rtb`
- `estimatedRevenue`: Sum of `(capacity_mw * price_per_mwh * 8760) / 1,000,000` for active projects

#### 2. Dashboard Projects Endpoint
**Endpoint**: `GET /api/lands/dashboard/projects`  
**Authentication**: Required (Bearer Token)  
**Access**: Landowner role

**Query Parameters**:
- `skip` (default: 0): Pagination offset
- `limit` (default: 100): Results per page
- `status_filter` (optional): Filter by land status
- `search` (optional): Search in title or location

**Response Schema**:
```json
[
  {
    "id": "uuid",
    "name": "Project Name",
    "location": "City, State",
    "type": "solar",
    "capacity": 25.5,
    "status": "draft",
    "lastUpdated": "2025-01-10T14:30:00Z",
    "timeline": "12-months",
    "estimatedRevenue": 85.50,
    "description": "Status description",
    "createdAt": "2025-01-01T10:00:00Z"
  }
]
```

#### 3. Submit for Review Endpoint
**Endpoint**: `POST /api/lands/{land_id}/submit`  
**Authentication**: Required (Bearer Token)  
**Access**: Landowner (must own the land)

**Validation**:
- Land must exist
- User must be the owner
- Land status must be `draft`

**Action**:
- Updates land status from `draft` to `submitted`
- Updates `updated_at` timestamp

**Response**:
```json
{
  "message": "Land submitted for review successfully"
}
```

---

## Database Schema

### Lands Table
```sql
lands (
  land_id UUID PRIMARY KEY,
  landowner_id UUID REFERENCES user(user_id),
  title VARCHAR,
  location_text VARCHAR,
  energy_key VARCHAR REFERENCES lu_energy_type(energy_key),
  capacity_mw NUMERIC(12,2),
  price_per_mwh NUMERIC(12,2),
  timeline_text VARCHAR,
  area_acres NUMERIC(10,2),
  status VARCHAR REFERENCES lu_status(status_key),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Land Status Values (lu_status)
- `draft`: Not submitted, visible to admin in view-only mode
- `submitted`: Awaiting admin review
- `under_review`: Admin reviewing, sections assigned to reviewers
- `approved`: Approved, ready for publishing
- `published`: Published to investors
- `rtb`: Ready to Buy - all approvals completed
- `interest_locked`: Investor interest received, hidden from others
- `rejected`: Rejected, needs revision
- `complete`: Transaction completed

---

## Frontend Integration

### API Service (`src/services/api.js`)

Added two new methods to `landsAPI`:

```javascript
landsAPI: {
  // Get dashboard summary statistics
  getDashboardSummary: async () => {
    const response = await api.get('/lands/dashboard/summary');
    return response.data;
  },
  
  // Get dashboard projects list
  getDashboardProjects: async (params = {}) => {
    const response = await api.get('/lands/dashboard/projects', { params });
    return response.data;
  },
  
  // Submit land for review
  submitForReview: async (landId) => {
    const response = await api.post(`/lands/${landId}/submit`);
    return response.data;
  }
}
```

### Dashboard Component (`src/pages/landowner-dashboard/index.jsx`)

**Key Changes**:
1. Added `loading` and `error` state management
2. Replaced mock data with API calls in `useEffect`
3. Updated `handleSubmitForReview` to call real API
4. Added loading spinner and error handling UI
5. Parallel data fetching using `Promise.all`

**Data Flow**:
```
Component Mount
    ↓
Fetch Summary & Projects (Parallel)
    ↓
Update State (projects, summaryData)
    ↓
Apply Filters (Local)
    ↓
Render Table/Cards
```

### Status Badge Normalization

Updated `StatusBadge` component to handle both backend and frontend status formats:
- Backend uses underscores: `under_review`, `interest_locked`
- Frontend uses hyphens: `under-review`, `interest-locked`
- Normalization: `status.replace(/_/g, '-')`

---

## API Response Mapping

### Backend → Frontend Mapping

| Backend Field | Frontend Field | Transformation |
|--------------|----------------|----------------|
| `land_id` | `id` | Convert UUID to string |
| `title` | `name` | Direct mapping |
| `location_text` | `location` | Direct mapping |
| `energy_key` | `type` | Direct mapping |
| `capacity_mw` | `capacity` | Convert to float |
| `status` | `status` | Direct mapping |
| `updated_at` | `lastUpdated` | ISO string format |
| `timeline_text` | `timeline` | Direct mapping |
| `created_at` | `createdAt` | ISO string format |

### Status Descriptions (Auto-generated in Backend)

| Status | Description |
|--------|-------------|
| `draft` | Draft - Not yet submitted (visible to admin) |
| `submitted` | Submitted - Awaiting admin review |
| `under_review` | Admin reviewing - sections assigned to reviewers |
| `approved` | Approved - Ready for publishing |
| `published` | Published to investors |
| `rtb` | Ready to Buy - All approvals completed |
| `interest_locked` | Investor interest received - Hidden from others |
| `rejected` | Rejected - Needs revision |

---

## Error Handling

### Frontend Error Handling
1. **Network Errors**: Display error notification, show retry button
2. **Authentication Errors**: Redirect to login (handled by interceptor)
3. **Validation Errors**: Show error notification with specific message
4. **Loading States**: Display spinner during data fetch

### Backend Error Handling
1. **404 Not Found**: Land doesn't exist
2. **403 Forbidden**: User doesn't own the land
3. **400 Bad Request**: Invalid status transition or missing data
4. **500 Server Error**: Database or internal error

---

## Testing

### Manual Testing Steps

1. **Dashboard Load**:
   - Login as landowner
   - Navigate to `/landowner-dashboard`
   - Verify summary cards show correct data
   - Verify projects table shows user's lands

2. **Project Filtering**:
   - Test search by project name
   - Test filter by status
   - Test filter by type
   - Test sort by different fields

3. **Submit for Review**:
   - Find a draft project
   - Click "Submit" button
   - Verify success notification
   - Verify status changes to "submitted"
   - Verify "Submit" button disappears

4. **Error Scenarios**:
   - Test with no projects (empty state)
   - Test with network disconnected
   - Test submit non-draft project (should fail)

### API Testing with cURL

**Get Dashboard Summary**:
```bash
curl -X GET http://localhost:8000/api/lands/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Dashboard Projects**:
```bash
curl -X GET "http://localhost:8000/api/lands/dashboard/projects?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Submit for Review**:
```bash
curl -X POST http://localhost:8000/api/lands/{land_id}/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Performance Considerations

### Backend Optimization
1. **Parallel Queries**: Summary and projects fetched independently
2. **Indexed Columns**: `landowner_id`, `status`, `updated_at`
3. **Pagination**: Default limit of 100, max 1000
4. **Computed Fields**: Revenue calculated in query, not post-processing

### Frontend Optimization
1. **Parallel Requests**: `Promise.all` for summary and projects
2. **Local Filtering**: Search and filters applied client-side
3. **Memoization**: Can add `useMemo` for expensive calculations
4. **Lazy Loading**: Can implement infinite scroll if needed

---

## Security

### Authentication
- All endpoints require valid JWT token
- Token validated on every request

### Authorization
- Landowners can only access their own lands
- Admin can access all lands (future feature)
- SQL injection prevented using parameterized queries

### Data Validation
- UUID format validation for land_id
- Status transition validation (only draft → submitted)
- Owner verification before status updates

---

## Future Enhancements

1. **Real-time Updates**: WebSocket for live status changes
2. **Caching**: Redis cache for dashboard summary
3. **Notifications API**: Backend endpoint for notifications
4. **Bulk Operations**: Select multiple projects for batch actions
5. **Export**: Download projects as CSV/PDF
6. **Analytics**: Detailed charts and graphs
7. **Filters Persistence**: Save filter preferences in localStorage

---

## Troubleshooting

### Common Issues

**Issue**: Dashboard shows "Loading..." indefinitely
- **Cause**: Backend server not running or API endpoint unreachable
- **Solution**: Verify backend is running on port 8000, check network tab for errors

**Issue**: "Access Denied" error
- **Cause**: User doesn't have landowner role
- **Solution**: Verify user role in database, update ProtectedRoute to use 'landowner' role

**Issue**: Status badge shows "Unknown"
- **Cause**: Status name mismatch between backend and frontend
- **Solution**: StatusBadge now normalizes underscores to hyphens automatically

**Issue**: Submit button doesn't work
- **Cause**: Land status is not 'draft', or API call failing
- **Solution**: Check land status in database, check browser console for API errors

---

## File Changes Summary

### Backend Files Modified
- `backend/routers/lands.py`: Added dashboard endpoints and submit logic
- Status: ✅ Completed

### Frontend Files Modified
- `frontend/src/services/api.js`: Added dashboard API methods
- `frontend/src/pages/landowner-dashboard/index.jsx`: Integrated live API calls
- `frontend/src/pages/landowner-dashboard/components/StatusBadge.jsx`: Added status normalization
- `frontend/src/components/ProtectedRoute.jsx`: Fixed role from 'owner' to 'landowner'
- Status: ✅ Completed

---

## API Documentation Links

**Swagger/OpenAPI**: http://localhost:8000/docs  
**ReDoc**: http://localhost:8000/redoc

---

## References

- [Workflow.txt](../Workflow.txt): Original workflow specification
- [LANDOWNER_DASHBOARD_WORKFLOW.md](../LANDOWNER_DASHBOARD_WORKFLOW.md): Frontend workflow details
- Backend API: FastAPI with PostgreSQL
- Frontend: React + Vite + TailwindCSS

