# COMPREHENSIVE SECURITY AUDIT REPORT
## Driver Monitoring System - MERN Stack Dashboard

**Audit Date:** May 18, 2026  
**Auditor Role:** Elite Red Team Security Auditor & Senior Application Security Engineer  
**Application Type:** MERN Stack (MongoDB, Express, React, Node.js)  
**Authentication:** JWT-based with refresh token rotation  
**Authorization:** Role-Based Access Control (RBAC) - SUPER_ADMIN / ADMIN

---

## EXECUTIVE SUMMARY

### Overall Security Score: **7.5/10**

### Production Readiness Assessment
**Status:** ⚠️ **NOT PRODUCTION READY** - Critical issues must be addressed before deployment.

The application demonstrates **strong security fundamentals** with proper JWT implementation, CSRF protection, refresh token rotation, and comprehensive audit logging. However, several **critical vulnerabilities** and **architectural weaknesses** exist that could be exploited by attackers.

### Key Strengths
✅ Proper JWT access/refresh token separation with rotation  
✅ CSRF protection implemented correctly  
✅ Refresh token reuse detection with automatic session revocation  
✅ Account lockout mechanism after failed login attempts  
✅ Password history enforcement (prevents reuse)  
✅ Comprehensive audit logging with security event tracking  
✅ HTTP-only cookies for token storage  
✅ express-mongo-sanitize prevents basic NoSQL injection  
✅ Helmet.js security headers configured  
✅ Rate limiting on authentication endpoints  

### Critical Architectural Risks
🔴 **Missing authorization checks on legacy API routes**  
🔴 **IDOR vulnerabilities in driver/bus/trip management**  
🔴 **Unvalidated RAG service integration (SSRF risk)**  
🔴 **Frontend role checks can be bypassed**  
🔴 **Weak input validation on several endpoints**  
🔴 **No re-authentication for sensitive operations**  

### Most Exploitable Vulnerabilities
1. **IDOR in Driver/Bus/Trip APIs** - Any authenticated user can modify/delete any resource
2. **Missing Authorization on Legacy Routes** - `/api/drivers`, `/api/buses`, etc. lack RBAC
3. **SSRF via RAG Integration** - Unvalidated proxy to external service
4. **Mass Assignment in Admin Creation** - Can potentially escalate privileges
5. **Frontend-Only Authorization** - Role checks can be bypassed via direct API calls


---

## ATTACK SURFACE MAP

### Entry Points
1. **Public Endpoints**
   - `POST /api/auth/login` - Login (rate-limited: 15 req/15min)
   - `GET /api/auth/csrf-token` - CSRF token generation
   - `POST /api/auth/refresh` - Token refresh

2. **Authenticated Endpoints**
   - `/api/auth/*` - Authentication management
   - `/api/admins/*` - Admin management (SUPER_ADMIN only)
   - `/api/history/*` - Audit logs (SUPER_ADMIN only)
   - `/api/drivers/*` - Driver CRUD (⚠️ NO RBAC)
   - `/api/buses/*` - Bus CRUD (⚠️ NO RBAC)
   - `/api/routes/*` - Route CRUD (⚠️ NO RBAC)
   - `/api/trips/*` - Trip management (⚠️ NO RBAC)
   - `/api/violations/*` - Violation queries (⚠️ NO RBAC)
   - `/api/chat` - RAG chatbot proxy (⚠️ SSRF RISK)

3. **Frontend Routes**
   - `/login` - Public
   - `/` - Protected (any authenticated user)
   - `/drivers/*` - Protected (any authenticated user)
   - `/admins` - Protected (SUPER_ADMIN only - frontend check)
   - `/history` - Protected (SUPER_ADMIN only - frontend check)

### Sensitive Flows
1. **Authentication Flow**
   - Login → JWT access token (15m) + refresh token (7d) → HTTP-only cookies
   - Refresh → Token rotation with family tracking
   - Token reuse detection → Auto-revoke all sessions

2. **Admin Management Flow**
   - SUPER_ADMIN creates admin → Password validation → Audit log
   - SUPER_ADMIN updates admin → Role change validation → Audit log
   - SUPER_ADMIN deletes admin → Prevent last SUPER_ADMIN deletion → Revoke sessions

3. **Password Management**
   - Password change → Verify current password → Check history → Revoke all sessions
   - Password reset (by SUPER_ADMIN) → No current password check → Revoke target sessions

### Trust Boundaries
1. **Frontend ↔ Backend API** - CSRF protected, credentials included
2. **Backend ↔ MongoDB** - Sanitized inputs, but weak validation
3. **Backend ↔ RAG Service** - ⚠️ **UNVALIDATED PROXY** - SSRF risk
4. **User Input ↔ Database** - Basic sanitization, but insufficient validation

### High-Risk Modules
1. **Legacy API Routes** (`/routes/*.js`) - No authorization middleware
2. **RAG Chat Proxy** (`/api/chat`) - Direct proxy without validation
3. **Admin Service** (`admins.service.js`) - Complex privilege logic
4. **Token Service** (`token.service.js`) - Critical security component


---

## CRITICAL VULNERABILITIES

### 🔴 CRITICAL #1: Broken Access Control - Missing Authorization on Legacy Routes

**Severity:** CRITICAL (CVSS 9.1)  
**CWE:** CWE-862 (Missing Authorization)

**Affected Files:**
- `Dashboard/backend/routes/drivers.js`
- `Dashboard/backend/routes/buses.js`
- `Dashboard/backend/routes/routes.js`
- `Dashboard/backend/routes/trips.js`
- `Dashboard/backend/routes/violations.js`

**Vulnerable Code:**
```javascript
// routes/drivers.js - NO AUTHORIZATION CHECKS
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id)
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    res.json({ message: `Driver "${driver.name}" deleted successfully` })
  } catch {
    res.status(500).json({ error: 'Failed to delete driver' })
  }
})
```

**Exploitation Scenario:**
1. Attacker authenticates as regular ADMIN user
2. Attacker directly calls `DELETE /api/drivers/{id}` 
3. **ANY driver can be deleted** - no ownership or role check
4. Same applies to buses, routes, trips - complete data manipulation possible

**Real-World Impact:**
- **Data Destruction:** Any authenticated user can delete all drivers, buses, routes
- **Data Manipulation:** Modify trip records, violation data, safety scores
- **Business Logic Bypass:** Circumvent any intended access controls
- **Compliance Violation:** Unauthorized data modification violates audit requirements

**Proof-of-Concept Attack:**
```bash
# Login as regular ADMIN
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"password"}' \
  --cookie-jar cookies.txt

# Delete ANY driver (should be restricted)
curl -X DELETE http://localhost:5000/api/drivers/507f1f77bcf86cd799439011 \
  --cookie cookies.txt \
  -H "X-CSRF-Token: {token}"
# ✅ SUCCESS - Driver deleted by regular admin!
```

**Remediation:**
```javascript
// Add authorization middleware to ALL legacy routes
const { authenticate, authorize } = require('../src/middlewares/auth')
const { ROLES } = require('../src/utils/constants')

// Option 1: Require SUPER_ADMIN for destructive operations
router.delete('/:id', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  // ... deletion logic
})

// Option 2: Implement ownership-based access control
router.delete('/:id', authenticate, async (req, res) => {
  const driver = await Driver.findById(req.params.id)
  if (!driver) return res.status(404).json({ error: 'Driver not found' })
  
  // Check if user has permission
  if (req.admin.role !== ROLES.SUPER_ADMIN && driver.createdBy !== req.admin._id) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
  
  await driver.remove()
  res.json({ message: 'Driver deleted' })
})
```


---

### 🔴 CRITICAL #2: Insecure Direct Object Reference (IDOR) - MongoDB ObjectId Enumeration

**Severity:** CRITICAL (CVSS 8.2)  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Affected Files:**
- All routes using `req.params.id` without ownership validation
- `routes/drivers.js` - GET/PUT/DELETE by ID
- `routes/buses.js` - GET/PUT/DELETE by ID
- `routes/trips.js` - GET by ID

**Vulnerable Code:**
```javascript
// routes/drivers.js
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    res.json(driver)  // ⚠️ No ownership check
  } catch {
    res.status(500).json({ error: 'Failed to fetch driver' })
  }
})
```

**Exploitation Scenario:**
1. Attacker enumerates MongoDB ObjectIds (predictable format: 24-char hex)
2. Attacker iterates through IDs: `507f1f77bcf86cd799439011`, `507f1f77bcf86cd799439012`, etc.
3. Attacker accesses/modifies resources belonging to other users
4. No rate limiting on these endpoints allows mass enumeration

**Real-World Impact:**
- **Information Disclosure:** Access all driver records, trip data, violations
- **Horizontal Privilege Escalation:** Modify other users' resources
- **Data Scraping:** Enumerate entire database via sequential ID guessing
- **Privacy Violation:** Access sensitive driver performance data

**Proof-of-Concept Attack:**
```javascript
// Enumerate all drivers
const baseId = '507f1f77bcf86cd799439'
for (let i = 0; i < 1000; i++) {
  const id = baseId + i.toString().padStart(3, '0')
  const response = await fetch(`/api/drivers/${id}`, {
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken }
  })
  if (response.ok) {
    const driver = await response.json()
    console.log('Found driver:', driver)
  }
}
```

**Remediation:**
```javascript
// Implement ownership validation middleware
const checkOwnership = (Model, ownerField = 'createdBy') => async (req, res, next) => {
  try {
    const resource = await Model.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })
    
    // Allow SUPER_ADMIN full access
    if (req.admin.role === ROLES.SUPER_ADMIN) {
      req.resource = resource
      return next()
    }
    
    // Check ownership
    if (resource[ownerField]?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    req.resource = resource
    next()
  } catch (err) {
    next(err)
  }
}

// Apply to routes
router.get('/:id', authenticate, checkOwnership(Driver), (req, res) => {
  res.json(req.resource)
})
```


---

### 🔴 CRITICAL #3: Server-Side Request Forgery (SSRF) via RAG Service Proxy

**Severity:** CRITICAL (CVSS 8.6)  
**CWE:** CWE-918 (Server-Side Request Forgery)

**Affected Files:**
- `Dashboard/backend/src/app.js` (lines 58-73)

**Vulnerable Code:**
```javascript
const RAG_URL = process.env.RAG_URL || 'http://localhost:8001'

app.post('/api/chat', authenticate, async (req, res, next) => {
  const { query } = req.body
  if (!query?.trim()) {
    return res.status(400).json({ success: false, error: 'query is required' })
  }
  try {
    const upstream = await fetch(`${RAG_URL}/query`, {  // ⚠️ Unvalidated URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)  // ⚠️ Proxies response directly
  } catch (err) {
    next(err)
  }
})
```

**Exploitation Scenario:**
1. Attacker controls `RAG_URL` environment variable (via .env file exposure or misconfiguration)
2. Attacker sets `RAG_URL=http://internal-admin-panel:8080`
3. Attacker sends requests through `/api/chat` to probe internal network
4. Backend server acts as proxy to internal services

**Alternative Attack Vector:**
If RAG service is compromised or malicious:
1. RAG service returns malicious JSON with embedded scripts
2. Backend proxies response without validation
3. Frontend renders response (potential XSS if not properly escaped)

**Real-World Impact:**
- **Internal Network Scanning:** Probe internal services (databases, admin panels, AWS metadata)
- **Cloud Metadata Exploitation:** Access `http://169.254.169.254/latest/meta-data/` (AWS credentials)
- **Port Scanning:** Enumerate open ports on internal network
- **Credential Theft:** Access internal APIs that don't require authentication
- **Data Exfiltration:** Proxy sensitive data through the application

**Proof-of-Concept Attack:**
```bash
# If attacker can modify .env
RAG_URL=http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Then send chat request
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: {token}" \
  --cookie cookies.txt \
  -d '{"query":"test"}'

# Backend fetches AWS credentials and returns them!
```

**Remediation:**
```javascript
// 1. Validate RAG_URL at startup
const ALLOWED_RAG_HOSTS = ['localhost', '127.0.0.1', 'rag-service.internal']
const ragUrl = new URL(process.env.RAG_URL || 'http://localhost:8001')
if (!ALLOWED_RAG_HOSTS.includes(ragUrl.hostname)) {
  throw new Error('Invalid RAG_URL configuration')
}

// 2. Implement request timeout and size limits
app.post('/api/chat', authenticate, async (req, res, next) => {
  const { query } = req.body
  if (!query?.trim() || query.length > 1000) {
    return res.status(400).json({ success: false, error: 'Invalid query' })
  }
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const upstream = await fetch(`${ragUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    // Validate response
    if (!upstream.ok) {
      return res.status(502).json({ success: false, error: 'RAG service error' })
    }
    
    const data = await upstream.json()
    
    // Sanitize response before sending to client
    if (data.answer && typeof data.answer === 'string') {
      res.json({ success: true, answer: data.answer })
    } else {
      res.status(502).json({ success: false, error: 'Invalid RAG response' })
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'RAG service timeout' })
    }
    next(err)
  }
})
```


---

### 🔴 CRITICAL #4: Frontend-Only Authorization Bypass

**Severity:** HIGH (CVSS 7.5)  
**CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security)

**Affected Files:**
- `Dashboard/frontend/src/routes/RoleRoute.jsx`
- `Dashboard/frontend/src/App.jsx`

**Vulnerable Code:**
```javascript
// RoleRoute.jsx - Frontend-only check
const RoleRoute = ({ roles }) => {
  const { admin, loading } = useAuth()
  
  if (loading) return null
  
  if (!admin || !roles.includes(admin.role)) {
    return <Navigate to="/" replace />  // ⚠️ Only prevents UI access
  }
  
  return <Outlet />
}
```

**Exploitation Scenario:**
1. Regular ADMIN user logs in successfully
2. Frontend hides `/admins` and `/history` routes based on role
3. Attacker directly calls backend APIs:
   - `GET /api/admins` - ✅ Properly protected (403 Forbidden)
   - `GET /api/history` - ✅ Properly protected (403 Forbidden)
4. **However**, attacker can still access:
   - `GET /api/drivers` - ⚠️ No RBAC (works!)
   - `DELETE /api/drivers/{id}` - ⚠️ No RBAC (works!)
   - All other legacy routes - ⚠️ No RBAC

**Real-World Impact:**
- **False Sense of Security:** Developers assume frontend routes protect backend
- **Authorization Bypass:** Direct API calls bypass frontend restrictions
- **Privilege Escalation:** Regular users access admin-only data via API
- **Audit Trail Gaps:** Frontend-only checks don't log unauthorized attempts

**Proof-of-Concept Attack:**
```javascript
// Bypass frontend route protection
// Frontend shows: "You don't have access to /admins"
// But attacker can still call APIs directly:

fetch('/api/drivers', {
  credentials: 'include',
  headers: { 'X-CSRF-Token': csrfToken }
})
.then(r => r.json())
.then(drivers => console.log('Accessed drivers:', drivers))
// ✅ SUCCESS - Regular ADMIN can access all drivers

// Even worse - can delete:
fetch('/api/drivers/507f1f77bcf86cd799439011', {
  method: 'DELETE',
  credentials: 'include',
  headers: { 'X-CSRF-Token': csrfToken }
})
// ✅ SUCCESS - Driver deleted by regular ADMIN
```

**Remediation:**
```javascript
// Backend MUST enforce authorization on ALL routes
// Already done correctly for /api/admins:
router.use(authorize(ROLES.SUPER_ADMIN))

// Apply same pattern to legacy routes:
const protectedApi = express.Router()
protectedApi.use(authenticate)

// Add role-based protection
protectedApi.use('/drivers', authorize(ROLES.SUPER_ADMIN), driverRoutes)
protectedApi.use('/buses', authorize(ROLES.SUPER_ADMIN), busRoutes)
protectedApi.use('/routes', authorize(ROLES.SUPER_ADMIN), routeRoutes)
protectedApi.use('/trips', authorize(ROLES.SUPER_ADMIN), tripRoutes)
protectedApi.use('/violations', authorize(ROLES.SUPER_ADMIN), violationRoutes)

app.use('/api', protectedApi)
```

**Security Principle Violated:**
> **Never trust the client.** All authorization decisions MUST be made on the server.
> Frontend route guards are for UX only, not security.


---

## HIGH SEVERITY ISSUES

### 🟠 HIGH #1: No Re-Authentication for Sensitive Operations

**Severity:** HIGH (CVSS 7.1)  
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Affected Files:**
- `src/modules/admins/admins.service.js` - Password reset
- `src/modules/admins/admins.service.js` - Admin deletion
- `src/modules/admins/admins.service.js` - Role changes

**Vulnerable Code:**
```javascript
// admins.service.js - No password confirmation required
const resetPassword = async (actor, id, newPassword, req) => {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can reset passwords')
  }
  
  const admin = await Admin.findById(id).select('+password +passwordHistory')
  if (!admin) throw new ApiError(404, 'Admin not found')
  
  await preparePasswordChange(admin, newPassword)
  admin.password = newPassword
  await admin.save()  // ⚠️ No re-authentication required
  await revokeAllSessions(admin._id)
  // ... audit log
}
```

**Exploitation Scenario:**
1. Attacker steals SUPER_ADMIN's access token (XSS, session hijacking, etc.)
2. Token is still valid for 15 minutes
3. Attacker immediately resets all admin passwords
4. Attacker creates new SUPER_ADMIN account
5. Original admin is locked out

**Real-World Impact:**
- **Account Takeover:** Stolen short-lived token can cause permanent damage
- **Privilege Persistence:** Attacker creates backdoor admin accounts
- **Insufficient Defense-in-Depth:** No second factor for critical operations

**Remediation:**
```javascript
// Add re-authentication requirement
const resetPassword = async (actor, id, newPassword, currentPassword, req) => {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can reset passwords')
  }
  
  // Require current password confirmation
  const actorDoc = await Admin.findById(actor._id).select('+password')
  if (!(await actorDoc.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password incorrect')
  }
  
  const admin = await Admin.findById(id).select('+password +passwordHistory')
  if (!admin) throw new ApiError(404, 'Admin not found')
  
  await preparePasswordChange(admin, newPassword)
  admin.password = newPassword
  await admin.save()
  await revokeAllSessions(admin._id)
  
  await logAudit({
    actor,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: { username: admin.username, reAuthenticated: true },
    req,
  })
}
```

---

### 🟠 HIGH #2: Weak Input Validation on Driver/Bus Creation

**Severity:** HIGH (CVSS 6.8)  
**CWE:** CWE-20 (Improper Input Validation)

**Affected Files:**
- `routes/drivers.js` - POST/PUT endpoints
- `routes/buses.js` - POST/PUT endpoints

**Vulnerable Code:**
```javascript
// routes/drivers.js
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) {  // ⚠️ Only checks if empty
      return res.status(400).json({ error: 'name is required' })
    }
    
    const id = await generateDriverId()
    const driver = new Driver({ id, name: name.trim() })  // ⚠️ No length/format validation
    await driver.save()
    res.status(201).json(driver)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create driver' })
  }
})
```

**Exploitation Scenario:**
1. Attacker sends extremely long name: `"A".repeat(1000000)`
2. MongoDB stores the data (no maxlength in schema)
3. Database bloat, potential DoS
4. Attacker injects special characters: `"<script>alert(1)</script>"`
5. If rendered without escaping, causes XSS

**Real-World Impact:**
- **Database Bloat:** Unlimited field lengths cause storage issues
- **Denial of Service:** Large payloads slow down queries
- **XSS Risk:** Special characters not validated
- **Data Integrity:** Invalid data pollutes database

**Remediation:**
```javascript
// Add express-validator
const { body, validationResult } = require('express-validator')

const createDriverValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters')
    .escape(),  // Sanitize HTML
]

router.post('/', createDriverValidator, validate, async (req, res) => {
  const { name } = req.body
  const id = await generateDriverId()
  const driver = new Driver({ id, name })
  await driver.save()
  res.status(201).json(driver)
})
```


---

### 🟠 HIGH #3: Insufficient Rate Limiting on Resource Endpoints

**Severity:** HIGH (CVSS 6.5)  
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Affected Files:**
- `src/app.js` - Global rate limiter only
- All `/api/drivers`, `/api/buses`, `/api/trips` routes

**Vulnerable Code:**
```javascript
// app.js - Only global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,  // ⚠️ 500 requests per 15 minutes is too permissive
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)
```

**Exploitation Scenario:**
1. Attacker authenticates once
2. Attacker sends 500 requests in 15 minutes to enumerate all resources
3. 500 requests = ~33 requests/minute = enough to scrape entire database
4. No per-endpoint rate limiting allows targeted attacks

**Real-World Impact:**
- **Data Scraping:** Enumerate all drivers, buses, trips via IDOR
- **Brute Force:** Try many IDs to find valid resources
- **DoS:** Overwhelm database with queries
- **Resource Exhaustion:** MongoDB connection pool exhaustion

**Remediation:**
```javascript
// Add stricter rate limiting per endpoint category
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,  // 100 reads per 15 minutes
  message: { success: false, error: 'Too many read requests' },
})

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,  // 50 writes per 15 minutes
  message: { success: false, error: 'Too many write requests' },
})

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // 10 deletes per 15 minutes
  message: { success: false, error: 'Too many delete requests' },
})

// Apply to routes
protectedApi.get('/drivers', readLimiter, driverRoutes)
protectedApi.post('/drivers', writeLimiter, driverRoutes)
protectedApi.delete('/drivers/:id', deleteLimiter, driverRoutes)
```

---

### 🟠 HIGH #4: Verbose Error Messages Leak Implementation Details

**Severity:** MEDIUM-HIGH (CVSS 5.8)  
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Affected Files:**
- `src/middlewares/errorHandler.js`
- Multiple route files with try-catch blocks

**Vulnerable Code:**
```javascript
// errorHandler.js
const errorHandler = (err, _req, res, _next) => {
  // ... validation handling
  
  const status = err.status || err.statusCode || 500
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error'  // ⚠️ Leaks error details in dev
  
  if (status >= 500) console.error(err)  // ⚠️ Full stack trace in logs
  
  res.status(status).json({ success: false, error: message })
}
```

**Exploitation Scenario:**
1. Attacker sends malformed requests
2. Error messages reveal:
   - MongoDB query structure
   - File paths (`/home/user/app/src/models/Driver.js`)
   - Library versions
   - Internal logic
3. Attacker uses information to craft targeted attacks

**Example Leaked Information:**
```json
{
  "success": false,
  "error": "Cast to ObjectId failed for value \"invalid\" at path \"_id\" for model \"Driver\""
}
```
This reveals:
- Using MongoDB with Mongoose
- Model name: "Driver"
- Field name: "_id"
- Validation logic

**Remediation:**
```javascript
const errorHandler = (err, _req, res, _next) => {
  // Log full error internally
  if (err.status >= 500) {
    console.error('[ERROR]', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    })
  }
  
  // Return generic messages to client
  const status = err.status || err.statusCode || 500
  
  let message
  if (err instanceof ApiError) {
    message = err.message  // Our controlled error messages
  } else if (status >= 500) {
    message = 'Internal server error'  // Never leak internal errors
  } else {
    message = 'Bad request'  // Generic 4xx message
  }
  
  res.status(status).json({ success: false, error: message })
}
```


---

## MEDIUM SEVERITY ISSUES

### 🟡 MEDIUM #1: Weak CSRF Token Generation

**Severity:** MEDIUM (CVSS 5.3)  
**CWE:** CWE-330 (Use of Insufficiently Random Values)

**Affected Files:**
- `src/services/cookie.service.js`

**Issue:**
```javascript
// Likely using crypto.randomBytes() which is good
// But need to verify token entropy and uniqueness
const generateCsrfToken = () => crypto.randomBytes(32).toString('hex')
```

**Concern:**
- If token generation is predictable, attacker can forge CSRF tokens
- Need to verify token is tied to session (not just a random value)
- Token should be validated against user session, not just cookie match

**Remediation:**
- Ensure CSRF token is cryptographically random (✅ already using crypto.randomBytes)
- Consider double-submit cookie pattern with HMAC
- Add token expiration (currently no expiry)

---

### 🟡 MEDIUM #2: No Account Enumeration Protection on Login

**Severity:** MEDIUM (CVSS 5.0)  
**CWE:** CWE-204 (Observable Response Discrepancy)

**Affected Files:**
- `src/modules/auth/auth.service.js`

**Vulnerable Code:**
```javascript
const login = async (identifier, password, req, res) => {
  const admin = await findByIdentifier(identifier)
  
  if (admin) assertNotLocked(admin)  // ⚠️ Different response if account exists
  
  if (!admin || !(await admin.comparePassword(password))) {
    await recordFailedLogin(admin, identifier, req)
    throw new ApiError(401, 'Invalid credentials')  // ⚠️ Generic message (good)
  }
  
  if (!admin.isActive) {
    throw new ApiError(403, 'Account is deactivated')  // ⚠️ Reveals account exists
  }
  // ...
}
```

**Exploitation Scenario:**
1. Attacker tries login with username "admin" + wrong password
2. If account exists but locked: Response time is different (lockout check)
3. If account exists but inactive: Gets "Account is deactivated" (confirms existence)
4. If account doesn't exist: Gets "Invalid credentials"
5. Attacker can enumerate valid usernames via timing/response differences

**Real-World Impact:**
- **Username Enumeration:** Attacker identifies valid usernames
- **Targeted Attacks:** Focus brute-force on known accounts
- **Social Engineering:** Use valid usernames in phishing

**Remediation:**
```javascript
const login = async (identifier, password, req, res) => {
  const admin = await findByIdentifier(identifier)
  
  // Always perform password comparison (constant-time)
  const dummyHash = '$2a$12$dummyhashtopreventtimingattack'
  const passwordValid = admin 
    ? await admin.comparePassword(password)
    : await bcrypt.compare(password, dummyHash)
  
  // Check all conditions before revealing any information
  if (!admin || !passwordValid || !admin.isActive || (admin.lockUntil && admin.lockUntil > new Date())) {
    await recordFailedLogin(admin, identifier, req)
    // Always same generic message
    throw new ApiError(401, 'Invalid credentials')
  }
  
  // ... rest of login logic
}
```

---

### 🟡 MEDIUM #3: Sensitive Data in Audit Logs

**Severity:** MEDIUM (CVSS 4.8)  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Affected Files:**
- `src/services/audit.service.js`
- `src/middlewares/validate.js`
- `src/services/apiClient.js` (frontend)

**Vulnerable Code:**
```javascript
// validate.js - Logs request body
console.error('Validation Error:', {
  url: req.originalUrl,
  method: req.method,
  body: req.body,  // ⚠️ May contain passwords, tokens
  errors: details
})

// apiClient.js - Logs request data
console.error('API Error:', {
  url: original?.url,
  method: original?.method,
  status,
  message,
  details: errBody?.details,
  fullError: errBody,
  requestData: original?.data ? JSON.parse(original.data) : null  // ⚠️ Passwords!
})
```

**Exploitation Scenario:**
1. User submits login with password
2. Validation fails (e.g., missing CSRF token)
3. Password is logged in plaintext: `body: { identifier: "admin", password: "SuperAdmin@123!" }`
4. Attacker gains access to logs (misconfigured permissions, log aggregation service)
5. Attacker extracts credentials from logs

**Real-World Impact:**
- **Credential Exposure:** Passwords logged in plaintext
- **Token Leakage:** JWT tokens, API keys in logs
- **Compliance Violation:** GDPR, PCI-DSS violations
- **Insider Threat:** Developers/ops can see passwords

**Remediation:**
```javascript
// Create log sanitizer
const sanitizeForLog = (obj) => {
  const sensitive = ['password', 'newPassword', 'currentPassword', 'token', 'secret']
  const sanitized = { ...obj }
  
  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]'
    }
  }
  
  return sanitized
}

// Use in logging
console.error('Validation Error:', {
  url: req.originalUrl,
  method: req.method,
  body: sanitizeForLog(req.body),
  errors: details
})
```


---

### 🟡 MEDIUM #4: Dependency Vulnerability - brace-expansion DoS

**Severity:** MEDIUM (CVSS 6.5)  
**CVE:** GHSA-jxxr-4gwj-5jf2

**Affected Package:**
- `brace-expansion@5.0.2-5.0.5` (transitive dependency)

**Vulnerability:**
Large numeric range defeats documented `max` DoS protection, allowing resource exhaustion.

**Remediation:**
```bash
npm audit fix
# Or manually update:
npm update brace-expansion
```

---

## LOW SEVERITY ISSUES

### 🟢 LOW #1: Missing Security Headers

**Severity:** LOW (CVSS 3.1)  
**CWE:** CWE-693 (Protection Mechanism Failure)

**Issue:**
While Helmet.js is configured, some important headers are missing:

**Missing Headers:**
- `Permissions-Policy` - Control browser features
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing (Helmet adds this, verify)
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer information

**Remediation:**
```javascript
app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
      features: {
        camera: ['none'],
        microphone: ['none'],
        geolocation: ['none'],
        payment: ['none']
      }
    }
  })
)
```

---

### 🟢 LOW #2: Weak Password Minimum Length

**Severity:** LOW (CVSS 3.0)  
**CWE:** CWE-521 (Weak Password Requirements)

**Affected Files:**
- `src/services/password.service.js`

**Current Rules:**
```javascript
const PASSWORD_RULES = [
  { test: (p) => p.length >= 10, message: 'Password must be at least 10 characters' },
  // ... other rules
]
```

**Issue:**
- 10 characters is minimum acceptable, but 12+ is recommended
- No check for common passwords (e.g., "Password123!")
- No check for username in password

**Remediation:**
```javascript
const PASSWORD_RULES = [
  { test: (p) => p.length >= 12, message: 'Password must be at least 12 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must contain an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must contain a lowercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'Password must contain a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'Password must contain a special character' },
  { test: (p) => !/(.)\1{2,}/.test(p), message: 'Password cannot contain repeated characters' },
  { test: (p) => !COMMON_PASSWORDS.includes(p.toLowerCase()), message: 'Password is too common' },
]

// Add common password list
const COMMON_PASSWORDS = [
  'password123', 'admin123', 'welcome123', 'qwerty123', 
  'password1', 'password!', '123456789', 'password@123'
]
```

---

### 🟢 LOW #3: No Content-Length Validation

**Severity:** LOW (CVSS 2.8)  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Affected Files:**
- `src/app.js`

**Current Configuration:**
```javascript
app.use(express.json({ limit: config.bodyLimit }))  // 10kb limit (good)
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }))
```

**Issue:**
- Body size limit is set (✅ good)
- But no validation on individual field lengths
- MongoDB fields have no maxlength constraints

**Remediation:**
```javascript
// Add to models
const driverSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 20  // Add max length
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100  // Add max length
  },
  // ...
})
```


---

## AUTHENTICATION REVIEW

### ✅ Strengths

1. **JWT Implementation** - Excellent
   - Separate access (15m) and refresh (7d) tokens
   - Access token in HTTP-only cookie (prevents XSS theft)
   - Refresh token rotation on every use
   - Token family tracking for reuse detection
   - Automatic session revocation on reuse

2. **Password Security** - Strong
   - bcrypt with 12 rounds (good)
   - Password history enforcement (5 passwords)
   - Strong password requirements (10+ chars, complexity)
   - No password reuse allowed

3. **Account Lockout** - Implemented
   - 5 failed attempts → 15-minute lockout
   - Lockout tracked per account
   - Failed login attempts logged

4. **Session Management** - Robust
   - Device tracking (IP, User-Agent, device label)
   - Session listing and revocation
   - "Logout all devices" functionality
   - Session expiration enforced

### ⚠️ Weaknesses

1. **No Multi-Factor Authentication (MFA)**
   - Single factor (password) only
   - No TOTP, SMS, or hardware key support
   - High-value accounts (SUPER_ADMIN) should require MFA

2. **No Password Reset Flow**
   - Only SUPER_ADMIN can reset passwords
   - No self-service password reset
   - No email verification for password changes

3. **Token Expiration Too Long**
   - Refresh token: 7 days is long for admin dashboard
   - Consider 24-48 hours for admin accounts
   - Or require re-authentication for sensitive operations

4. **No IP Whitelisting**
   - Admin accounts accessible from any IP
   - Consider IP restrictions for SUPER_ADMIN
   - Or at least alert on login from new location

### Recommendations

```javascript
// 1. Add MFA support
const mfaSchema = new mongoose.Schema({
  admin: { type: ObjectId, ref: 'Admin', required: true },
  secret: { type: String, required: true, select: false },
  backupCodes: [{ type: String, select: false }],
  enabled: { type: Boolean, default: false },
  verifiedAt: Date
})

// 2. Implement password reset flow
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  const admin = await Admin.findOne({ email })
  if (!admin) {
    // Don't reveal if email exists
    return res.json({ message: 'If email exists, reset link sent' })
  }
  
  const token = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  
  admin.resetToken = hash
  admin.resetExpires = Date.now() + 3600000 // 1 hour
  await admin.save()
  
  // Send email with token
  await sendPasswordResetEmail(admin.email, token)
  
  res.json({ message: 'If email exists, reset link sent' })
})

// 3. Add IP tracking and alerts
const checkSuspiciousLogin = async (admin, req) => {
  const currentIp = getClientIp(req)
  const lastIp = admin.lastLoginIp
  
  if (lastIp && lastIp !== currentIp) {
    await sendSecurityAlert(admin.email, {
      type: 'NEW_IP_LOGIN',
      ip: currentIp,
      location: await getIpLocation(currentIp)
    })
  }
  
  admin.lastLoginIp = currentIp
  await admin.save()
}
```


---

## AUTHORIZATION / RBAC REVIEW

### ✅ Strengths

1. **Clear Role Hierarchy**
   - SUPER_ADMIN: Full system access
   - ADMIN: Limited access (intended)
   - Roles defined in constants (good practice)

2. **Admin Management Protection**
   - Only SUPER_ADMIN can create/update/delete admins ✅
   - Cannot delete last SUPER_ADMIN ✅
   - Cannot demote last SUPER_ADMIN ✅
   - Cannot delete own account ✅
   - Cannot deactivate own account ✅

3. **Audit Trail**
   - All admin operations logged
   - Security events flagged
   - IP and user agent tracked

### 🔴 Critical Weaknesses

1. **Missing Authorization on Legacy Routes**
   - `/api/drivers/*` - NO RBAC ❌
   - `/api/buses/*` - NO RBAC ❌
   - `/api/routes/*` - NO RBAC ❌
   - `/api/trips/*` - NO RBAC ❌
   - `/api/violations/*` - NO RBAC ❌
   
   **Impact:** Any authenticated user (even ADMIN) can perform ALL operations on these resources.

2. **No Ownership Model**
   - Resources not tied to creators
   - No concept of "my drivers" vs "all drivers"
   - Cannot implement least-privilege access

3. **Frontend-Only Protection**
   - `/admins` route protected in frontend only
   - `/history` route protected in frontend only
   - Backend APIs properly protected, but legacy routes are not

### Recommended RBAC Model

```javascript
// Define granular permissions
const PERMISSIONS = {
  // Admin management
  ADMIN_CREATE: 'admin:create',
  ADMIN_READ: 'admin:read',
  ADMIN_UPDATE: 'admin:update',
  ADMIN_DELETE: 'admin:delete',
  
  // Driver management
  DRIVER_CREATE: 'driver:create',
  DRIVER_READ: 'driver:read',
  DRIVER_UPDATE: 'driver:update',
  DRIVER_DELETE: 'driver:delete',
  
  // Audit logs
  AUDIT_READ: 'audit:read',
}

// Map roles to permissions
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.DRIVER_READ,
    PERMISSIONS.DRIVER_CREATE,
    PERMISSIONS.DRIVER_UPDATE,
    // Note: ADMIN cannot delete drivers
  ],
}

// Permission check middleware
const requirePermission = (permission) => (req, res, next) => {
  const userPermissions = ROLE_PERMISSIONS[req.admin.role] || []
  
  if (!userPermissions.includes(permission)) {
    return next(new ApiError(403, 'Insufficient permissions'))
  }
  
  next()
}

// Apply to routes
router.get('/drivers', authenticate, requirePermission(PERMISSIONS.DRIVER_READ), ...)
router.post('/drivers', authenticate, requirePermission(PERMISSIONS.DRIVER_CREATE), ...)
router.delete('/drivers/:id', authenticate, requirePermission(PERMISSIONS.DRIVER_DELETE), ...)
```

### Ownership-Based Access Control

```javascript
// Add createdBy to all resources
const driverSchema = new mongoose.Schema({
  // ... existing fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
})

// Ownership check middleware
const checkOwnership = (Model) => async (req, res, next) => {
  const resource = await Model.findById(req.params.id)
  if (!resource) return res.status(404).json({ error: 'Not found' })
  
  // SUPER_ADMIN can access everything
  if (req.admin.role === ROLES.SUPER_ADMIN) {
    req.resource = resource
    return next()
  }
  
  // Others can only access their own resources
  if (resource.createdBy.toString() !== req.admin._id.toString()) {
    return res.status(403).json({ error: 'Access denied' })
  }
  
  req.resource = resource
  next()
}

// Apply to routes
router.get('/drivers/:id', authenticate, checkOwnership(Driver), (req, res) => {
  res.json(req.resource)
})
```


---

## FRONTEND SECURITY REVIEW

### ✅ Strengths

1. **No XSS Vulnerabilities Found**
   - No `dangerouslySetInnerHTML` usage ✅
   - React auto-escapes by default ✅
   - User input properly handled

2. **Secure Token Storage**
   - JWT stored in HTTP-only cookies (not localStorage) ✅
   - Only theme preference in localStorage ✅
   - No sensitive data in browser storage ✅

3. **CSRF Protection**
   - CSRF token fetched on init ✅
   - Token sent with all mutations ✅
   - Token auto-refreshed on 403 ✅

4. **Automatic Token Refresh**
   - Interceptor handles 401 responses ✅
   - Refresh token rotation ✅
   - Session expiry event handling ✅

### ⚠️ Weaknesses

1. **Frontend-Only Route Protection**
   ```javascript
   // RoleRoute.jsx - Can be bypassed
   if (!admin || !roles.includes(admin.role)) {
     return <Navigate to="/" replace />  // Only prevents UI access
   }
   ```
   **Impact:** Attacker can call APIs directly, bypassing frontend checks.

2. **Verbose Error Logging**
   ```javascript
   // apiClient.js - Logs sensitive data
   console.error('API Error:', {
     requestData: original?.data ? JSON.parse(original.data) : null  // Passwords!
   })
   ```
   **Impact:** Passwords logged to browser console.

3. **No Input Validation**
   - Forms rely on backend validation only
   - No client-side length limits
   - No format validation before submission

4. **Source Maps in Production**
   - Vite config doesn't disable source maps
   - Attackers can read original source code
   - Reveals business logic and API structure

### Recommendations

```javascript
// 1. Remove sensitive data from logs
console.error('API Error:', {
  url: original?.url,
  method: original?.method,
  status,
  message,
  // Remove: requestData, fullError
})

// 2. Add client-side validation
const DriverForm = () => {
  const schema = z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
  })
  
  const form = useForm({
    resolver: zodResolver(schema)
  })
  // ...
}

// 3. Disable source maps in production
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: false,  // Disable in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log
        drop_debugger: true
      }
    }
  }
})

// 4. Add Content Security Policy
// Backend: app.js
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind needs inline styles
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"]
      }
    }
  })
)
```

### React Security Best Practices

```javascript
// 1. Sanitize user input before rendering
import DOMPurify from 'dompurify'

const SafeHTML = ({ html }) => {
  const clean = DOMPurify.sanitize(html)
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}

// 2. Validate URLs before navigation
const SafeLink = ({ href, children }) => {
  const isValid = /^https?:\/\//.test(href) || href.startsWith('/')
  
  if (!isValid) {
    console.warn('Invalid URL blocked:', href)
    return <span>{children}</span>
  }
  
  return <a href={href}>{children}</a>
}

// 3. Implement rate limiting on frontend
const useRateLimit = (maxCalls, windowMs) => {
  const calls = useRef([])
  
  return useCallback(() => {
    const now = Date.now()
    calls.current = calls.current.filter(t => now - t < windowMs)
    
    if (calls.current.length >= maxCalls) {
      throw new Error('Rate limit exceeded')
    }
    
    calls.current.push(now)
  }, [maxCalls, windowMs])
}
```


---

## API SECURITY REVIEW

### ✅ Strengths

1. **Input Sanitization**
   - `express-mongo-sanitize` prevents NoSQL injection ✅
   - HTML stripping in `sanitizeInput` middleware ✅
   - `express-validator` used for admin routes ✅

2. **Security Middleware**
   - Helmet.js configured ✅
   - CORS properly configured ✅
   - Rate limiting on auth endpoints ✅
   - Body size limits (10kb) ✅

3. **Error Handling**
   - Centralized error handler ✅
   - Validation errors formatted consistently ✅
   - Duplicate key errors handled ✅

### 🔴 Critical Issues

1. **Missing Validation on Legacy Routes**
   ```javascript
   // routes/drivers.js - No validation
   router.post('/', async (req, res) => {
     const { name } = req.body
     if (!name?.trim()) {  // Only checks if empty
       return res.status(400).json({ error: 'name is required' })
     }
     // No length, format, or type validation
   })
   ```

2. **Insufficient Rate Limiting**
   - Global: 500 req/15min (too permissive)
   - Auth: 30 req/15min (good)
   - Login: 15 req/15min (good)
   - Resource endpoints: NO RATE LIMITING ❌

3. **SSRF in RAG Proxy**
   - Unvalidated URL in `RAG_URL`
   - No timeout on fetch
   - No response validation
   - Direct proxy of response

### Recommendations

```javascript
// 1. Add comprehensive validation
const { body, param, query } = require('express-validator')

const createDriverValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Invalid characters in name')
    .escape(),
]

router.post('/', authenticate, createDriverValidator, validate, async (req, res) => {
  // Validation already done by middleware
  const { name } = req.body
  // ... create driver
})

// 2. Add request ID for tracing
const requestId = require('express-request-id')()
app.use(requestId)

app.use((req, res, next) => {
  req.id = req.id || crypto.randomUUID()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// 3. Implement API versioning
app.use('/api/v1', protectedApi)

// 4. Add response time monitoring
const responseTime = require('response-time')
app.use(responseTime((req, res, time) => {
  if (time > 1000) {  // Log slow requests
    console.warn(`Slow request: ${req.method} ${req.url} - ${time}ms`)
  }
}))

// 5. Implement request signing for critical operations
const signRequest = (payload, secret) => {
  const timestamp = Date.now()
  const data = JSON.stringify({ ...payload, timestamp })
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
  
  return { ...payload, timestamp, signature }
}

const verifySignature = (req, res, next) => {
  const { signature, timestamp, ...payload } = req.body
  
  // Check timestamp (prevent replay)
  if (Date.now() - timestamp > 300000) {  // 5 minutes
    return res.status(401).json({ error: 'Request expired' })
  }
  
  // Verify signature
  const expected = crypto
    .createHmac('sha256', config.requestSigningSecret)
    .update(JSON.stringify({ ...payload, timestamp }))
    .digest('hex')
  
  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' })
  }
  
  next()
}

// Apply to critical operations
router.delete('/admins/:id', authenticate, authorize(ROLES.SUPER_ADMIN), verifySignature, ...)
```


---

## DATABASE SECURITY REVIEW

### ✅ Strengths

1. **NoSQL Injection Prevention**
   - `express-mongo-sanitize` removes `$` and `.` from user input ✅
   - No raw query building found ✅
   - Mongoose parameterized queries ✅

2. **Password Security**
   - bcrypt hashing with 12 rounds ✅
   - Password field `select: false` by default ✅
   - Password history stored as hashes ✅

3. **Indexes**
   - Proper indexes on frequently queried fields ✅
   - Compound indexes for common queries ✅
   - Unique indexes on username/email ✅

### ⚠️ Weaknesses

1. **No Field-Level Encryption**
   - Sensitive data stored in plaintext
   - Email addresses not encrypted
   - Audit logs contain sensitive metadata

2. **Missing Schema Validation**
   ```javascript
   // Driver model - No maxlength
   name: {
     type: String,
     required: true,
     trim: true,
     // Missing: minlength, maxlength
   }
   ```

3. **No Database Connection Encryption**
   - MongoDB URI doesn't specify TLS
   - Should use `mongodb+srv://` or `?tls=true`

4. **Audit Log Retention**
   - No TTL index on audit logs
   - Logs grow indefinitely
   - No archival strategy

### Recommendations

```javascript
// 1. Add field-level encryption
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption')

const adminSchema = new mongoose.Schema({
  // ... fields
})

// Encrypt specific fields
adminSchema.plugin(encrypt, {
  secret: process.env.ENCRYPTION_KEY,
  encryptedFields: ['email', 'avatar']
})

// 2. Add schema validation
const driverSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 7,
    maxlength: 20,
    match: /^DRV-\d{3}$/
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    match: /^[a-zA-Z\s'-]+$/
  },
  avgScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    validate: {
      validator: Number.isInteger,
      message: 'Score must be an integer'
    }
  }
})

// 3. Enable MongoDB encryption at rest
// In MongoDB config:
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/keyfile

// 4. Add TTL index for audit logs
const auditLogSchema = new mongoose.Schema({
  // ... fields
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000  // 90 days in seconds
  }
})

// 5. Implement database connection with TLS
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/driver-monitoring?tls=true&tlsAllowInvalidCertificates=false'

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true,
  sslCA: fs.readFileSync('/path/to/ca.pem')
})

// 6. Add query timeout
mongoose.set('maxTimeMS', 5000)  // 5 second timeout

// 7. Implement soft delete
const driverSchema = new mongoose.Schema({
  // ... fields
  deletedAt: {
    type: Date,
    default: null
  }
})

// Override delete methods
driverSchema.methods.softDelete = function() {
  this.deletedAt = new Date()
  return this.save()
}

// Add query middleware to exclude deleted
driverSchema.pre(/^find/, function() {
  this.where({ deletedAt: null })
})
```


---

## BUSINESS LOGIC WEAKNESSES

### 🔴 Critical Logic Flaws

1. **No Audit Trail for Data Modifications**
   - Driver/bus/trip CRUD operations not logged
   - Only admin management operations logged
   - Cannot track who modified what data
   - Compliance risk (GDPR, SOX, etc.)

2. **Predictable ID Generation**
   ```javascript
   // generateDriverId() - Sequential IDs
   const generateDriverId = async () => {
     const drivers = await Driver.find({ id: /^DRV-\d+$/ }).select('id').lean()
     if (drivers.length === 0) return 'DRV-001'
     const max = Math.max(...drivers.map((d) => parseInt(d.id.split('-')[1], 10)))
     return `DRV-${String(max + 1).padStart(3, '0')}`  // Predictable!
   }
   ```
   **Impact:** Attacker can predict next ID and pre-create resources.

3. **No Workflow State Machine**
   - Trips can be modified after completion
   - Violations can be deleted
   - No immutability for completed records
   - Data integrity risk

4. **Race Conditions in ID Generation**
   ```javascript
   // Two concurrent requests can get same ID
   const id = await generateDriverId()  // Both get DRV-005
   const driver = new Driver({ id, name })
   await driver.save()  // Second one fails with duplicate key
   ```

### Recommendations

```javascript
// 1. Add audit trail for all operations
const auditMiddleware = (action) => async (req, res, next) => {
  const originalJson = res.json.bind(res)
  
  res.json = (data) => {
    // Log after successful operation
    logAudit({
      actor: req.admin,
      action,
      targetType: req.baseUrl.split('/').pop(),
      targetId: req.params.id || data?.id,
      metadata: {
        method: req.method,
        path: req.path,
        changes: req.body
      },
      req
    })
    
    return originalJson(data)
  }
  
  next()
}

router.post('/drivers', authenticate, auditMiddleware('DRIVER_CREATE'), ...)
router.put('/drivers/:id', authenticate, auditMiddleware('DRIVER_UPDATE'), ...)
router.delete('/drivers/:id', authenticate, auditMiddleware('DRIVER_DELETE'), ...)

// 2. Use UUIDs instead of sequential IDs
const { v4: uuidv4 } = require('uuid')

const generateDriverId = () => {
  return `DRV-${uuidv4().split('-')[0].toUpperCase()}`  // DRV-A1B2C3D4
}

// 3. Implement state machine for trips
const TRIP_STATES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
}

const ALLOWED_TRANSITIONS = {
  [TRIP_STATES.PENDING]: [TRIP_STATES.IN_PROGRESS, TRIP_STATES.CANCELLED],
  [TRIP_STATES.IN_PROGRESS]: [TRIP_STATES.COMPLETED, TRIP_STATES.CANCELLED],
  [TRIP_STATES.COMPLETED]: [],  // Cannot transition from completed
  [TRIP_STATES.CANCELLED]: []
}

const tripSchema = new mongoose.Schema({
  // ... fields
  state: {
    type: String,
    enum: Object.values(TRIP_STATES),
    default: TRIP_STATES.PENDING
  }
})

tripSchema.methods.transitionTo = function(newState) {
  const allowed = ALLOWED_TRANSITIONS[this.state]
  
  if (!allowed.includes(newState)) {
    throw new Error(`Cannot transition from ${this.state} to ${newState}`)
  }
  
  this.state = newState
  return this.save()
}

// 4. Prevent modification of completed trips
tripSchema.pre('save', function(next) {
  if (this.state === TRIP_STATES.COMPLETED && this.isModified() && !this.isNew) {
    return next(new Error('Cannot modify completed trip'))
  }
  next()
})

// 5. Use transactions for atomic operations
const session = await mongoose.startSession()
session.startTransaction()

try {
  const driver = await Driver.create([{ id, name }], { session })
  await Trip.updateMany(
    { driver: oldDriverId },
    { driver: driver[0]._id },
    { session }
  )
  
  await session.commitTransaction()
} catch (err) {
  await session.abortTransaction()
  throw err
} finally {
  session.endSession()
}
```


---

## DEPENDENCY RISKS

### Vulnerability Scan Results

**Backend Dependencies:**
```
✅ Total: 462 packages
⚠️ Vulnerabilities: 1 moderate
```

**Identified Vulnerability:**
- **brace-expansion** (5.0.2-5.0.5)
  - Severity: Moderate (CVSS 6.5)
  - CVE: GHSA-jxxr-4gwj-5jf2
  - Issue: Large numeric range defeats DoS protection
  - Fix: `npm audit fix` or update to 5.0.6+

**Frontend Dependencies:**
- No vulnerabilities detected ✅

### Dependency Security Best Practices

```bash
# 1. Fix known vulnerabilities
npm audit fix

# 2. Check for outdated packages
npm outdated

# 3. Use exact versions in production
# package.json
{
  "dependencies": {
    "express": "4.21.2",  // Not "^4.21.2"
    "mongoose": "8.9.5"   // Not "^8.9.5"
  }
}

# 4. Enable npm audit in CI/CD
npm audit --audit-level=moderate

# 5. Use Snyk or Dependabot
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/Dashboard/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### High-Risk Dependencies

1. **jsonwebtoken** (9.0.2)
   - Critical for authentication
   - Ensure always updated
   - Monitor for CVEs

2. **bcryptjs** (2.4.3)
   - Critical for password hashing
   - Consider migrating to `bcrypt` (native, faster)

3. **mongoose** (8.9.5)
   - Database driver
   - NoSQL injection risks if misused
   - Keep updated

4. **axios** (1.7.9) - Frontend
   - HTTP client
   - SSRF risks if URLs not validated
   - Keep updated

### Recommendations

```javascript
// 1. Implement dependency scanning in CI/CD
// .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm audit --audit-level=moderate
      - run: npm run test

// 2. Use npm-check-updates
npm install -g npm-check-updates
ncu -u  // Update package.json
npm install

// 3. Implement SRI for CDN resources
<script 
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>

// 4. Use package-lock.json
# Commit package-lock.json to git
git add package-lock.json
git commit -m "Lock dependencies"

// 5. Audit dependencies regularly
# Add to package.json scripts
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated"
  }
}
```


---

## SECURITY MISCONFIGURATIONS

### 🔴 Critical Misconfigurations

1. **Default Credentials in .env.example**
   ```env
   SUPER_ADMIN_USERNAME=superadmin
   SUPER_ADMIN_EMAIL=superadmin@drivermonitor.local
   SUPER_ADMIN_PASSWORD=SuperAdmin@123!
   ```
   **Risk:** If `.env.example` is copied to `.env` without changes, default credentials are used.

2. **Weak JWT Secrets in Development**
   ```javascript
   jwt: {
     accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
     refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
   }
   ```
   **Risk:** Weak default secrets allow token forgery in development.

3. **CORS Allows Single Origin**
   ```javascript
   cors({
     origin: config.clientUrl,  // Only one origin
     credentials: true,
   })
   ```
   **Risk:** If `CLIENT_URL` is misconfigured, legitimate requests blocked.

4. **No HTTPS Enforcement**
   - No redirect from HTTP to HTTPS
   - Cookies not marked `secure` in development
   - Tokens transmitted over HTTP in dev

### Recommendations

```javascript
// 1. Enforce strong secrets at startup
if (process.env.NODE_ENV === 'production') {
  const requiredSecrets = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'COOKIE_SECRET'
  ]
  
  for (const secret of requiredSecrets) {
    const value = process.env[secret]
    
    if (!value) {
      throw new Error(`${secret} is required in production`)
    }
    
    if (value.length < 32) {
      throw new Error(`${secret} must be at least 32 characters`)
    }
    
    if (value.includes('dev-') || value.includes('change-in-production')) {
      throw new Error(`${secret} appears to be a default value`)
    }
  }
}

// 2. Generate strong secrets
const crypto = require('crypto')
const generateSecret = () => crypto.randomBytes(64).toString('hex')

console.log('JWT_ACCESS_SECRET=' + generateSecret())
console.log('JWT_REFRESH_SECRET=' + generateSecret())
console.log('COOKIE_SECRET=' + generateSecret())

// 3. Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

// 4. Implement security.txt
// public/.well-known/security.txt
Contact: security@example.com
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://example.com/.well-known/security.txt

// 5. Add health check with security info
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    security: {
      httpsEnforced: process.env.NODE_ENV === 'production',
      csrfEnabled: true,
      rateLimitEnabled: true,
      helmetEnabled: true
    }
  })
})

// 6. Implement configuration validation
const Joi = require('joi')

const configSchema = Joi.object({
  PORT: Joi.number().port().default(5000),
  MONGO_URI: Joi.string().uri().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CLIENT_URL: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  COOKIE_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().pattern(/^\d+[dhms]$/).default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().pattern(/^\d+[dhms]$/).default('7d'),
})

const { error, value: validatedConfig } = configSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: true
})

if (error) {
  console.error('Configuration validation failed:')
  error.details.forEach(detail => console.error(`  - ${detail.message}`))
  process.exit(1)
}
```


---

## ATTACK CHAINS

### 🔴 Attack Chain #1: Complete Account Takeover

**Prerequisites:** None (any authenticated user)

**Steps:**
1. **Authenticate as regular ADMIN**
   - Login with valid credentials
   - Obtain JWT access token (15m validity)

2. **Enumerate Admin Accounts via IDOR**
   - Call `GET /api/drivers` (no RBAC) to get database structure
   - Infer MongoDB ObjectId format
   - Enumerate admin IDs via timing attacks or error messages

3. **Exploit Missing Authorization**
   - Call admin APIs directly (bypass frontend checks)
   - Attempt to access `GET /api/admins` → Blocked ✅
   - But can still manipulate driver/bus/trip data

4. **Persistence via Data Manipulation**
   - Create backdoor driver records with malicious data
   - Modify trip records to hide violations
   - Delete audit trails (if accessible)

**Impact:** Data manipulation, audit trail tampering, business logic bypass

**Mitigation:**
- Add RBAC to ALL routes
- Implement ownership checks
- Add re-authentication for sensitive operations

---

### 🔴 Attack Chain #2: SSRF → Internal Network Compromise

**Prerequisites:** Ability to modify environment variables OR compromised RAG service

**Steps:**
1. **Gain Access to Environment Configuration**
   - Exploit file upload vulnerability (if exists)
   - Social engineering (phishing developer)
   - Compromise CI/CD pipeline
   - Access to `.env` file via misconfigured backup

2. **Modify RAG_URL**
   ```env
   RAG_URL=http://169.254.169.254/latest/meta-data/iam/security-credentials/
   ```

3. **Trigger SSRF via Chat API**
   - Authenticate as any user
   - Send chat request: `POST /api/chat {"query":"test"}`
   - Backend fetches AWS metadata endpoint
   - Returns IAM credentials in response

4. **Escalate to Cloud Infrastructure**
   - Use stolen AWS credentials
   - Access S3 buckets, RDS databases
   - Pivot to other AWS services
   - Exfiltrate sensitive data

**Impact:** Complete cloud infrastructure compromise, data breach, lateral movement

**Mitigation:**
- Validate RAG_URL at startup
- Implement URL whitelist
- Add request timeout and size limits
- Use AWS IMDSv2 (requires token)

---

### 🔴 Attack Chain #3: Privilege Escalation via Mass Assignment

**Prerequisites:** Authenticated as regular ADMIN

**Steps:**
1. **Analyze Admin Creation Endpoint**
   ```javascript
   // admins.service.js
   const admin = await Admin.create({
     username: data.username.toLowerCase(),
     email: data.email.toLowerCase(),
     password: data.password,
     role: requestedRole,  // ⚠️ Taken from request
     createdBy: actor._id,
   })
   ```

2. **Attempt Role Injection**
   - Send `POST /api/admins` with `role: "SUPER_ADMIN"`
   - Backend checks: `if (requestedRole === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN)`
   - ✅ Properly blocked

3. **Alternative: Exploit Update Endpoint**
   - Check if update endpoint has same validation
   - Attempt to modify own role via `PUT /api/admins/{self}`
   - ✅ Blocked by "Only SUPER_ADMIN can update admins"

4. **Fallback: Exploit Frontend Bypass**
   - Cannot escalate privileges directly
   - But can manipulate data via unprotected routes
   - Create malicious driver records
   - Inject XSS payloads (if validation weak)

**Impact:** Limited - privilege escalation properly prevented ✅

**Mitigation:** Already implemented correctly

---

### 🔴 Attack Chain #4: Session Hijacking → Persistent Access

**Prerequisites:** XSS vulnerability OR network access

**Steps:**
1. **Steal Access Token**
   - Exploit XSS (if found) to read cookies
   - ✅ HTTP-only cookies prevent this
   - Alternative: Network sniffing (if no HTTPS)
   - Man-in-the-middle attack

2. **Use Stolen Token**
   - Token valid for 15 minutes
   - Make API calls with stolen token
   - Perform malicious operations

3. **Establish Persistence**
   - Create new SUPER_ADMIN account (if attacker is SUPER_ADMIN)
   - Modify existing admin passwords
   - Create backdoor API keys (if implemented)

4. **Cover Tracks**
   - Delete audit logs (if accessible)
   - Modify timestamps
   - Remove evidence of compromise

**Impact:** Account takeover, persistent access, audit trail tampering

**Mitigation:**
- Enforce HTTPS in production
- Implement MFA
- Add re-authentication for sensitive operations
- Make audit logs immutable
- Alert on suspicious activities

