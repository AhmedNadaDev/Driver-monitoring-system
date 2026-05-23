const express = require('express')
const adminsController = require('./admins.controller')
const {
  createAdminValidator,
  updateAdminValidator,
  resetPasswordValidator,
  listQueryValidator,
  profileUpdateValidator,
} = require('./admins.validators')
const validate = require('../../middlewares/validate')
const { authenticate, authorize } = require('../../middlewares/auth')
const { ROLES } = require('../../utils/constants')

const router = express.Router()

router.use(authenticate)

router.get('/profile', adminsController.getProfile)
router.put('/profile', profileUpdateValidator, validate, adminsController.updateProfile)

router.use(authorize(ROLES.SUPER_ADMIN))

router.get('/', listQueryValidator, validate, adminsController.list)
router.get('/:id', adminsController.getOne)
router.post('/', createAdminValidator, validate, adminsController.create)
router.put('/:id', updateAdminValidator, validate, adminsController.update)
router.delete('/:id', adminsController.remove)
router.patch('/:id/status', adminsController.toggleStatus)
router.post('/:id/reset-password', resetPasswordValidator, validate, adminsController.resetPassword)

module.exports = router
