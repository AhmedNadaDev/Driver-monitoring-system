require('dotenv').config()

const requiredInProduction = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET']

if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/driver-monitoring',
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME || 'superadmin',
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@drivermonitor.local',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123!',
  },
  lockout: {
    maxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10),
    lockDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || String(15 * 60 * 1000), 10),
  },
  password: {
    historyCount: parseInt(process.env.PASSWORD_HISTORY_COUNT || '5', 10),
  },
  bcryptRounds: 12,
  accessTokenCookie: 'access_token',
  refreshTokenCookie: 'refresh_token',
  csrfCookie: 'csrf_token',
  bodyLimit: process.env.BODY_LIMIT || '10kb',
}
