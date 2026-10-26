const API_URL = import.meta.env.VITE_API_URL || '/api'

export async function api(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    })
  } catch {
    throw new Error('Cannot reach StockPilot server. Check that the backend is running.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }

  return data
}
