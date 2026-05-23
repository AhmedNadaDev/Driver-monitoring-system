const Admin = require('../models/Admin')
const ApiError = require('../utils/ApiError')
const { verifyAccessToken } = require('../services/token.service')
const config = require('../config')

const extractAccessToken = (req) => {
  const fromCookie = req.cookies?.[config.accessTokenCookie]
  if (fromCookie) return fromCookie
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return null
}

const authenticate = async (req, _res, next) => {
  try {
    const token = extractAccessToken(req)
    if (!token) throw new ApiError(401, 'Authentication required')

    const payload = verifyAccessToken(token)
    const admin = await Admin.findById(payload.sub)
    if (!admin || !admin.isActive) {
      throw new ApiError(401, 'Account inactive or not found')
    }

    req.admin = admin
    req.tokenPayload = payload
    next()
  } catch (err) {
    next(err instanceof ApiError ? err : new ApiError(401, 'Authentication failed'))
  }
}

const authorize = (...roles) => (req, _res, next) => {
  if (!req.admin) return next(new ApiError(401, 'Authentication required'))
  if (!roles.includes(req.admin.role)) {
    return next(new ApiError(403, 'Insufficient permissions'))
  }
  next()
}

module.exports = { authenticate, authorize, extractAccessToken }
