const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
const BASE = `${BACKEND}/api/buses`

const H = { 'ngrok-skip-browser-warning': 'true' }
const J = { 'Content-Type': 'application/json', ...H }

const handleResponse = async (res) => {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const fetchBuses = () => fetch(BASE, { headers: H }).then(handleResponse)

export const createBus = ({ capacity }) =>
  fetch(BASE, {
    method: 'POST',
    headers: J,
    body: JSON.stringify({ capacity }),
  }).then(handleResponse)

export const updateBus = (id, { capacity }) =>
  fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: J,
    body: JSON.stringify({ capacity }),
  }).then(handleResponse)

export const deleteBus = (id) =>
  fetch(`${BASE}/${id}`, { method: 'DELETE', headers: H }).then(handleResponse)
