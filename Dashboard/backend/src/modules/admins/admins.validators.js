const { body, param, query } = require('express-validator')
const { ROLES } = require('../../utils/constants')
const { passwordChain } = require('../auth/auth.validators')

const createAdminValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 })
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username must be 3-32 alphanumeric characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  passwordChain('password'),
  body('role')
    .optional()
    .isIn([ROLES.ADMIN, ROLES.SUPER_ADMIN])
    .withMessage('Role must be either ADMIN or SUPER_ADMIN'),
]

const updateAdminValidator = [
  param('id').isMongoId().withMessage('Invalid admin ID'),
  body('username').optional().trim().isLength({ min: 3, max: 32 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('role').optional().isIn([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  body('isActive').optional().isBoolean(),
]

const resetPasswordValidator = [
  param('id').isMongoId(),
  passwordChain('newPassword'),
]

const listQueryValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('role').optional().isIn(Object.values(ROLES)),
  query('status').optional().isIn(['active', 'inactive']),
]

const profileUpdateValidator = [
  body('username').optional().trim().isLength({ min: 3, max: 32 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('avatar')
    .optional({ values: 'null' })
    .trim()
    .custom((v) => !v || /^https?:\/\/.+/.test(v))
    .withMessage('Avatar must be a valid URL'),
]

module.exports = {
  createAdminValidator,
  updateAdminValidator,
  resetPasswordValidator,
  listQueryValidator,
  profileUpdateValidator,
}
