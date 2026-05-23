const crypto = require('crypto')
const config = require('../config')

const baseCookieOptions = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/',
}

const setAccessTokenCookie = (res, token) => {
  res.cookie(config.accessTokenCookie, token, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  })
}

const setRefreshTokenCookie = (res, token) => {
  res.cookie(config.refreshTokenCookie, token, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  })
}

const clearAuthCookies = (res) => {
  res.clearCookie(config.accessTokenCookie, { path: '/' })
  res.clearCookie(config.refreshTokenCookie, { path: '/api/auth' })
}

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex')

const setCsrfCookie = (res, token) => {
  res.cookie(config.csrfCookie, token, {
    httpOnly: false,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  })
}

module.exports = {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  generateCsrfToken,
  setCsrfCookie,
}
