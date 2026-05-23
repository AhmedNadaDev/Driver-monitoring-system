const config = require('../../config')
const Admin = require('../../models/Admin')
const ApiError = require('../../utils/ApiError')
const { logAudit } = require('../../services/audit.service')
const {
  signAccessToken,
  createRefreshSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
} = require('../../services/token.service')
const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  generateCsrfToken,
  setCsrfCookie,
} = require('../../services/cookie.service')
const { assertNotLocked, recordFailedLogin, clearLockout } = require('../../services/lockout.service')
const { validatePasswordStrength, preparePasswordChange } = require('../../services/password.service')
const {
  listActiveSessions,
  revokeSession,
  revokeOtherSessions,
} = require('../../services/session.service')
const { AUDIT_ACTIONS, TARGET_TYPES } = require('../../utils/constants')

const findByIdentifier = (identifier) => {
  const normalized = identifier.trim().toLowerCase()
  return Admin.findOne({
    $or: [{ username: normalized }, { email: normalized }],
  }).select('+password')
}

const login = async (identifier, password, req, res) => {
  const admin = await findByIdentifier(identifier)

  if (admin) assertNotLocked(admin)

  if (!admin || !(await admin.comparePassword(password))) {
    await recordFailedLogin(admin, identifier, req)
    throw new ApiError(401, 'Invalid credentials')
  }

  if (!admin.isActive) {
    throw new ApiError(403, 'Account is deactivated')
  }

  await clearLockout(admin)

  admin.lastLogin = new Date()
  await admin.save({ validateBeforeSave: false })

  const accessToken = signAccessToken(admin)
  const { refreshJwt } = await createRefreshSession(admin, req)

  const csrfToken = generateCsrfToken()
  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, refreshJwt)
  setCsrfCookie(res, csrfToken)

  await logAudit({
    actor: admin,
    action: AUDIT_ACTIONS.LOGIN,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    req,
  })

  return { admin: admin.toSafeJSON(), csrfToken }
}

const refresh = async (req, res) => {
  const refreshJwt = req.cookies?.[config.refreshTokenCookie]
  if (!refreshJwt) throw new ApiError(401, 'Refresh token missing')

  const { admin, accessToken, refreshJwt: newRefresh } = await rotateRefreshToken(refreshJwt, req)

  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, newRefresh)

  await logAudit({
    actor: admin,
    action: AUDIT_ACTIONS.TOKEN_REFRESH,
    targetType: TARGET_TYPES.SESSION,
    targetId: admin._id,
    req,
  })

  return admin.toSafeJSON()
}

const logout = async (req, res) => {
  const refreshJwt = req.cookies?.[config.refreshTokenCookie]
  if (refreshJwt) await revokeRefreshToken(refreshJwt)

  clearAuthCookies(res)

  if (req.admin) {
    await logAudit({
      actor: req.admin,
      action: AUDIT_ACTIONS.LOGOUT,
      targetType: TARGET_TYPES.ADMIN,
      targetId: req.admin._id,
      req,
    })
  }
}

const logoutAll = async (req, res) => {
  await revokeAllSessions(req.admin._id)
  clearAuthCookies(res)

  await logAudit({
    actor: req.admin,
    action: AUDIT_ACTIONS.LOGOUT_ALL,
    targetType: TARGET_TYPES.ADMIN,
    targetId: req.admin._id,
    req,
  })
}

const changePassword = async (admin, currentPassword, newPassword, req) => {
  const doc = await Admin.findById(admin._id).select('+password +passwordHistory')
  if (!(await doc.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect')
  }

  await preparePasswordChange(doc, newPassword)
  doc.password = newPassword
  await doc.save()
  await revokeAllSessions(doc._id)

  await logAudit({
    actor: doc,
    action: AUDIT_ACTIONS.PASSWORD_CHANGE,
    targetType: TARGET_TYPES.ADMIN,
    targetId: doc._id,
    req,
  })
}

const getMe = (admin) => admin.toSafeJSON()

const getSessions = (admin, req) => listActiveSessions(admin._id, req)

const revokeSessionById = (admin, sessionId, req) =>
  revokeSession(admin._id, sessionId, req)

const logoutOtherDevices = async (admin, req) => {
  const count = await revokeOtherSessions(admin._id, req)
  return { revokedCount: count }
}

module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  getMe,
  getSessions,
  revokeSessionById,
  logoutOtherDevices,
}
