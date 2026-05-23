import apiClient from '../services/apiClient.js'

export const fetchBuses = () => apiClient.get('/buses').then((r) => r.data)

export const createBus = ({ capacity }) =>
  apiClient.post('/buses', { capacity }).then((r) => r.data)

export const updateBus = (id, { capacity }) =>
  apiClient.put(`/buses/${id}`, { capacity }).then((r) => r.data)

export const deleteBus = (id) => apiClient.delete(`/buses/${id}`).then((r) => r.data)
