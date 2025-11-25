# Investment Opportunities - Quick Start Guide

## 🎯 What is this feature?

The Investment Opportunities feature allows investors to:
1. Define their investment criteria (capacity, location, energy type, budget, etc.)
2. Automatically find matching land parcels
3. Review and manage matches
4. Track interest in specific opportunities

## 🚀 Getting Started

### Step 1: Run the Database Setup

The Investment Opportunities tables are included in the main `renew-sql.sql` file.

**If setting up a new database:**
```bash
# Navigate to backend directory
cd renewmart/backend

# Run the complete SQL file (PostgreSQL)
psql -U your_username -d your_database -f renew-sql.sql

# Or if using Docker
docker exec -i renewmart_db psql -U postgres -d renewmart < renew-sql.sql
```

**If updating an existing database:**
The Investment Opportunities tables are at the end of `renew-sql.sql`. You can either:
1. Run the complete file (it uses `CREATE TABLE IF NOT EXISTS`)
2. Or extract and run just the Investment Opportunities section (search for "INVESTMENT OPPORTUNITIES MODULE")

### Step 2: Restart the Application

```bash
# The application will automatically load the new models and routes
python main.py

# Or if using Docker
docker-compose restart backend
```

### Step 3: Verify Installation

Visit the API documentation:
```
http://localhost:8000/docs
```

Look for the "investment-opportunities" section in the API docs.

## 📝 Basic Usage

### 1. Create an Investment Opportunity

**Endpoint:** `POST /api/investment-opportunities`

**Example Request:**
```json
{
  "title": "Solar Farm Investment - London Area",
  "description": "Looking for solar farm opportunities in and around London",
  "min_capacity_mw": 40,
  "max_capacity_mw": 60,
  "preferred_energy_types": ["solar"],
  "preferred_regions": ["London", "Greater London"],
  "min_area_acres": 80,
  "max_area_acres": 150,
  "max_price_per_mwh": 50,
  "budget_min": 4000000,
  "budget_max": 8000000,
  "min_contract_term_years": 15,
  "max_contract_term_years": 25,
  "priority": "high"
}
```

**Response:**
```json
{
  "opportunity_id": "123e4567-e89b-12d3-a456-426614174000",
  "investor_id": "987fcdeb-51a2-43d7-9876-543210fedcba",
  "title": "Solar Farm Investment - London Area",
  "status": "active",
  "match_count": 0,
  "created_at": "2024-01-15T10:30:00Z",
  ...
}
```

### 2. Find Matching Land Parcels

**Endpoint:** `POST /api/investment-opportunities/{opportunity_id}/find-matches`

**Example Request:**
```json
{
  "min_match_score": 70,
  "limit": 10
}
```

**Response:**
```json
[
  {
    "match_id": "456e7890-f12c-34e5-b678-901234567890",
    "opportunity_id": "123e4567-e89b-12d3-a456-426614174000",
    "land_id": "789abcde-f012-3456-7890-abcdef123456",
    "match_score": 92.5,
    "match_details": {
      "capacity_match": "perfect",
      "energy_type_match": "perfect",
      "region_match": "perfect",
      "area_match": "perfect",
      "price_match": "within_budget"
    },
    "status": "suggested",
    "land_title": "50MW Solar Farm - East London",
    "land_location": "East London, UK",
    "land_capacity_mw": 50,
    "land_energy_type": "solar",
    "land_area_acres": 120,
    "land_price_per_mwh": 45,
    "created_at": "2024-01-15T10:35:00Z"
  }
]
```

### 3. Review and Update Match Status

**Endpoint:** `PUT /api/investment-opportunities/matches/{match_id}`

**Example Request:**
```json
{
  "status": "interested",
  "investor_notes": "Excellent match! Would like to schedule a site visit next week."
}
```

### 4. Get All Matches for an Opportunity

**Endpoint:** `GET /api/investment-opportunities/{opportunity_id}/matches`

**Query Parameters:**
- `status` (optional): Filter by status (suggested, viewed, interested, rejected, proposal_created)

### 5. List All Your Opportunities

**Endpoint:** `GET /api/investment-opportunities`

**Query Parameters:**
- `status` (optional): Filter by status (active, matched, closed, cancelled)
- `priority` (optional): Filter by priority (low, medium, high, urgent)
- `skip` (optional): Pagination offset (default: 0)
- `limit` (optional): Results per page (default: 100, max: 100)

## 🎨 Frontend Integration Example

### React/JavaScript Example

```javascript
// Create an investment opportunity
async function createOpportunity(opportunityData) {
  const response = await fetch('/api/investment-opportunities', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opportunityData)
  });
  return await response.json();
}

// Find matches
async function findMatches(opportunityId, minScore = 70) {
  const response = await fetch(
    `/api/investment-opportunities/${opportunityId}/find-matches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        min_match_score: minScore,
        limit: 10
      })
    }
  );
  return await response.json();
}

// Update match status
async function updateMatchStatus(matchId, status, notes) {
  const response = await fetch(
    `/api/investment-opportunities/matches/${matchId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status,
        investor_notes: notes
      })
    }
  );
  return await response.json();
}
```

## 📊 Understanding Match Scores

| Score Range | Interpretation | Action |
|-------------|----------------|--------|
| 90-100 | Excellent match | High priority - Schedule site visit |
| 75-89 | Good match | Review details - Likely suitable |
| 60-74 | Fair match | Consider with caution - May need compromise |
| Below 60 | Poor match | Generally not recommended |

### Match Score Breakdown

The score is calculated based on:
- **Capacity (25%)**: How well the land's MW capacity fits your range
- **Energy Type (20%)**: Whether it matches your preferred types
- **Region (15%)**: Whether the location matches your preferences
- **Area (15%)**: How well the land area fits your requirements
- **Price (15%)**: Whether the price is within your budget
- **Contract Term (10%)**: Whether the contract length matches

## 🔐 Permissions

- **Investors**: Can create, view, update, and delete their own opportunities
- **Administrators**: Can view and manage all opportunities
- **Other Roles**: Cannot access investment opportunities

## 💡 Best Practices

1. **Be Specific**: The more criteria you specify, the better the matches
2. **Use Realistic Ranges**: Don't make ranges too narrow or you'll miss good opportunities
3. **Review Regularly**: Check for new matches periodically
4. **Update Status**: Keep match statuses up to date for better tracking
5. **Add Notes**: Document your thoughts on each match for future reference

## 🐛 Troubleshooting

### No matches found?
- Lower the `min_match_score` threshold (try 60 instead of 70)
- Broaden your criteria (wider capacity range, more regions, etc.)
- Check if there are published lands in the system

### Can't create opportunity?
- Ensure you have the "investor" role
- Verify all required fields are provided
- Check that min/max ranges are valid (max >= min)

### Permission denied?
- Verify you're logged in with an investor account
- Check your authentication token is valid
- Ensure you're trying to access your own opportunities

## 📚 Related Documentation

- [Full API Documentation](./INVESTMENT_OPPORTUNITIES_README.md)
- [Feature Comparison Analysis](../FEATURE_COMPARISON_ANALYSIS.md)
- [Application Modules Documentation](../APPLICATION_MODULES_DOCUMENTATION.md)

## 🎉 What's Next?

After setting up Investment Opportunities, you can:
1. Create Investment Proposals from interested matches (coming soon)
2. Set up automatic notifications for new matches
3. Export opportunities and matches to Excel/PDF
4. View analytics on matching success rates

## 📞 Support

For questions or issues:
1. Check the [Full Documentation](./INVESTMENT_OPPORTUNITIES_README.md)
2. Review the API docs at `/docs`
3. Contact the development team

---

**Happy Investing! 🌱💰**
