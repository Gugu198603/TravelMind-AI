export interface User {
  id: string
  username: string
}

async function requestJson(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) {
    try {
      const json = JSON.parse(text) as { error?: string; message?: string }
      throw new Error(json.error || json.message || `HTTP ${res.status}`)
    } catch {
      throw new Error(text || `HTTP ${res.status}`)
    }
  }
  return text ? JSON.parse(text) : {}
}

export async function me() {
  const json = await requestJson('/api/auth/me')
  return (json.user || null) as User | null
}

export async function register(username: string, password: string) {
  const json = await requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return json.user as User
}

export async function login(username: string, password: string) {
  const json = await requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return json.user as User
}

export async function logout() {
  await requestJson('/api/auth/logout', { method: 'POST', body: '{}' })
}

