const { logAudit } = require('./audit.service')
const { AUDIT_ACTIONS, TARGET_TYPES } = require('../utils/constants')
const { revokeAllSessions } = require('./token.service')

const logTokenReuse = async (adminId, familyId, req) => {
  await revokeAllSessions(adminId)

  await logAudit({
    actorUsername: 'system',
    action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
    targetType: TARGET_TYPES.SESSION,
    targetId: adminId,
    metadata: { familyId, autoRevoked: true },
    req,
    isSecurityEvent: true,
  })
}

module.exports = { logTokenReuse }
