const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const config = require('../config')
const { ROLES } = require('../utils/constants')

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
      match: /^[a-z0-9_.-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 8,
    },
    passwordHistory: {
      type: [String],
      select: false,
      default: [],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ADMIN,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
)

adminSchema.index({ role: 1, isActive: 1 })
adminSchema.index({ createdAt: -1 })
adminSchema.index({ lockUntil: 1 }, { sparse: true })

adminSchema.virtual('isLocked').get(function isLocked() {
  return this.lockUntil && this.lockUntil > new Date()
})

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()

  const rounds = config.bcryptRounds || 12
  const plain = this.password

  if (this.passwordHistory?.length) {
    for (const hash of this.passwordHistory) {
      if (await bcrypt.compare(plain, hash)) {
        const err = new Error('Cannot reuse a recent password')
        err.statusCode = 400
        return next(err)
      }
    }
  }

  if (!this.isNew && this.passwordHistory) {
    const prevHash = this._previousPasswordHash
    if (prevHash) {
      this.passwordHistory = [prevHash, ...this.passwordHistory].slice(
        0,
        config.password.historyCount
      )
    }
  }

  this.password = await bcrypt.hash(plain, rounds)
  next()
})

adminSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

adminSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    avatar: this.avatar,
    lastLogin: this.lastLogin,
    isLocked: Boolean(this.lockUntil && this.lockUntil > new Date()),
    lockUntil: this.lockUntil && this.lockUntil > new Date() ? this.lockUntil : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    createdBy: this.createdBy,
  }
}

module.exports = mongoose.model('Admin', adminSchema)
