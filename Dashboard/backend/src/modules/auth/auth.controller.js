const authService = require('./auth.service')
const { generateCsrfToken, setCsrfCookie } = require('../../services/cookie.service')
const { sendSuccess } = require('../../utils/response')
const asyncHandler = require('../../utils/asyncHandler')

exports.getCsrfToken = asyncHandler(async (_req, res) => {
  const token = generateCsrfToken()
  setCsrfCookie(res, token)
  sendSuccess(res, { csrfToken: token })
})

exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body
  const result = await authService.login(identifier, password, req, res)
  sendSuccess(res, result)
})

exports.refresh = asyncHandler(async (req, res) => {
  const admin = await authService.refresh(req, res)
  sendSuccess(res, { admin })
})

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res)
  sendSuccess(res, { message: 'Logged out successfully' })
})

exports.logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req, res)
  sendSuccess(res, { message: 'All sessions revoked' })
})

exports.me = asyncHandler(async (req, res) => {
  sendSuccess(res, { admin: authService.getMe(req.admin) })
})

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  await authService.changePassword(req.admin, currentPassword, newPassword, req)
  sendSuccess(res, { message: 'Password updated. Please log in again.' })
})

exports.getSessions = asyncHandler(async (req, res) => {
  const sessions = await authService.getSessions(req.admin, req)
  sendSuccess(res, { sessions })
})

exports.revokeSession = asyncHandler(async (req, res) => {
  await authService.revokeSessionById(req.admin, req.params.sessionId, req)
  sendSuccess(res, { message: 'Session revoked' })
})

exports.logoutOtherDevices = asyncHandler(async (req, res) => {
  const result = await authService.logoutOtherDevices(req.admin, req)
  sendSuccess(res, result)
})
