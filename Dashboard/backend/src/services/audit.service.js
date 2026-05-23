const AuditLog = require('../models/AuditLog')
const {
  TARGET_TYPES,
  ACTION_SEVERITY,
  AUDIT_SEVERITY,
  ENTITY_LINKS,
} = require('../utils/constants')
const { getClientIp, sanitizeUserAgent } = require('../utils/request')

const resolveEntityLink = (targetType, targetId) => {
  const builder = ENTITY_LINKS[targetType]
  if (!builder) return null
  return builder(targetId)
}

const logAudit = async ({
  actor = null,
  actorUsername = 'system',
  action,
  targetType = TARGET_TYPES.SYSTEM,
  targetId = null,
  metadata = {},
  req = null,
  severity = null,
  isSecurityEvent = false,
}) => {
  try {
    const resolvedSeverity =
      severity || ACTION_SEVERITY[action] || AUDIT_SEVERITY.INFO

    await AuditLog.create({
      actor: actor?._id || actor,
      actorUsername: actor?.username || actorUsername,
      action,
      severity: resolvedSeverity,
      isSecurityEvent: isSecurityEvent || resolvedSeverity === AUDIT_SEVERITY.CRITICAL,
      targetType,
      targetId: targetId ? String(targetId) : null,
      entityLink: resolveEntityLink(targetType, targetId),
      metadata,
      ip: req ? getClientIp(req) : null,
      userAgent: req ? sanitizeUserAgent(req.get('user-agent')) : null,
    })
  } catch (err) {
    console.error('Audit log failed:', err.message)
  }
}

module.exports = { logAudit }
