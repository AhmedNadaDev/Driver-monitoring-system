import apiClient, { fetchCsrfToken, setCsrfToken } from './apiClient.js'

export const initAuth = () => fetchCsrfToken()

export const login = async (identifier, password) => {
  const { data } = await apiClient.post('/auth/login', { identifier, password })
  if (data.csrfToken) setCsrfToken(data.csrfToken)
  return data
}

export const logout = () => apiClient.post('/auth/logout')

export const logoutAll = () => apiClient.post('/auth/logout-all')

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data.admin)

export const changePassword = (currentPassword, newPassword) =>
  apiClient.put('/auth/password', { currentPassword, newPassword })

export const fetchSessions = () =>
  apiClient.get('/auth/sessions').then((r) => r.data)

export const revokeSession = (sessionId) =>
  apiClient.delete(`/auth/sessions/${sessionId}`)

export const revokeOtherSessions = () =>
  apiClient.post('/auth/sessions/revoke-others').then((r) => r.data)
