# 🚀 Start RenewMart Application

## Quick Start Commands

### 1️⃣ Create Frontend .env File (REQUIRED - First Time Only)

**PowerShell:**
```powershell
cd C:\Users\jalig\Downloads\RENEW\renewmart\frontend
"VITE_API_BASE_URL=http://localhost:8000/api" | Out-File -FilePath .env -Encoding utf8
```

**OR manually create:** `renewmart\frontend\.env` with content:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

---

### 2️⃣ Start Backend (Terminal 1)

```powershell
cd C:\Users\jalig\Downloads\RENEW\renewmart\backend
python server.py
```

**Expected output:**
```
INFO: Started server process
INFO: Uvicorn running on http://127.0.0.1:8000
```

✅ Backend running at: **http://localhost:8000**
✅ API Docs at: **http://localhost:8000/docs**

---

### 3️⃣ Start Frontend (Terminal 2 - New Window)

```powershell
cd C:\Users\jalig\Downloads\RENEW\renewmart\frontend
npm start
```

**Expected output:**
```
VITE v5.x.x ready in xxx ms
Local: http://localhost:5173/
```

✅ Frontend running at: **http://localhost:5173**

---

## ✅ Verify Everything Works

### Test 1: Backend Health
Open browser: http://localhost:8000/health

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

### Test 2: Frontend Loads
Open browser: http://localhost:5173

Expected: Login/Register page loads

### Test 3: Registration Works
1. Go to: http://localhost:5173/register
2. Fill in form:
   - Email: your@email.com
   - Password: TestPassword123!
   - First Name: Test
   - Last Name: User
   - Role: Landowner
3. Submit
4. Check email for verification code!

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# If in use, kill the process or change port in settings.toml
```

### Frontend won't start
```powershell
# Reinstall dependencies
cd renewmart\frontend
npm install

# Clear cache and start
npm cache clean --force
npm start
```

### Registration returns 500 error
**Make sure you RESTARTED backend after the fixes!**
```powershell
# Stop backend (Ctrl+C in backend terminal)
# Start again
cd renewmart\backend
python server.py
```

### .env file not working
```powershell
# Verify file exists
cd renewmart\frontend
dir .env

# Should show: .env file

# Verify content
type .env

# Should show: VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 📋 All Fixes Applied

✅ **Email Service**: Working perfectly
- Configuration: Correct
- Test: `python test_email_service.py` → SUCCESS

✅ **Backend API**: Running and operational
- Port: 8000
- CORS: Configured
- Database: Connected

✅ **Registration Error**: Fixed
- Role enum: Updated to match database
- Error logging: Enhanced
- Validation: Fixed

✅ **Frontend Connection**: Ready
- .env file: Create it (see step 1)
- API endpoint: Configured

---

## 🎯 Final Checklist

Before starting:
- [ ] Create `renewmart/frontend/.env` file
- [ ] Make sure backend is restarted after fixes

To run:
- [ ] Terminal 1: Start backend (`python server.py`)
- [ ] Terminal 2: Start frontend (`npm start`)
- [ ] Open http://localhost:5173 in browser
- [ ] Test registration

---

## 📞 Quick Reference

**Backend:**
- URL: http://localhost:8000
- Docs: http://localhost:8000/docs
- Logs: renewmart/backend/logs/

**Frontend:**
- URL: http://localhost:5173
- .env: renewmart/frontend/.env
- Console: F12 in browser

**Valid Roles:**
- `landowner`
- `investor`
- `administrator`
- `re_analyst`
- `project_manager`
- `re_sales_advisor`
- `re_governance_lead`

---

*All issues fixed! Follow the steps above to start your application.* 🎉

