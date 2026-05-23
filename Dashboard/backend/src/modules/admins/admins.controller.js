const adminsService = require('./admins.service')
const { sendSuccess } = require('../../utils/response')
const { parsePagination } = require('../../utils/pagination')
const asyncHandler = require('../../utils/asyncHandler')

exports.list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 })
  const result = await adminsService.listAdmins({
    page,
    limit,
    search: req.query.search,
    role: req.query.role,
    status: req.query.status,
  })
  sendSuccess(res, result)
})

exports.getOne = asyncHandler(async (req, res) => {
  const admin = await adminsService.getAdminById(req.params.id)
  sendSuccess(res, { admin })
})

exports.create = asyncHandler(async (req, res) => {
  const admin = await adminsService.createAdmin(req.admin, req.body, req)
  sendSuccess(res, { admin }, null, 201)
})

exports.update = asyncHandler(async (req, res) => {
  const admin = await adminsService.updateAdmin(req.admin, req.params.id, req.body, req)
  sendSuccess(res, { admin })
})

exports.remove = asyncHandler(async (req, res) => {
  await adminsService.deleteAdmin(req.admin, req.params.id, req)
  sendSuccess(res, { message: 'Admin deleted successfully' })
})

exports.toggleStatus = asyncHandler(async (req, res) => {
  const admin = await adminsService.toggleStatus(req.admin, req.params.id, req)
  sendSuccess(res, { admin })
})

exports.resetPassword = asyncHandler(async (req, res) => {
  await adminsService.resetPassword(req.admin, req.params.id, req.body.newPassword, req)
  sendSuccess(res, { message: 'Password reset successfully' })
})

exports.getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, { admin: req.admin.toSafeJSON() })
})

exports.updateProfile = asyncHandler(async (req, res) => {
  const admin = await adminsService.updateProfile(req.admin, req.body, req)
  sendSuccess(res, { admin })
})
