import type { Message } from '../types/chat'

export interface StreamChatParams {
  messages: Message[]
  onDelta: (delta: string) => void
  signal?: AbortSignal
}

export async function streamChat({ messages, onDelta, signal }: StreamChatParams) {
  const upstreamMessages = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant' || m.role === 'system') && m.content)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }))

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: upstreamMessages }),
    signal,
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

  const handleEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/)
    const eventLine = lines.find((l) => l.startsWith('event:'))
    const eventName = eventLine ? eventLine.slice(6).trim() : 'message'
    const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim())
    if (!dataLines.length) return
    const dataStr = dataLines.join('\n')
    if (eventName === 'done') {
      finished = true
      return
    }
    if (eventName === 'error') {
      try {
        const payload = JSON.parse(dataStr) as { message?: string; status?: number; body?: string }
        const detail = payload.message || payload.body || 'Upstream error'
        throw new Error(detail)
      } catch (e) {
        throw e instanceof Error ? e : new Error(String(e))
      }
    }
    try {
      const payload = JSON.parse(dataStr) as { delta?: string }
      if (payload.delta) onDelta(payload.delta)
    } catch {}
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    for (const e of events) {
      handleEvent(e)
      if (finished) return
    }
  }
}
