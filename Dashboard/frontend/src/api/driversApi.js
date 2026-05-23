const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
const BASE = `${BACKEND}/api/drivers`

// Sent with every fetch so ngrok's interstitial page is bypassed for API calls.
const H = { 'ngrok-skip-browser-warning': 'true' }
const J = { 'Content-Type': 'application/json', ...H }

const handleResponse = async (res) => {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const fetchDrivers = () =>
  fetch(BASE, { headers: H }).then(handleResponse)

export const fetchDriver = (mongoId) =>
  fetch(`${BASE}/${mongoId}`, { headers: H }).then(handleResponse)

export const createDriver = ({ name }) =>
  fetch(BASE, {
    method: 'POST',
    headers: J,
    body: JSON.stringify({ name }),
  }).then(handleResponse)

export const updateDriver = (mongoId, { id, name }) =>
  fetch(`${BASE}/${mongoId}`, {
    method: 'PUT',
    headers: J,
    body: JSON.stringify({ id, name }),
  }).then(handleResponse)

export const deleteDriver = (mongoId) =>
  fetch(`${BASE}/${mongoId}`, { method: 'DELETE', headers: H }).then(handleResponse)

export const fetchDriverTrips = (mongoId) =>
  fetch(`${BASE}/${mongoId}/trips`, { headers: H }).then(handleResponse)
