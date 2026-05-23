const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
const BASE = `${BACKEND}/api/routes`

const H = { 'ngrok-skip-browser-warning': 'true' }
const J = { 'Content-Type': 'application/json', ...H }

const handleResponse = async (res) => {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const fetchRoutes = () => fetch(BASE, { headers: H }).then(handleResponse)

export const createRoute = ({ name }) =>
  fetch(BASE, {
    method: 'POST',
    headers: J,
    body: JSON.stringify({ name }),
  }).then(handleResponse)

export const updateRoute = (id, { name }) =>
  fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: J,
    body: JSON.stringify({ name }),
  }).then(handleResponse)

export const deleteRoute = (id) =>
  fetch(`${BASE}/${id}`, { method: 'DELETE', headers: H }).then(handleResponse)
