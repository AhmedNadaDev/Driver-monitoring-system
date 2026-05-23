import apiClient from '../services/apiClient.js'

export const fetchDrivers = () =>
  apiClient.get('/drivers').then((r) => r.data)

export const fetchDriver = (mongoId) =>
  apiClient.get(`/drivers/${mongoId}`).then((r) => r.data)

export const createDriver = ({ name }) =>
  apiClient.post('/drivers', { name }).then((r) => r.data)

export const updateDriver = (mongoId, { id, name }) =>
  apiClient.put(`/drivers/${mongoId}`, { id, name }).then((r) => r.data)

export const deleteDriver = (mongoId) =>
  apiClient.delete(`/drivers/${mongoId}`).then((r) => r.data)

export const fetchDriverTrips = (mongoId) =>
  apiClient.get(`/drivers/${mongoId}/trips`).then((r) => r.data)
