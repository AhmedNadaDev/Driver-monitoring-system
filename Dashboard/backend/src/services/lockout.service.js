const config = require('../config')
const ApiError = require('../utils/ApiError')
const { logAudit } = require('./audit.service')
const { AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants')

const assertNotLocked = (admin) => {
  if (admin.lockUntil && admin.lockUntil > new Date()) {
    const minutes = Math.ceil((admin.lockUntil - Date.now()) / 60000)
    throw new ApiError(
      423,
      `Account temporarily locked. Try again in ${minutes} minute(s).`
    )
  }
}

const recordFailedLogin = async (admin, identifier, req) => {
  if (!admin) {
    await logAudit({
      actorUsername: identifier,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      targetType: TARGET_TYPES.SYSTEM,
      metadata: { identifier, reason: 'invalid_credentials' },
      req,
    })
    return
  }

  admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1

  if (admin.failedLoginAttempts >= config.lockout.maxAttempts) {
    admin.lockUntil = new Date(Date.now() + config.lockout.lockDurationMs)
    admin.failedLoginAttempts = 0
    await admin.save({ validateBeforeSave: false })

    await logAudit({
      actor: admin,
      actorUsername: admin.username,
      action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
      targetType: TARGET_TYPES.ADMIN,
      targetId: admin._id,
      metadata: {
        lockUntil: admin.lockUntil,
        durationMs: config.lockout.lockDurationMs,
      },
      req,
      isSecurityEvent: true,
    })
    return
  }

  await admin.save({ validateBeforeSave: false })
  await logAudit({
    actor: admin,
    actorUsername: admin.username,
    action: AUDIT_ACTIONS.LOGIN_FAILED,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: {
      identifier,
      attemptsRemaining: config.lockout.maxAttempts - admin.failedLoginAttempts,
    },
    req,
  })
}

const clearLockout = async (admin) => {
  if (admin.failedLoginAttempts || admin.lockUntil) {
    admin.failedLoginAttempts = 0
    admin.lockUntil = null
    await admin.save({ validateBeforeSave: false })
  }
}

module.exports = { assertNotLocked, recordFailedLogin, clearLockout }
