# Troubleshooting Guide - Admin Creation Fix

## Current Errors

### 1. 500 Internal Server Error on `/api/auth/csrf-token`
### 2. 500 Internal Server Error (general)
### 3. 400 Bad Request on `/api/admins`

## Step-by-Step Troubleshooting

### Step 1: Check if Backend Server is Running

```bash
# Navigate to backend directory
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\backend"

# Check if .env file exists
dir .env

# If .env doesn't exist, copy from example
copy .env.example .env

# Start the backend server
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB: mongodb://localhost:27017/driver-monitoring
🚀 Server running on http://localhost:5000
```

### Step 2: Verify MongoDB is Running

The backend requires MongoDB to be running. Check if MongoDB is installed and running:

```bash
# Check if MongoDB service is running (Windows)
sc query MongoDB

# Or check if mongod process is running
tasklist | findstr mongod
```

**If MongoDB is not running:**
- Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
- Or start MongoDB service: `net start MongoDB`
- Or run mongod manually: `mongod --dbpath C:\data\db`

### Step 3: Check Backend Logs

Look at the terminal where you ran `npm run dev` for error messages:

**Common Errors:**

#### Error: "Cannot find module"
```
Solution: Run npm install in the backend directory
cd Dashboard\backend
npm install
```

#### Error: "MongooseServerSelectionError"
```
Solution: MongoDB is not running or connection string is wrong
- Start MongoDB service
- Check MONGO_URI in .env file
```

#### Error: "Missing required environment variable"
```
Solution: Check .env file has all required variables
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- COOKIE_SECRET
```

### Step 4: Test Backend Endpoints Manually

Once backend is running, test endpoints:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test CSRF token endpoint
curl http://localhost:5000/api/auth/csrf-token

# Expected response:
# {"success":true,"data":{"csrfToken":"..."}}
```

### Step 5: Check Frontend Configuration

```bash
# Navigate to frontend directory
cd "c:\coding\Driver-monitoring system\Driver-monitoring-system\Dashboard\frontend"

# Check if node_modules exists
dir node_modules

# If not, install dependencies
npm install

# Start frontend dev server
npm run dev
```

### Step 6: Verify API Client Configuration

Check that frontend is pointing to correct backend URL:

**File:** `Dashboard/frontend/src/services/apiClient.js`

```javascript
const apiClient = axios.create({
  baseURL: '/api',  // Should proxy to backend
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})
```

**Check Vite proxy configuration:**

**File:** `Dashboard/frontend/vite.config.js` (or similar)

Should have proxy configuration:
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
```

### Step 7: Clear Browser Cache and Cookies

1. Open browser DevTools (F12)
2. Go to Application tab
3. Clear all cookies for localhost
4. Clear Local Storage
5. Refresh the page (Ctrl+Shift+R for hard refresh)

### Step 8: Check for Syntax Errors

Run linting/type checking:

```bash
# Backend
cd Dashboard\backend
npm run test  # If tests are configured

# Frontend
cd Dashboard\frontend
npm run build  # This will show any TypeScript/build errors
```

## Specific Error Solutions

### 500 Error on CSRF Token Endpoint

**Possible Causes:**
1. Backend not running
2. MongoDB not connected
3. Cookie secret not configured
4. CORS misconfiguration

**Solution:**
```bash
# Check backend .env file has:
COOKIE_SECRET=your-cookie-signing-secret-min-32-chars
CLIENT_URL=http://localhost:5173

# Restart backend server
npm run dev
```

### 400 Bad Request on /api/admins

**Possible Causes:**
1. Validation error (missing required fields)
2. Role field not being sent
3. CSRF token missing or invalid

**Solution:**
1. Check browser Network tab to see request payload
2. Verify role field is included in request body
3. Check CSRF token is in request headers
4. Look at response body for specific error message

## Debugging Steps

### Enable Detailed Logging

**Backend:** Add console.log statements:

```javascript
// In admins.controller.js create function
exports.create = asyncHandler(async (req, res) => {
  console.log('Create admin request body:', req.body)
  console.log('Authenticated user:', req.admin)
  const admin = await adminsService.createAdmin(req.admin, req.body, req)
  sendSuccess(res, { admin }, null, 201)
})
```

**Frontend:** Check browser console:

```javascript
// In AdminFormModal.jsx handleSubmit
console.log('Submitting payload:', payload)
```

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to create an admin
4. Click on the failed request
5. Check:
   - Request Headers (should have X-CSRF-Token)
   - Request Payload (should have username, email, password, role)
   - Response (should show specific error message)

## Quick Fix Checklist

- [ ] MongoDB is running
- [ ] Backend server is running (`npm run dev` in Dashboard/backend)
- [ ] Frontend server is running (`npm run dev` in Dashboard/frontend)
- [ ] .env file exists in backend with all required variables
- [ ] Browser cookies/cache cleared
- [ ] Logged in as SUPER_ADMIN user
- [ ] No console errors in browser
- [ ] No errors in backend terminal

## Testing the Fix

Once everything is running:

1. **Login as SUPER_ADMIN**
   - Username: `superadmin` (or from .env)
   - Password: `SuperAdmin@123!` (or from .env)

2. **Navigate to Admin Management**
   - Should see list of admins
   - Should see "Create Admin" button

3. **Click "Create Admin"**
   - Modal should open
   - Should see: Username, Email, Password, Role fields
   - Role dropdown should show: Admin, Super Admin

4. **Fill in the form:**
   - Username: `testadmin`
   - Email: `test@example.com`
   - Password: `TestPass123!`
   - Role: `Admin`

5. **Submit**
   - Should see success toast
   - Modal should close
   - New admin should appear in list

## Still Having Issues?

### Check Backend Error Logs

Look for specific error messages in the backend terminal. Common patterns:

```
ValidationError: ...
MongoError: ...
TypeError: ...
ReferenceError: ...
```

### Check Frontend Console Errors

Look for:
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
  → Backend not running

CORS error
  → Backend CORS not configured for frontend URL

401 Unauthorized
  → Not logged in or session expired

403 Forbidden
  → Logged in as ADMIN instead of SUPER_ADMIN
```

### Verify File Changes

Ensure all files were saved correctly:

```bash
# Check if files have our changes
cd Dashboard\backend\src\modules\admins
type admins.validators.js | findstr "SUPER_ADMIN"
# Should show: isIn([ROLES.ADMIN, ROLES.SUPER_ADMIN])

cd Dashboard\frontend\src\features\admins
type AdminFormModal.jsx | findstr "role"
# Should show role state and dropdown
```

## Contact Information

If issues persist, provide:
1. Backend terminal output (full error stack trace)
2. Browser console errors (full messages)
3. Network tab screenshot showing failed request
4. MongoDB connection status
5. Node.js version (`node --version`)
6. npm version (`npm --version`)
