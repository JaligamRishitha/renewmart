# RenewMart Setup Guide

## ✅ Configuration Status

### Backend (Port 8000)
- **Status:** ✅ Running and accessible
- **Email Service:** ✅ Configured and working
- **Database:** ✅ Connected
- **API Docs:** http://localhost:8000/docs

### Frontend (Port 5173)
- **Status:** ⚠️ Needs .env file
- **API Connection:** Configured to connect to backend

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd renewmart/backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the backend server
python server.py
# OR
python main.py
```

Backend will be available at: **http://localhost:8000**

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd renewmart/frontend

# Create .env file (REQUIRED)
# Copy and paste this into a new file named .env:
VITE_API_BASE_URL=http://localhost:8000/api

# Install dependencies (if not already installed)
npm install

# Start the frontend
npm start
```

Frontend will be available at: **http://localhost:5173**

---

## 📧 Email Service Configuration

### Current Configuration
✅ **Email:** jaligamrishitha@gmail.com  
✅ **SMTP:** Gmail (smtp.gmail.com:587)  
✅ **Authentication:** App Password configured  
✅ **Status:** Working correctly

### Email Features
- ✅ User registration verification codes
- ✅ Password reset emails
- ✅ System notifications

### Test Email Service
```bash
cd renewmart/backend
python test_email_service.py
```

---

## 🔗 Frontend-Backend Connection

### Configuration Files

**Backend:** `renewmart/backend/settings.toml`
```toml
HOST = "127.0.0.1"
PORT = 8000
ALLOWED_ORIGINS = ["http://localhost:5173", ...]
```

**Frontend:** `renewmart/frontend/.env` (CREATE THIS FILE!)
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### CORS Configuration
The backend is configured to accept requests from:
- http://localhost:3000
- http://localhost:4028
- http://localhost:5173 ← **Frontend default port**
- http://localhost:5174

---

## 🧪 Testing

### Test Email Service
```bash
cd renewmart/backend
python test_email_service.py
```
Expected output: `[SUCCESS] All tests passed!`

### Test Backend Connectivity
```bash
cd renewmart/backend
python test_api_connectivity.py
```
Expected output: `[SUCCESS] All connectivity tests passed!`

### Test Frontend Connection
1. Start backend: `cd renewmart/backend && python server.py`
2. Start frontend: `cd renewmart/frontend && npm start`
3. Open browser: http://localhost:5173
4. Check browser console for API connection errors

---

## 🐛 Troubleshooting

### Email Not Sending
1. ✅ Configuration is correct in settings.toml
2. ✅ Gmail App Password is valid
3. Run test: `python test_email_service.py`
4. Check logs: `renewmart/backend/logs/renewmart_errors.log`

### Frontend Cannot Connect to Backend
1. **Create .env file** in `renewmart/frontend/` with:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
2. Restart frontend dev server
3. Clear browser cache and reload
4. Check browser console for CORS errors

### Backend Not Starting
1. Check if port 8000 is already in use
2. Verify database connection in settings.toml
3. Check logs: `renewmart/backend/logs/renewmart.log`

### CORS Errors
1. Verify frontend port matches ALLOWED_ORIGINS in backend settings.toml
2. Restart backend after changing CORS settings
3. Clear browser cache

---

## 📝 Key Endpoints

### Backend API
- Root: http://localhost:8000/
- Health: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- Auth: http://localhost:8000/api/auth/*
- Users: http://localhost:8000/api/users/*
- Lands: http://localhost:8000/api/lands/*

### Frontend
- App: http://localhost:5173/
- Login: http://localhost:5173/login
- Register: http://localhost:5173/register
- Dashboard: http://localhost:5173/dashboard

---

## 🔒 Security Notes

1. **Email Password:** Currently in settings.toml - move to environment variable in production
2. **Secret Key:** Change SECRET_KEY before deploying to production
3. **CORS:** Restrict ALLOWED_ORIGINS in production
4. **Database:** Use PostgreSQL in production (currently configured)

---

## ✨ Next Steps

1. ✅ Email service configured and tested
2. ⚠️ **CREATE .env file** in frontend directory
3. Start both backend and frontend
4. Test user registration with email verification
5. Configure production environment variables

---

## 📞 Support

For issues, check:
1. Backend logs: `renewmart/backend/logs/`
2. Browser console (F12)
3. API documentation: http://localhost:8000/docs

---

*Last Updated: October 14, 2025*

