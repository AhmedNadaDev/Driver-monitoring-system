const express = require('express')
const rateLimit = require('express-rate-limit')
const authController = require('./auth.controller')
const { loginValidator, changePasswordValidator } = require('./auth.validators')
const validate = require('../../middlewares/validate')
const { authenticate } = require('../../middlewares/auth')

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many authentication attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(authLimiter)

router.get('/csrf-token', authController.getCsrfToken)
router.post('/login', loginLimiter, loginValidator, validate, authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)
router.post('/logout-all', authenticate, authController.logoutAll)
router.get('/me', authenticate, authController.me)
router.get('/sessions', authenticate, authController.getSessions)
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession)
router.post('/sessions/revoke-others', authenticate, authController.logoutOtherDevices)
router.put(
  '/password',
  authenticate,
  changePasswordValidator,
  validate,
  authController.changePassword
)

module.exports = router
