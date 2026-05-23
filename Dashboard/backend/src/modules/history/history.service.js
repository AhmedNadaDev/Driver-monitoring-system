const AuditLog = require('../../models/AuditLog')
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination')

const buildFilter = ({ search, action, severity, securityOnly, from, to, actorId }) => {
  const filter = {}

  if (action) filter.action = action
  if (severity) filter.severity = severity
  if (securityOnly === 'true' || securityOnly === true) filter.isSecurityEvent = true
  if (actorId) filter.actor = actorId

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ actorUsername: regex }, { targetId: regex }, { action: regex }]
  }

  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      filter.createdAt.$lte = end
    }
  }

  return filter
}

const mapLog = (log) => ({
  id: log._id,
  actor: log.actor
    ? { id: log.actor._id, username: log.actor.username, role: log.actor.role }
    : null,
  actorUsername: log.actorUsername,
  action: log.action,
  severity: log.severity,
  isSecurityEvent: log.isSecurityEvent,
  targetType: log.targetType,
  targetId: log.targetId,
  entityLink: log.entityLink,
  metadata: log.metadata,
  ip: log.ip,
  createdAt: log.createdAt,
})

const listHistory = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 })
  const filter = buildFilter(query)

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'username email role')
      .lean(),
    AuditLog.countDocuments(filter),
  ])

  return {
    items: items.map(mapLog),
    pagination: buildPaginationMeta(page, limit, total),
  }
}

const exportHistoryCsv = async (query) => {
  const filter = buildFilter(query)
  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(5000)
    .populate('actor', 'username')
    .lean()

  const headers = [
    'Timestamp',
    'Actor',
    'Action',
    'Severity',
    'Security Event',
    'Target Type',
    'Target ID',
    'IP',
    'Entity Link',
  ]

  const escape = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const rows = logs.map((log) =>
    [
      log.createdAt?.toISOString(),
      log.actorUsername,
      log.action,
      log.severity,
      log.isSecurityEvent,
      log.targetType,
      log.targetId,
      log.ip,
      log.entityLink,
    ]
      .map(escape)
      .join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

module.exports = { listHistory, exportHistoryCsv }
