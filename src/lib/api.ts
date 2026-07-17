const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
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
