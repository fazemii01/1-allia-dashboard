const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token')
  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const msg = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || `API error ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  get: <T>(path: string, options?: RequestInit): Promise<T> =>
    apiFetch<T>(path, { method: 'GET', ...options }),
  
  post: <T>(path: string, body?: any, options?: RequestInit): Promise<T> =>
    apiFetch<T>(path, { 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined, 
      ...options 
    }),
  
  put: <T>(path: string, body?: any, options?: RequestInit): Promise<T> =>
    apiFetch<T>(path, { 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined, 
      ...options 
    }),
  
  patch: <T>(path: string, body?: any, options?: RequestInit): Promise<T> =>
    apiFetch<T>(path, { 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : undefined, 
      ...options 
    }),
  
  delete: <T>(path: string, options?: RequestInit): Promise<T> =>
    apiFetch<T>(path, { method: 'DELETE', ...options }),
}
