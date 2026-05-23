const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    deviceLabel: { type: String, default: null },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

refreshTokenSchema.index({ admin: 1, revokedAt: 1 })
refreshTokenSchema.index({ admin: 1, expiresAt: 1 })

module.exports = mongoose.model('RefreshToken', refreshTokenSchema)
