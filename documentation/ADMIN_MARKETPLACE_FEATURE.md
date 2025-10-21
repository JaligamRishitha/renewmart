# Admin Marketplace Feature

**Date**: October 17, 2025
**Feature**: Admin Marketplace View for Published Projects
**Status**: ✅ Implemented

## Overview

This feature provides administrators and reviewers with a dedicated marketplace view to see all published renewable energy projects. The admin marketplace offers comprehensive filtering, statistics, and project management capabilities.

## Purpose

- **Visibility**: View all projects published to the marketplace in one place
- **Management**: Monitor published projects and their investor interest
- **Analytics**: Track marketplace metrics like total capacity, average pricing, and interest counts
- **Filtering**: Search and filter projects by various criteria

## Access

### Who Can Access
- ✅ Administrators
- ✅ RE Sales Advisors
- ✅ RE Analysts
- ✅ RE Governance Leads

(Protected by `ReviewerRoute`)

### How to Access
1. **From Admin Dashboard**: Click the "Marketplace" button in the top navigation
2. **Direct URL**: Navigate to `/admin-marketplace`

## Features

### 1. Project Statistics Dashboard

Four key metrics displayed at the top:

#### Total Published
- Count of all published projects
- Icon: Building

#### Total Capacity
- Sum of all project capacities in MW
- Icon: Zap (lightning bolt)
- Color: Green

#### Average Price
- Average price per MWh across all projects
- Icon: Dollar Sign
- Color: Blue

#### Total Interest
- Sum of all investor interest counts
- Icon: Users
- Color: Orange

### 2. Advanced Filtering

Filter projects by:

- **Search**: Title, location, developer name, or landowner name
- **Energy Type**: Solar, Wind, Hydro, Biomass, Geothermal
- **Capacity Range**: Min and Max MW
- **Price Range**: Min and Max $/MWh
- **Location**: City or State

Actions:
- **Apply Filters**: Apply selected filter criteria
- **Clear Filters**: Reset all filters to default

### 3. Project List View

Each project card displays:

**Header Section**:
- Project title
- Energy type badge (color-coded)
- Published status badge

**Details Grid** (8 data points):
1. **Location**: Location text
2. **Capacity**: Capacity in MW
3. **Price**: Price per MWh
4. **Timeline**: Project timeline
5. **Developer**: Developer name
6. **Landowner**: Landowner name
7. **Interest Count**: Number of interested investors
8. **Published Date**: When project was published

**Additional Info**:
- Area in acres
- Contract term in years

**Actions**:
- **View Details**: Navigate to document review page for the project

### 4. Empty States

Smart empty states for different scenarios:

#### Loading State
- Animated spinner while fetching data

#### Error State
- Error icon and message
- Retry button to fetch data again

#### No Projects State
- Empty icon
- Message: "No published projects found"
- Explanation: "Projects will appear here once reviewers publish their reviews"

## API Integration

### Endpoint Used
```
GET /api/lands/marketplace/published
```

### Query Parameters
- `energy_type`: Filter by energy type
- `min_capacity`: Minimum capacity in MW
- `max_capacity`: Maximum capacity in MW
- `min_price`: Minimum price per MWh
- `max_price`: Maximum price per MWh
- `location`: Location filter

### Response Format
```json
[
  {
    "land_id": "uuid",
    "title": "Solar Farm Project",
    "location_text": "California",
    "energy_key": "solar",
    "capacity_mw": 50,
    "price_per_mwh": 45.50,
    "timeline_text": "6-12 months",
    "contract_term_years": 20,
    "developer_name": "GreenTech Energy",
    "landowner_name": "John Doe",
    "interest_count": 5,
    "published_at": "2025-10-17T12:00:00Z",
    "area_acres": 100.5
  }
]
```

## UI Components

### Layout
- **Header**: Application header with user info and notifications
- **Sidebar**: Collapsible navigation sidebar
- **Breadcrumbs**: Workflow breadcrumbs for navigation context
- **Main Content**: Marketplace dashboard content

### Color Coding

#### Energy Types
- **Solar**: Yellow badge (`bg-yellow-100 text-yellow-800`)
- **Wind**: Blue badge (`bg-blue-100 text-blue-800`)
- **Hydro**: Cyan badge (`bg-cyan-100 text-cyan-800`)
- **Biomass**: Green badge (`bg-green-100 text-green-800`)
- **Geothermal**: Orange badge (`bg-orange-100 text-orange-800`)

#### Status
- **Published**: Green badge (`bg-green-100 text-green-800`)

### Responsive Design
- Mobile-first responsive grid layouts
- Collapsible sidebar for smaller screens
- Adaptive column counts based on screen size

## Navigation

### From Admin Dashboard
```
Admin Dashboard → Click "Marketplace" button → Admin Marketplace
```

### From Admin Marketplace
```
Admin Marketplace → Click "View Details" → Document Review Page
Admin Marketplace → Click "Back to Dashboard" → Admin Dashboard
```

## User Experience

### Workflow
1. **Access**: Admin/Reviewer navigates to admin marketplace
2. **Overview**: See summary statistics of all published projects
3. **Filter** (Optional): Apply filters to narrow down projects
4. **Review**: Browse project cards with detailed information
5. **Action**: Click "View Details" to see full project review

### Loading States
- Initial page load shows spinner
- Filter application shows no loading state (instant filter)
- Refresh button fetches fresh data

### Error Handling
- Network errors show error state with retry option
- Empty results show helpful message
- Failed filters don't break the page

## Implementation Details

### File Structure
```
renewmart/frontend/src/pages/admin-marketplace/
  └── index.jsx                     # Main marketplace component
```

### Dependencies
- `react`, `useState`, `useEffect`
- `react-router-dom` (useNavigate)
- Header, Sidebar, WorkflowBreadcrumbs, Button components
- `landsAPI.getMarketplaceProjects()`
- Icon component

### State Management
```javascript
const [projects, setProjects] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [filters, setFilters] = useState({
  search: '',
  energyType: '',
  minCapacity: '',
  maxCapacity: '',
  minPrice: '',
  maxPrice: '',
  location: ''
});
```

## Routes

### Route Definition
```jsx
<Route path="/admin-marketplace" element={
  <ReviewerRoute>
    <AdminMarketplace />
  </ReviewerRoute>
} />
```

### Protection
- Protected by `ReviewerRoute`
- Requires admin or reviewer role
- Redirects unauthenticated users to login

## Integration Points

### With Existing Features

1. **Review Publishing**: Projects appear here after first reviewer publishes
2. **Document Review**: "View Details" links to document review page
3. **Admin Dashboard**: Marketplace button provides quick access
4. **Investor Interest**: Shows count of interested investors

### API Endpoints
- Uses existing `/api/lands/marketplace/published` endpoint
- No new backend changes required
- Leverages existing filtering parameters

## Testing

### Test Scenarios

#### Scenario 1: View Published Projects
1. Login as admin or reviewer
2. Navigate to Admin Dashboard
3. Click "Marketplace" button
4. **Expected**: See list of all published projects

#### Scenario 2: Apply Filters
1. On Admin Marketplace page
2. Select "Solar" energy type
3. Set min capacity to 50 MW
4. Click "Apply Filters"
5. **Expected**: See only solar projects with capacity >= 50 MW

#### Scenario 3: Search Projects
1. Type "California" in search box
2. **Expected**: See only projects with "California" in title, location, developer, or landowner

#### Scenario 4: View Project Details
1. Click "View Details" on any project
2. **Expected**: Navigate to document review page for that project

#### Scenario 5: Empty State
1. Clear all projects from marketplace (testing)
2. **Expected**: See "No published projects found" message

#### Scenario 6: Error State
1. Disconnect backend or network
2. Try to load marketplace
3. **Expected**: See error message with retry button

### Manual Testing Checklist
- [ ] Page loads successfully
- [ ] Statistics display correctly
- [ ] Filters work as expected
- [ ] Search filters projects correctly
- [ ] Project cards display all information
- [ ] "View Details" button works
- [ ] "Back to Dashboard" button works
- [ ] Responsive layout on mobile
- [ ] Sidebar collapse works
- [ ] Energy type badges show correct colors
- [ ] Loading state shows spinner
- [ ] Error state shows retry button
- [ ] Empty state shows appropriate message

## Benefits

✅ **Centralized View**: All marketplace projects in one place
✅ **Better Management**: Easy monitoring and filtering of published projects
✅ **Analytics**: Quick insights into marketplace health
✅ **User-Friendly**: Intuitive interface with clear information hierarchy
✅ **Responsive**: Works on all device sizes
✅ **Scalable**: Handles large numbers of projects efficiently

## Future Enhancements

Potential improvements:
- Export projects to CSV/Excel
- Bulk actions (unpublish, archive)
- Chart/graph visualizations of statistics
- Advanced sorting options
- Project comparison feature
- Integration with CRM for investor tracking
- Email notifications for new interest
- Project performance metrics over time

## Related Documentation

- `documentation/MARKETPLACE_SINGLE_REVIEWER_PUBLISH.md` - Auto-publish feature
- `documentation/REVIEW_STATUS_PERSISTENCE_SETUP.md` - Review persistence
- `documentation/schema_map.md` - Database schema

## Files Modified

1. `frontend/src/pages/admin-marketplace/index.jsx` - New marketplace page
2. `frontend/src/Routes.jsx` - Added `/admin-marketplace` route
3. `frontend/src/pages/admin-dashboard/index.jsx` - Added marketplace button

## Support

For issues or questions:
- Check browser console for errors
- Verify backend is running on port 8000
- Ensure user has admin or reviewer role
- Check network tab for API request/response

