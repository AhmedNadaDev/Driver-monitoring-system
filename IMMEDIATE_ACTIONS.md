# Immediate Actions to Fix Errors

## Current Status
You're seeing these errors:
- ❌ 500 Internal Server Error on `/api/auth/csrf-token`
- ❌ 500 Internal Server Error (general)
- ❌ 400 Bad Request on `/api/admins`

## Root Cause
The backend server is either:
1. Not running
2. Crashed due to an error
3. Cannot connect to MongoDB

## Immediate Fix Steps

### Step 1: Check Backend Server Status

Open a terminal and run:

```bash
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\backend"
node check-server.js
```

This diagnostic script will tell you exactly what's wrong.

### Step 2: Start MongoDB (if not running)

**Option A: Windows Service**
```bash
net start MongoDB
```

**Option B: Manual Start**
```bash
mongod --dbpath C:\data\db
```

**Option C: Check if already running**
```bash
tasklist | findstr mongod
```

### Step 3: Verify .env File

Check if `.env` file exists in `Dashboard/backend/`:

```bash
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\backend"
dir .env
```

If it doesn't exist:
```bash
copy .env.example .env
```

### Step 4: Install Dependencies (if needed)

```bash
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\backend"
npm install
```

### Step 5: Start Backend Server

```bash
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\backend"
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB: mongodb://localhost:27017/driver-monitoring
🚀 Server running on http://localhost:5000
```

**If you see errors**, read them carefully and check TROUBLESHOOTING.md

### Step 6: Start Frontend Server (in a new terminal)

```bash
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\frontend"
npm run dev
```

### Step 7: Test the Application

1. Open browser to `http://localhost:5173`
2. Login with SUPER_ADMIN credentials:
   - Username: `superadmin`
   - Password: `SuperAdmin@123!`
3. Navigate to Admin Management
4. Click "Create Admin"
5. Fill in the form with role selection
6. Submit

## Quick Verification Commands

Run these in order to verify everything:

```bash
# 1. Check if MongoDB is running
sc query MongoDB

# 2. Check if Node processes are running
tasklist | findstr node

# 3. Test backend health endpoint
curl http://localhost:5000/health

# 4. Test CSRF endpoint
curl http://localhost:5000/api/auth/csrf-token
```

## Common Issues and Solutions

### Issue: "Cannot connect to MongoDB"
**Solution:** Start MongoDB service or mongod process

### Issue: "Port 5000 already in use"
**Solution:** 
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue: "Module not found"
**Solution:**
```bash
cd Dashboard\backend
npm install
```

### Issue: "ENOENT: no such file or directory, open '.env'"
**Solution:**
```bash
cd Dashboard\backend
copy .env.example .env
```

## What Changed in the Fix

### Frontend Changes
- ✅ Added role selection dropdown in AdminFormModal
- ✅ Added error display component
- ✅ Added frontend validation
- ✅ Improved error handling

### Backend Changes
- ✅ Updated validators to accept SUPER_ADMIN role
- ✅ Fixed service logic to properly assign roles
- ✅ Added security checks for role assignment

## Files Modified

### Frontend
- `Dashboard/frontend/src/features/admins/AdminFormModal.jsx`
- `Dashboard/frontend/src/features/admins/AdminsPage.jsx`

### Backend
- `Dashboard/backend/src/modules/admins/admins.validators.js`
- `Dashboard/backend/src/modules/admins/admins.service.js`

## Next Steps After Server is Running

1. Clear browser cache and cookies
2. Login as SUPER_ADMIN
3. Test admin creation with different roles
4. Verify error messages are clear
5. Test edge cases (duplicate username, weak password, etc.)

## Need More Help?

If the diagnostic script (`check-server.js`) shows errors, look at:
1. The specific error message
2. The stack trace
3. TROUBLESHOOTING.md for detailed solutions

## Contact Points

When reporting issues, provide:
- Output of `node check-server.js`
- Backend terminal output
- Browser console errors
- Network tab screenshot
