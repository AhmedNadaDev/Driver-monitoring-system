const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoSanitize = require('express-mongo-sanitize')
const rateLimit = require('express-rate-limit')
const config = require('./config')
const csrfProtection = require('./middlewares/csrf')
const sanitizeInput = require('./middlewares/sanitizeInput')
const errorHandler = require('./middlewares/errorHandler')
const { authenticate } = require('./middlewares/auth')
const { sendSuccess } = require('./utils/response')

const authRoutes = require('./modules/auth/auth.routes')
const adminsRoutes = require('./modules/admins/admins.routes')
const historyRoutes = require('./modules/history/history.routes')

const driverRoutes = require('../routes/drivers')
const routeRoutes = require('../routes/routes')
const busRoutes = require('../routes/buses')
const tripRoutes = require('../routes/trips')
const violationRoutes = require('../routes/violations')

const app = express()

app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
)

app.use(express.json({ limit: config.bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }))
app.use(cookieParser(config.cookie.secret))
app.use(mongoSanitize())
app.use(sanitizeInput)

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

app.use(csrfProtection)

app.get('/health', (_req, res) => sendSuccess(res, { status: 'ok' }))

app.use('/api/auth', authRoutes)
app.use('/api/admins', adminsRoutes)
app.use('/api/history', historyRoutes)

const protectedApi = express.Router()
protectedApi.use(authenticate)
protectedApi.use('/drivers', driverRoutes)
protectedApi.use('/routes', routeRoutes)
protectedApi.use('/buses', busRoutes)
protectedApi.use('/trips', tripRoutes)
protectedApi.use('/violations', violationRoutes)

app.use('/api', protectedApi)

const RAG_URL = process.env.RAG_URL || 'http://localhost:8001'

app.post('/api/chat', authenticate, async (req, res, next) => {
  const { query } = req.body
  if (!query?.trim()) {
    return res.status(400).json({ success: false, error: 'query is required' })
  }
  try {
    const upstream = await fetch(`${RAG_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    next(err)
  }
})

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

app.use(errorHandler)

module.exports = app
