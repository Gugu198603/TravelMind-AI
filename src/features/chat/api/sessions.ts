import type { ChatSession } from '../store/chatStore'

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
      const err = new Error(json.error || json.message || `HTTP ${res.status}`) as any
      err.status = res.status
      err.data = json
      throw err
    } catch {
      const err = new Error(text || `HTTP ${res.status}`) as any
      err.status = res.status
      throw err
    }
  }
  return text ? JSON.parse(text) : {}
}

export async function listSessions() {
  const json = await requestJson('/api/sessions')
  return (json.sessions || []) as Array<{
    id: string
    title: string
    createdAt: number
    updatedAt: number
  }>
}

export async function getSession(id: string) {
  const json = await requestJson(`/api/sessions/${encodeURIComponent(id)}`)
  return json.session as ChatSession
}

export async function upsertSession(session: ChatSession) {
  const json = await requestJson(`/api/sessions/${encodeURIComponent(session.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ session }),
  })
  return json.session as ChatSession
}

export async function deleteSession(id: string) {
  await requestJson(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

