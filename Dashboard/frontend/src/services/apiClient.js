import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let csrfToken = null

const unwrap = (payload) => {
  if (payload && typeof payload === 'object' && payload.success === true && 'data' in payload) {
    return payload.data
  }
  return payload
}

export const fetchCsrfToken = async () => {
  const { data } = await apiClient.get('/auth/csrf-token')
  const unwrapped = unwrap(data)
  csrfToken = unwrapped.csrfToken
  return csrfToken
}

export const setCsrfToken = (token) => {
  csrfToken = token
}

apiClient.interceptors.request.use((config) => {
  if (csrfToken && !['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

let isRefreshing = false
let refreshQueue = []

const processQueue = (error) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve()))
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (res) => {
    res.data = unwrap(res.data)
    return res
  },
  async (error) => {
    const original = error.config
    const isAuthRoute = original?.url?.includes('/auth/')
    const status = error.response?.status
    const errBody = error.response?.data

    if (status === 403 && errBody?.error === 'Invalid CSRF token') {
      await fetchCsrfToken()
      original.headers['X-CSRF-Token'] = csrfToken
      return apiClient(original)
    }

    if (status === 401 && !original._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then(() => apiClient(original))
      }

      original._retry = true
      isRefreshing = true

      try {
        await apiClient.post('/auth/refresh')
        processQueue(null)
        return apiClient(original)
      } catch (refreshErr) {
        processQueue(refreshErr)
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    const message =
      errBody?.error ||
      errBody?.message ||
      error.message ||
      'Request failed'
    const err = new Error(message)
    if (errBody?.details) err.details = errBody.details
    
    // Enhanced error logging for debugging
    console.error('API Error:', {
      url: original?.url,
      method: original?.method,
      status,
      message,
      details: errBody?.details,
      fullError: errBody,
      requestData: original?.data ? JSON.parse(original.data) : null
    })
    
    return Promise.reject(err)
  }
)

export default apiClient
