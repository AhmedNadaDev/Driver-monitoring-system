const ApiError = require('../utils/ApiError')

const errorHandler = (err, _req, res, _next) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ success: false, error: messages.join(', ') })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field'
    return res.status(409).json({ success: false, error: `${field} already exists` })
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details && { details: err.details }),
    })
  }

  const status = err.status || err.statusCode || 500
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error'

  if (status >= 500) console.error(err)

  res.status(status).json({ success: false, error: message })
}

module.exports = errorHandler
