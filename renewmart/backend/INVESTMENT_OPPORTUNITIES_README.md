# Investment Opportunities Feature

## Overview

The Investment Opportunities feature allows investors to define their investment criteria and expectations, and automatically match them with suitable land parcels in the RenewMart platform.

## Key Features

### 1. Investment Opportunity Management
- **Create Opportunities**: Investors can create investment opportunities with detailed requirements
- **Update Opportunities**: Modify existing opportunities as requirements change
- **Delete Opportunities**: Remove opportunities that are no longer relevant
- **Status Tracking**: Track opportunity status (active, matched, closed, cancelled)
- **Priority Levels**: Set priority (low, medium, high, urgent) for opportunities

### 2. Investor Requirements
Investors can specify:
- **Capacity Requirements**: Min/max generation capacity in MW
- **Energy Type Preferences**: Preferred renewable energy types (solar, wind, hydro, etc.)
- **Location Preferences**: Preferred regions or locations
- **Land Area**: Min/max land area in acres
- **Financial Constraints**: Maximum price per MWh, budget range
- **Contract Terms**: Min/max contract term in years
- **Timeline**: Expected project completion timeline
- **Project Stage**: Preferred project stage (early, mid, late, ready)

### 3. Intelligent Matching System
- **Automatic Matching**: Automatically find land parcels that match investor criteria
- **Match Scoring**: Calculate match scores (0-100) based on multiple criteria
- **Match Details**: Detailed breakdown of why a land parcel matches
- **Configurable Thresholds**: Set minimum match score thresholds

### 4. Match Management
- **View Matches**: See all matched land parcels for an opportunity
- **Update Match Status**: Mark matches as viewed, interested, rejected, or proposal_created
- **Add Notes**: Investors can add notes to matches
- **Track History**: Track when matches were viewed and status changes

## API Endpoints

### Investment Opportunities

#### Create Investment Opportunity
```http
POST /api/investment-opportunities
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Solar Farm Investment - 50MW",
  "description": "Looking for solar farm opportunities in the UK",
  "min_capacity_mw": 40,
  "max_capacity_mw": 60,
  "preferred_energy_types": ["solar"],
  "preferred_regions": ["London", "Manchester", "Birmingham"],
  "min_area_acres": 100,
  "max_area_acres": 200,
  "max_price_per_mwh": 50,
  "budget_min": 5000000,
  "budget_max": 10000000,
  "min_contract_term_years": 15,
  "max_contract_term_years": 25,
  "timeline_months": 24,
  "preferred_project_stage": "mid",
  "priority": "high",
  "auto_match_enabled": true,
  "notification_enabled": true
}
```

#### Get All Investment Opportunities
```http
GET /api/investment-opportunities?status=active&priority=high&skip=0&limit=10
Authorization: Bearer <token>
```

#### Get Investment Opportunity by ID
```http
GET /api/investment-opportunities/{opportunity_id}
Authorization: Bearer <token>
```

#### Update Investment Opportunity
```http
PUT /api/investment-opportunities/{opportunity_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "max_capacity_mw": 70,
  "priority": "urgent"
}
```

#### Delete Investment Opportunity
```http
DELETE /api/investment-opportunities/{opportunity_id}
Authorization: Bearer <token>
```

### Matching

#### Find Matches for Opportunity
```http
POST /api/investment-opportunities/{opportunity_id}/find-matches
Authorization: Bearer <token>
Content-Type: application/json

{
  "min_match_score": 70,
  "limit": 10
}
```

#### Get All Matches for Opportunity
```http
GET /api/investment-opportunities/{opportunity_id}/matches?status=suggested
Authorization: Bearer <token>
```

#### Update Match Status
```http
PUT /api/investment-opportunities/matches/{match_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "interested",
  "investor_notes": "This looks promising, would like to schedule a site visit"
}
```

## Match Scoring Algorithm

The matching system calculates a score (0-100) based on the following criteria:

| Criteria | Weight | Description |
|----------|--------|-------------|
| Capacity | 25% | How well the land's capacity matches the required range |
| Energy Type | 20% | Whether the land's energy type matches preferences |
| Region | 15% | Whether the land's location matches preferred regions |
| Area | 15% | How well the land area matches the required range |
| Price | 15% | Whether the price is within budget |
| Contract Term | 10% | Whether the contract term matches requirements |

### Match Score Interpretation
- **90-100**: Excellent match - Meets all or nearly all criteria
- **75-89**: Good match - Meets most important criteria
- **60-74**: Fair match - Meets some criteria, may require compromise
- **Below 60**: Poor match - Significant gaps in requirements

## Database Schema

### investment_opportunities Table
```sql
CREATE TABLE investment_opportunities (
    opportunity_id UUID PRIMARY KEY,
    investor_id UUID REFERENCES "user"(user_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    min_capacity_mw NUMERIC(12, 2),
    max_capacity_mw NUMERIC(12, 2),
    preferred_energy_types JSONB,
    preferred_regions JSONB,
    min_area_acres NUMERIC(10, 2),
    max_area_acres NUMERIC(10, 2),
    max_price_per_mwh NUMERIC(12, 2),
    min_contract_term_years INTEGER,
    max_contract_term_years INTEGER,
    budget_min NUMERIC(15, 2),
    budget_max NUMERIC(15, 2),
    timeline_months INTEGER,
    additional_requirements TEXT,
    preferred_project_stage VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(50) DEFAULT 'medium',
    auto_match_enabled BOOLEAN DEFAULT TRUE,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);
```

### opportunity_matches Table
```sql
CREATE TABLE opportunity_matches (
    match_id UUID PRIMARY KEY,
    opportunity_id UUID REFERENCES investment_opportunities(opportunity_id),
    land_id UUID REFERENCES lands(land_id),
    match_score NUMERIC(5, 2),
    match_details JSONB,
    status VARCHAR(50) DEFAULT 'suggested',
    investor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    status_updated_at TIMESTAMP WITH TIME ZONE
);
```

## Installation & Setup

### 1. Run Database Setup
The Investment Opportunities tables are included in the main `renew-sql.sql` file.

```bash
# Connect to your PostgreSQL database
psql -U your_username -d renewmart_db

# Run the complete SQL file (uses CREATE TABLE IF NOT EXISTS)
\i backend/renew-sql.sql
```

**Note:** The Investment Opportunities tables are at the end of the file in the "INVESTMENT OPPORTUNITIES MODULE" section.

### 2. Restart the Application
```bash
# The new models and routes will be automatically loaded
python backend/main.py
```

### 3. Verify Installation
```bash
# Check API documentation
curl http://localhost:8000/docs

# Look for "investment-opportunities" endpoints
```

## Usage Examples

### Example 1: Create an Opportunity and Find Matches

```python
import requests

# 1. Create investment opportunity
response = requests.post(
    "http://localhost:8000/api/investment-opportunities",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "title": "Wind Farm Investment - 100MW",
        "min_capacity_mw": 80,
        "max_capacity_mw": 120,
        "preferred_energy_types": ["wind"],
        "preferred_regions": ["Scotland", "Wales"],
        "max_price_per_mwh": 45,
        "priority": "high"
    }
)
opportunity = response.json()
opportunity_id = opportunity["opportunity_id"]

# 2. Find matching land parcels
response = requests.post(
    f"http://localhost:8000/api/investment-opportunities/{opportunity_id}/find-matches",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "min_match_score": 70,
        "limit": 10
    }
)
matches = response.json()

# 3. Review matches and update status
for match in matches:
    if match["match_score"] >= 85:
        requests.put(
            f"http://localhost:8000/api/investment-opportunities/matches/{match['match_id']}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "status": "interested",
                "investor_notes": "High match score, scheduling site visit"
            }
        )
```

### Example 2: Get All Active Opportunities

```python
response = requests.get(
    "http://localhost:8000/api/investment-opportunities?status=active",
    headers={"Authorization": f"Bearer {token}"}
)
opportunities = response.json()

for opp in opportunities:
    print(f"{opp['title']} - Priority: {opp['priority']}, Matches: {opp['match_count']}")
```

## Permissions

- **Investors**: Can create, view, update, and delete their own opportunities
- **Administrators**: Can view and manage all opportunities
- **Other Roles**: Cannot access investment opportunities

## Future Enhancements

1. **Automatic Notifications**: Notify investors when new matching lands are published
2. **Proposal Creation**: Create investment proposals directly from matches
3. **Advanced Filtering**: More sophisticated filtering and search capabilities
4. **Match History**: Track historical match scores and changes
5. **Bulk Operations**: Bulk update match statuses
6. **Export Functionality**: Export opportunities and matches to Excel/PDF
7. **Analytics Dashboard**: Visualize matching trends and success rates

## Troubleshooting

### Issue: "Investment opportunity not found"
- Ensure the opportunity_id is correct
- Check that you have permission to access the opportunity
- Verify the opportunity hasn't been deleted

### Issue: "No matches found"
- Check that there are published lands in the system
- Lower the min_match_score threshold
- Broaden the search criteria in the opportunity

### Issue: "Failed to create investment opportunity"
- Verify all required fields are provided
- Check that min/max ranges are valid (max >= min)
- Ensure you have the "investor" role

## Support

For issues or questions about the Investment Opportunities feature:
1. Check the API documentation at `/docs`
2. Review the error messages in the response
3. Contact the development team

## Related Features

- **Investor Interests**: Express interest in specific land parcels
- **Investment Proposals**: Create formal proposals (coming soon)
- **Land Management**: Browse and search available land parcels
- **Notifications**: Receive alerts for new matches
