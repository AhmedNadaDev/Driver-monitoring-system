const { body } = require('express-validator')
const { PASSWORD_RULES } = require('../../services/password.service')

const passwordChain = (field) => {
  let chain = body(field).notEmpty()
  for (const rule of PASSWORD_RULES) {
    chain = chain.custom((value) => {
      if (!rule.test(value)) throw new Error(rule.message)
      return true
    })
  }
  return chain
}

const loginValidator = [
  body('identifier').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
]

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  passwordChain('newPassword'),
]

module.exports = { loginValidator, changePasswordValidator, passwordChain }
