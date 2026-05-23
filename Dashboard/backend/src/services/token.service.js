const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const config = require('../config')
const RefreshToken = require('../models/RefreshToken')
const ApiError = require('../utils/ApiError')
const { getClientIp, sanitizeUserAgent, parseDeviceLabel } = require('../utils/request')
const { logTokenReuse } = require('./security.service')

const hashToken = (token) =>
  crypto.createHmac('sha256', config.cookie.secret).update(token).digest('hex')

const signAccessToken = (admin) =>
  jwt.sign(
    { sub: admin._id.toString(), role: admin.role, username: admin.username },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  )

const parseRefreshExpiry = () => {
  const match = /^(\d+)([dhms])$/.exec(config.jwt.refreshExpiresIn)
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const value = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 }
  return value * multipliers[unit]
}

const createRefreshSession = async (admin, req) => {
  const familyId = crypto.randomUUID()
  const rawToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + parseRefreshExpiry())
  const userAgent = sanitizeUserAgent(req?.get?.('user-agent'))

  await RefreshToken.create({
    admin: admin._id,
    tokenHash,
    familyId,
    expiresAt,
    ip: req ? getClientIp(req) : null,
    userAgent,
    deviceLabel: parseDeviceLabel(userAgent),
    lastUsedAt: new Date(),
  })

  const refreshJwt = jwt.sign(
    { sub: admin._id.toString(), familyId, jti: tokenHash },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  )

  return { refreshJwt, rawToken, familyId, tokenHash }
}

const rotateRefreshToken = async (refreshJwt, req) => {
  let payload
  try {
    payload = jwt.verify(refreshJwt, config.jwt.refreshSecret)
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const existing = await RefreshToken.findOne({ tokenHash: payload.jti })

  if (!existing || existing.revokedAt) {
    if (existing?.familyId && payload.sub) {
      await logTokenReuse(payload.sub, existing.familyId, req)
    }
    throw new ApiError(401, 'Refresh token reuse detected — all sessions revoked')
  }

  if (existing.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token expired')
  }

  const Admin = require('../models/Admin')
  const admin = await Admin.findById(payload.sub)
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Account inactive or not found')
  }

  const newRaw = crypto.randomBytes(48).toString('hex')
  const newHash = hashToken(newRaw)
  const expiresAt = new Date(Date.now() + parseRefreshExpiry())
  const userAgent = sanitizeUserAgent(req?.get?.('user-agent'))

  existing.revokedAt = new Date()
  existing.replacedByTokenHash = newHash
  await existing.save()

  await RefreshToken.create({
    admin: admin._id,
    tokenHash: newHash,
    familyId: existing.familyId,
    expiresAt,
    ip: req ? getClientIp(req) : null,
    userAgent,
    deviceLabel: parseDeviceLabel(userAgent),
    lastUsedAt: new Date(),
  })

  const newRefreshJwt = jwt.sign(
    { sub: admin._id.toString(), familyId: existing.familyId, jti: newHash },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  )

  return { admin, accessToken: signAccessToken(admin), refreshJwt: newRefreshJwt }
}

const revokeRefreshToken = async (refreshJwt) => {
  try {
    const payload = jwt.verify(refreshJwt, config.jwt.refreshSecret)
    await RefreshToken.updateOne(
      { tokenHash: payload.jti },
      { revokedAt: new Date() }
    )
  } catch {
    /* token already invalid */
  }
}

const revokeAllSessions = async (adminId) => {
  await RefreshToken.updateMany(
    { admin: adminId, revokedAt: null },
    { revokedAt: new Date() }
  )
}

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret)
  } catch {
    throw new ApiError(401, 'Invalid or expired access token')
  }
}

module.exports = {
  hashToken,
  signAccessToken,
  createRefreshSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
  verifyAccessToken,
}
