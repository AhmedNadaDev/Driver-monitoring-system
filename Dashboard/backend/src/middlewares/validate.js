const { validationResult } = require('express-validator')
const ApiError = require('../utils/ApiError')

const validate = (req, _res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }))
    
    // Enhanced logging for debugging
    console.error('Validation Error:', {
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      errors: details
    })
    
    return next(new ApiError(400, 'Validation failed', details))
  }
  next()
}

module.exports = validate
