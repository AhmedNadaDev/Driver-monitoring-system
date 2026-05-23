import apiClient from './apiClient.js'

export const fetchHistory = (params) =>
  apiClient.get('/history', { params }).then((r) => r.data)

export const exportHistoryCsv = (params) =>
  apiClient.get('/history/export', {
    params,
    responseType: 'blob',
  }).then((r) => r.data)
