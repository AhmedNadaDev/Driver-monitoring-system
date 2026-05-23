const ApiError = require('../utils/ApiError')

const PASSWORD_RULES = [
  { test: (p) => p.length >= 10, message: 'Password must be at least 10 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must contain an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must contain a lowercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'Password must contain a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'Password must contain a special character' },
  {
    test: (p) => !/(.)\1{2,}/.test(p),
    message: 'Password cannot contain repeated characters (3+ in a row)',
  },
]

const validatePasswordStrength = (password) => {
  const failures = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.message)
  if (failures.length) {
    throw new ApiError(400, 'Password does not meet security requirements', failures)
  }
}

const preparePasswordChange = async (adminDoc, newPassword) => {
  validatePasswordStrength(newPassword)
  adminDoc._previousPasswordHash = adminDoc.password
}

module.exports = { validatePasswordStrength, preparePasswordChange, PASSWORD_RULES }
