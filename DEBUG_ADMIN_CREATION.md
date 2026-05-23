# Debug Guide: Admin Creation 401/400 Errors

## Quick Diagnosis Steps

### 1. Check Browser Console for Detailed Error
Open browser DevTools (F12) → Console tab and look for the actual error response:

```javascript
// In browser console, run:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Try to create an admin
3. Find the failed `POST /api/admins` request
4. Click on it → Preview/Response tab
5. Look for the actual error message

### 3. Check Cookies
1. DevTools → Application tab → Cookies → `http://localhost:5173`
2. Verify these cookies exist:
   - `access_token`
   - `refresh_token`
   - `csrf_token`

### 4. Test Authentication Manually

Open browser console and run:

```javascript
// Test if you're authenticated
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Test CSRF token
fetch('/api/auth/csrf-token', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Test admin creation with full details
fetch('/api/admins', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
  },
  credentials: 'include',
  body: JSON.stringify({
    username: 'testadmin',
    email: 'test@example.com',
    password: 'TestPass123!',
    role: 'ADMIN'
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

## Common Issues & Fixes

### Issue 1: CSRF Token Not Set
**Symptom**: 403 error with "Invalid CSRF token"

**Fix**: The app should auto-fetch it, but you can manually trigger:
```javascript
// In browser console
fetch('/api/auth/csrf-token', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('CSRF Token:', data))
```

### Issue 2: Access Token Expired
**Symptom**: 401 error on `/api/auth/me`

**Fix**: 
1. Logout and login again
2. Or check if refresh token works:
```javascript
fetch('/api/auth/refresh', { 
  method: 'POST', 
  credentials: 'include' 
})
  .then(r => r.json())
  .then(console.log)
```

### Issue 3: Validation Error
**Symptom**: 400 error with validation details

**Check**:
- Username: 3-32 alphanumeric characters
- Email: Valid email format
- Password: Minimum 8 characters
- Role: Must be "ADMIN" or "SUPER_ADMIN"

### Issue 4: CORS/Cookie Issue
**Symptom**: Cookies not being sent with requests

**Fix**: Verify in `vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

### Issue 5: Backend Not Running
**Symptom**: Network error or connection refused

**Check**:
```cmd
netstat -ano | findstr :5000
```

Should show:
```
TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       [PID]
```

**Fix**: Start backend:
```cmd
cd Dashboard\backend
npm start
```

## Backend Logs

Check backend console for errors. Look for:
- Validation errors
- Authentication errors
- Database errors
- CSRF token errors

## Step-by-Step Test

1. **Logout completely**:
   ```javascript
   fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
   ```

2. **Clear all storage**:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   document.cookie.split(";").forEach(c => {
     document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;'
   })
   ```

3. **Reload page**: `location.reload()`

4. **Login again** with superadmin credentials

5. **Check cookies are set**:
   ```javascript
   console.log(document.cookie)
   ```

6. **Try creating admin again**

## Expected Request Format

The POST request to `/api/admins` should look like:

**Headers**:
```
Content-Type: application/json
X-CSRF-Token: [token from cookie]
Cookie: access_token=[token]; refresh_token=[token]; csrf_token=[token]
```

**Body**:
```json
{
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "role": "ADMIN"
}
```

**Expected Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "...",
      "username": "newadmin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "..."
    }
  }
}
```

## If All Else Fails

### Option 1: Check Backend Directly
Use a tool like Postman or curl to test the backend directly:

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:5000/api/auth/csrf-token

# 2. Login
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"superadmin","password":"SuperAdmin@123!"}'

# 3. Create admin
curl -b cookies.txt -X POST http://localhost:5000/api/admins \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: [token from step 1]" \
  -d '{"username":"testadmin","email":"test@example.com","password":"TestPass123!","role":"ADMIN"}'
```

### Option 2: Temporary Workaround
If you need to create an admin urgently, use the seed script:

1. Edit `Dashboard/backend/seed.js`
2. Add your admin manually
3. Run: `node Dashboard/backend/seed.js`

### Option 3: Direct Database Insert
Connect to MongoDB and insert directly (not recommended for production):

```javascript
db.admins.insertOne({
  username: "newadmin",
  email: "admin@example.com",
  password: "$2b$12$[bcrypt hash]", // Use bcrypt to hash password
  role: "ADMIN",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Contact Points

If issue persists, provide:
1. Full error message from Network tab → Response
2. Browser console errors
3. Backend console logs
4. Cookie values (redact sensitive parts)
5. Request headers from Network tab
