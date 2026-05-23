const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim().slice(0, 45)
  }
  return (req.ip || req.socket?.remoteAddress || 'unknown').slice(0, 45)
}

const sanitizeUserAgent = (ua) => {
  if (!ua || typeof ua !== 'string') return null
  return ua.slice(0, 512)
}

const parseDeviceLabel = (userAgent) => {
  if (!userAgent) return 'Unknown device'
  const ua = userAgent.toLowerCase()
  let browser = 'Browser'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome/')) browser = 'Chrome'
  else if (ua.includes('firefox/')) browser = 'Firefox'
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari'

  let os = 'Unknown OS'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
  else if (ua.includes('linux')) os = 'Linux'

  return `${browser} on ${os}`
}

module.exports = { getClientIp, sanitizeUserAgent, parseDeviceLabel }
