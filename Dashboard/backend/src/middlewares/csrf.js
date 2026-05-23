const ApiError = require('../utils/ApiError')
const config = require('../config')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const csrfProtection = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next()

  const publicPaths = ['/api/auth/login', '/api/auth/csrf-token']
  if (publicPaths.some((p) => req.path === p || req.originalUrl.endsWith(p))) {
    return next()
  }

  const cookieToken = req.cookies?.[config.csrfCookie]
  const headerToken = req.headers['x-csrf-token']

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(403, 'Invalid CSRF token'))
  }

  next()
}

module.exports = csrfProtection
