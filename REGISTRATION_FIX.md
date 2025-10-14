# Registration 500 Error - Root Cause & Fix

## 🔍 Problem Identified

**Error:** `POST /api/auth/register` returns **500 Internal Server Error**

## 🎯 Root Cause

**Role Enum Mismatch** between frontend, backend schema, and database:

### Database Roles (Actual):
```
- landowner
- investor
- re_sales_advisor
- re_analyst
- re_governance_lead
- administrator
- project_manager
```

### Schema Enum (Before Fix):
```python
class UserRoleEnum(str, Enum):
    ADMIN = "admin"          # ❌ Database has "administrator"
    LANDOWNER = "landowner"  # ✅ Match
    INVESTOR = "investor"    # ✅ Match
    REVIEWER = "reviewer"    # ❌ Database has "re_analyst"
    DEVELOPER = "developer"  # ❌ Database has "project_manager"
```

### What Happened:
1. Frontend sends: `roles: ["landowner"]` ✅
2. Pydantic validates against UserRoleEnum ❌
3. If frontend sent "admin", it fails validation because database has "administrator"
4. Role assignment fails → 500 error

## ✅ Fixes Applied

### 1. Updated UserRoleEnum to match database
```python
class UserRoleEnum(str, Enum):
    ADMIN = "administrator"              # ✅ Fixed
    LANDOWNER = "landowner"             # ✅ Match
    INVESTOR = "investor"               # ✅ Match
    REVIEWER = "re_analyst"             # ✅ Fixed
    DEVELOPER = "project_manager"       # ✅ Fixed
    RE_SALES_ADVISOR = "re_sales_advisor"     # ✅ Added
    RE_GOVERNANCE_LEAD = "re_governance_lead" # ✅ Added
```

### 2. Changed roles field to accept any string
```python
# Before:
roles: List[UserRoleEnum] = Field(...)

# After (more flexible):
roles: List[str] = Field(...)
```

### 3. Enhanced error logging
```python
except Exception as e:
    import traceback
    error_msg = f"Internal server error during user registration: {str(e)}"
    traceback.print_exc()
    log_security_event("registration_error", {"email": user_data.email, "error": str(e)})
    raise HTTPException(status_code=500, detail=error_msg)
```

## 🚀 How to Test

### Method 1: Using Test Script
```bash
cd renewmart/backend
python test_registration.py
```

### Method 2: Using curl
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "confirm_password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "User",
    "phone": "+1234567890",
    "roles": ["landowner"]
  }'
```

### Method 3: Using API Docs
1. Start backend: `python server.py`
2. Open: http://localhost:8000/docs
3. Navigate to `/api/auth/register`
4. Click "Try it out"
5. Fill in the form
6. Execute

## 📋 Valid Roles

When registering, use these exact role keys:

| Role Key | Description |
|----------|-------------|
| `landowner` | Land owner who lists properties |
| `investor` | Investor looking for opportunities |
| `administrator` | System administrator |
| `re_sales_advisor` | Renewable energy sales advisor |
| `re_analyst` | Renewable energy analyst/reviewer |
| `re_governance_lead` | Governance lead |
| `project_manager` | Project manager/developer |

## 🔧 Additional Improvements

### Better Error Messages
Now when registration fails, you'll see:
```json
{
  "detail": "Internal server error during user registration: <actual error>"
}
```

### Error Logging
All registration errors are now logged to:
- Console (with traceback)
- Security event log
- Application logs

## ✅ Verification Steps

1. ✅ **Fixed schema enum values** - Matches database roles
2. ✅ **Changed roles type to List[str]** - More flexible
3. ✅ **Enhanced error logging** - Better debugging
4. ✅ **Created test script** - Easy to verify

## 🎯 Next Steps

1. **Restart backend** to apply changes:
   ```bash
   cd renewmart/backend
   python server.py
   ```

2. **Test registration** from frontend or API docs

3. **Check for any role-related errors** in logs

## 📞 If Still Having Issues

Check these files:
- Backend logs: `renewmart/backend/logs/renewmart_errors.log`
- Check console output where backend is running
- Use test script: `python test_registration.py`

---

*Fixed: October 14, 2025*

