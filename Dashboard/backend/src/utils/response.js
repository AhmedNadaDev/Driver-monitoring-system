const sendSuccess = (res, data = null, meta = null, status = 200) => {
  const body = { success: true }
  if (data !== null) body.data = data
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

const sendError = (res, status, message, details = null) => {
  const body = { success: false, error: message }
  if (details) body.details = details
  return res.status(status).json(body)
}

module.exports = { sendSuccess, sendError }
