const jwt = require('jsonwebtoken')
const RefreshToken = require('../models/RefreshToken')
const config = require('../config')
const ApiError = require('../utils/ApiError')
const { parseDeviceLabel } = require('../utils/request')
const { logAudit } = require('./audit.service')
const { AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants')

const getCurrentSessionHash = (req) => {
  const refreshJwt = req.cookies?.[config.refreshTokenCookie]
  if (!refreshJwt) return null
  try {
    const payload = jwt.verify(refreshJwt, config.jwt.refreshSecret)
    return payload.jti
  } catch {
    return null
  }
}

const listActiveSessions = async (adminId, req) => {
  const currentHash = getCurrentSessionHash(req)
  const now = new Date()

  const sessions = await RefreshToken.find({
    admin: adminId,
    revokedAt: null,
    expiresAt: { $gt: now },
  })
    .sort({ lastUsedAt: -1 })
    .select('ip userAgent deviceLabel createdAt lastUsedAt expiresAt tokenHash')
    .lean()

  return sessions.map((s) => ({
    id: s._id.toString(),
    deviceLabel: s.deviceLabel || parseDeviceLabel(s.userAgent),
    ip: s.ip,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    expiresAt: s.expiresAt,
    isCurrent: s.tokenHash === currentHash,
  }))
}

const revokeSession = async (adminId, sessionId, req) => {
  const session = await RefreshToken.findOne({
    _id: sessionId,
    admin: adminId,
    revokedAt: null,
  })

  if (!session) throw new ApiError(404, 'Session not found')

  const currentHash = getCurrentSessionHash(req)
  if (session.tokenHash === currentHash) {
    throw new ApiError(400, 'Cannot revoke the current session from this endpoint')
  }

  session.revokedAt = new Date()
  await session.save()

  await logAudit({
    actor: req.admin,
    action: AUDIT_ACTIONS.SESSION_REVOKED,
    targetType: TARGET_TYPES.SESSION,
    targetId: session._id,
    metadata: { deviceLabel: session.deviceLabel },
    req,
  })
}

const revokeOtherSessions = async (adminId, req) => {
  const currentHash = getCurrentSessionHash(req)
  const result = await RefreshToken.updateMany(
    {
      admin: adminId,
      revokedAt: null,
      ...(currentHash ? { tokenHash: { $ne: currentHash } } : {}),
    },
    { revokedAt: new Date() }
  )

  if (result.modifiedCount > 0) {
    await logAudit({
      actor: req.admin,
      action: AUDIT_ACTIONS.SESSION_REVOKED,
      targetType: TARGET_TYPES.ADMIN,
      targetId: adminId,
      metadata: { count: result.modifiedCount, scope: 'other_devices' },
      req,
    })
  }

  return result.modifiedCount
}

module.exports = {
  listActiveSessions,
  revokeSession,
  revokeOtherSessions,
  getCurrentSessionHash,
}
