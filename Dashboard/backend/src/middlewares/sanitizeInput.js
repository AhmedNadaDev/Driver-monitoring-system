const stripHtml = (str) =>
  String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .trim()

const sanitizeValue = (value) => {
  if (typeof value === 'string') return stripHtml(value)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeValue(v)
    }
    return out
  }
  return value
}

const sanitizeInput = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query)
  }
  next()
}

module.exports = sanitizeInput
