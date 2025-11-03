# Guide: Creating a Reviewer via Admin API

## Endpoint
`POST /api/users/admin/create`

## Authentication
Requires admin authentication (Bearer token with administrator role)

## Request Body Format

### Required Fields:
- `email` (string): Valid email address
- `password` (string): Min 8 characters, must include:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
  - At least one special character (!@#$%^&*(),.?":{}|<>)
- `first_name` (string): 1-50 characters, letters only
- `last_name` (string): 1-50 characters, letters only

### Optional Fields:
- `confirm_password` (string): If not provided, automatically set to password
- `phone` (string): 10-15 digits, optional
- `roles` (array of strings): Default empty array
- `is_active` (boolean): Default true

## Example Request (RE Analyst)

```json
{
  "email": "analyst@example.com",
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Analyst",
  "phone": "+1234567890",
  "roles": ["re_analyst"],
  "is_active": true
}
```

## Example Request (RE Sales Advisor)

```json
{
  "email": "sales@example.com",
  "password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Sales",
  "roles": ["re_sales_advisor"],
  "is_active": true
}
```

## Example Request (RE Governance Lead)

```json
{
  "email": "governance@example.com",
  "password": "SecurePass123!",
  "first_name": "Bob",
  "last_name": "Governance",
  "roles": ["re_governance_lead"],
  "is_active": true
}
```

## Valid Reviewer Role Keys:
- `re_analyst` - RE Analyst
- `re_sales_advisor` - RE Sales Advisor
- `re_governance_lead` - RE Governance Lead

## Common Validation Errors:

### 422 Errors (Validation):
1. **Password too short**: "Password must be at least 8 characters long"
2. **Missing uppercase**: "Password must contain at least one uppercase letter"
3. **Missing lowercase**: "Password must contain at least one lowercase letter"
4. **Missing digit**: "Password must contain at least one digit"
5. **Missing special char**: "Password must contain at least one special character"
6. **Invalid email**: Email format validation fails
7. **Invalid name**: "Name must contain only letters, spaces, hyphens, and apostrophes"
8. **Invalid phone**: "Phone number must be between 10 and 15 digits"

### 400 Errors:
- "Email already registered" - Email already exists in database
- "Invalid role: {role_key}" - Role doesn't exist in lu_roles table

## Testing with cURL

```bash
curl -X POST "http://127.0.0.1:8000/api/users/admin/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "reviewer@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["re_analyst"]
  }'
```

## Response Format

### Success (201 Created):
```json
{
  "user_id": "uuid-here",
  "email": "reviewer@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Validation Error (422):
```json
{
  "detail": "Validation error",
  "type": "validation_error",
  "errors": [
    {
      "loc": ["body", "password"],
      "msg": "Password must contain at least one uppercase letter",
      "type": "value_error"
    }
  ]
}
```

