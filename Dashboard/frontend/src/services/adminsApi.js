import apiClient from './apiClient.js'

export const fetchAdmins = (params) =>
  apiClient.get('/admins', { params }).then((r) => r.data)

export const fetchAdmin = (id) =>
  apiClient.get(`/admins/${id}`).then((r) => r.data.admin)

export const createAdmin = (payload) =>
  apiClient.post('/admins', payload).then((r) => r.data.admin)

export const updateAdmin = (id, payload) =>
  apiClient.put(`/admins/${id}`, payload).then((r) => r.data.admin)

export const deleteAdmin = (id) => apiClient.delete(`/admins/${id}`)

export const toggleAdminStatus = (id) =>
  apiClient.patch(`/admins/${id}/status`).then((r) => r.data.admin)

export const resetAdminPassword = (id, newPassword) =>
  apiClient.post(`/admins/${id}/reset-password`, { newPassword })

export const fetchProfile = () =>
  apiClient.get('/admins/profile').then((r) => r.data.admin)

export const updateProfile = (payload) =>
  apiClient.put('/admins/profile', payload).then((r) => r.data.admin)
