const mongoose = require('mongoose')
const { AUDIT_ACTIONS, TARGET_TYPES, AUDIT_SEVERITY } = require('../utils/constants')

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    actorUsername: {
      type: String,
      default: 'system',
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITY),
      default: AUDIT_SEVERITY.INFO,
      index: true,
    },
    isSecurityEvent: {
      type: Boolean,
      default: false,
      index: true,
    },
    targetType: {
      type: String,
      enum: Object.values(TARGET_TYPES),
      default: TARGET_TYPES.SYSTEM,
    },
    targetId: {
      type: String,
      default: null,
    },
    entityLink: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ severity: 1, createdAt: -1 })
auditLogSchema.index({ isSecurityEvent: 1, createdAt: -1 })
auditLogSchema.index({ actor: 1, createdAt: -1 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
