import apiClient from '../services/apiClient.js'

export const fetchRoutes = () => apiClient.get('/routes').then((r) => r.data)

export const createRoute = ({ name }) =>
  apiClient.post('/routes', { name }).then((r) => r.data)

export const updateRoute = (id, { name }) =>
  apiClient.put(`/routes/${id}`, { name }).then((r) => r.data)

export const deleteRoute = (id) => apiClient.delete(`/routes/${id}`).then((r) => r.data)
