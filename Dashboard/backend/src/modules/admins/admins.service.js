const Admin = require('../../models/Admin')
const ApiError = require('../../utils/ApiError')
const { logAudit } = require('../../services/audit.service')
const { revokeAllSessions } = require('../../services/token.service')
const { validatePasswordStrength, preparePasswordChange } = require('../../services/password.service')
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination')
const { ROLES, AUDIT_ACTIONS, TARGET_TYPES } = require('../../utils/constants')

const preventSuperAdminEscalation = (actor, targetRole, isUpdate = false) => {
  if (targetRole === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Cannot assign SUPER_ADMIN role')
  }
  if (isUpdate && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can modify other admins')
  }
}

const listAdmins = async ({ page = 1, limit = 10, search, role, status }) => {
  const filter = {}
  if (role) filter.role = role
  if (status === 'active') filter.isActive = true
  if (status === 'inactive') filter.isActive = false
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ username: regex }, { email: regex }]
  }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Admin.find(filter)
      .select('username email role isActive avatar lastLogin createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Admin.countDocuments(filter),
  ])

  return {
    items: items.map((a) => ({
      id: a._id,
      username: a.username,
      email: a.email,
      role: a.role,
      isActive: a.isActive,
      avatar: a.avatar,
      lastLogin: a.lastLogin,
      createdAt: a.createdAt,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  }
}

const getAdminById = async (id) => {
  const admin = await Admin.findById(id)
  if (!admin) throw new ApiError(404, 'Admin not found')
  return admin.toSafeJSON()
}

const createAdmin = async (actor, data, req) => {
  // Determine the role to assign
  const requestedRole = data.role || ROLES.ADMIN
  
  // Security check: Only SUPER_ADMIN can create SUPER_ADMIN accounts
  if (requestedRole === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can create SUPER_ADMIN accounts')
  }
  
  // Security check: Only SUPER_ADMIN can create any admin
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can create admin accounts')
  }

  // Validate password strength
  validatePasswordStrength(data.password)

  // Create the admin with the requested role
  const admin = await Admin.create({
    username: data.username.toLowerCase(),
    email: data.email.toLowerCase(),
    password: data.password,
    role: requestedRole,
    createdBy: actor._id,
  })

  await logAudit({
    actor,
    action: AUDIT_ACTIONS.ADMIN_CREATE,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: { username: admin.username, role: admin.role },
    req,
  })

  return admin.toSafeJSON()
}

const updateAdmin = async (actor, id, data, req) => {
  // Only SUPER_ADMIN can update admins
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can update admins')
  }

  const admin = await Admin.findById(id)
  if (!admin) throw new ApiError(404, 'Admin not found')

  // Prevent demoting the last SUPER_ADMIN
  if (admin.role === ROLES.SUPER_ADMIN && data.role === ROLES.ADMIN) {
    const superCount = await Admin.countDocuments({ role: ROLES.SUPER_ADMIN, isActive: true })
    if (superCount <= 1) {
      throw new ApiError(400, 'Cannot demote the last active SUPER_ADMIN')
    }
  }

  // Security check: Only SUPER_ADMIN can assign SUPER_ADMIN role
  if (data.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can assign SUPER_ADMIN role')
  }

  // Update fields
  if (data.username) admin.username = data.username.toLowerCase()
  if (data.email) admin.email = data.email.toLowerCase()
  if (data.role) admin.role = data.role
  if (typeof data.isActive === 'boolean') admin.isActive = data.isActive

  await admin.save()

  await logAudit({
    actor,
    action: AUDIT_ACTIONS.ADMIN_UPDATE,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: { changes: data },
    req,
  })

  return admin.toSafeJSON()
}

const deleteAdmin = async (actor, id, req) => {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can delete admins')
  }

  const admin = await Admin.findById(id)
  if (!admin) throw new ApiError(404, 'Admin not found')

  if (admin._id.equals(actor._id)) {
    throw new ApiError(400, 'Cannot delete your own account')
  }

  if (admin.role === ROLES.SUPER_ADMIN) {
    const superCount = await Admin.countDocuments({ role: ROLES.SUPER_ADMIN })
    if (superCount <= 1) {
      throw new ApiError(400, 'Cannot delete the last SUPER_ADMIN')
    }
  }

  await revokeAllSessions(admin._id)
  await Admin.findByIdAndDelete(id)

  await logAudit({
    actor,
    action: AUDIT_ACTIONS.ADMIN_DELETE,
    targetType: TARGET_TYPES.ADMIN,
    targetId: id,
    metadata: { username: admin.username },
    req,
  })
}

const toggleStatus = async (actor, id, req) => {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can toggle admin status')
  }

  const admin = await Admin.findById(id)
  if (!admin) throw new ApiError(404, 'Admin not found')

  if (admin._id.equals(actor._id)) {
    throw new ApiError(400, 'Cannot deactivate your own account')
  }

  if (admin.role === ROLES.SUPER_ADMIN && admin.isActive) {
    const activeSupers = await Admin.countDocuments({
      role: ROLES.SUPER_ADMIN,
      isActive: true,
    })
    if (activeSupers <= 1) {
      throw new ApiError(400, 'Cannot deactivate the last SUPER_ADMIN')
    }
  }

  admin.isActive = !admin.isActive
  await admin.save()

  if (!admin.isActive) await revokeAllSessions(admin._id)

  await logAudit({
    actor,
    action: AUDIT_ACTIONS.ADMIN_STATUS_TOGGLE,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: { isActive: admin.isActive },
    req,
  })

  return admin.toSafeJSON()
}

const resetPassword = async (actor, id, newPassword, req) => {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only SUPER_ADMIN can reset passwords')
  }

  const admin = await Admin.findById(id).select('+password +passwordHistory')
  if (!admin) throw new ApiError(404, 'Admin not found')

  await preparePasswordChange(admin, newPassword)
  admin.password = newPassword
  await admin.save()
  await revokeAllSessions(admin._id)

  await logAudit({
    actor,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: { username: admin.username },
    req,
  })
}

const updateProfile = async (admin, data, req) => {
  if (data.username) admin.username = data.username.toLowerCase()
  if (data.email) admin.email = data.email.toLowerCase()
  if (data.avatar !== undefined) admin.avatar = data.avatar || null

  await admin.save()

  await logAudit({
    actor: admin,
    action: AUDIT_ACTIONS.PROFILE_UPDATE,
    targetType: TARGET_TYPES.ADMIN,
    targetId: admin._id,
    metadata: { fields: Object.keys(data) },
    req,
  })

  return admin.toSafeJSON()
}

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleStatus,
  resetPassword,
  updateProfile,
}
