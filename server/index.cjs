const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/chat/stream', async (req, res) => {
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    res.status(500).json({ error: 'Missing AI_API_KEY' })
    return
  }

  const body = req.body || {}
  const messages = Array.isArray(body.messages) ? body.messages : []

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write(': ok\n\n')

  const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`

  let upstream
  const controller = new AbortController()
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages,
      }),
      signal: controller.signal,
    })
  } catch (e) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: String(e) })}\n\n`)
    res.end()
    return
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    res.write(
      `event: error\ndata: ${JSON.stringify({
        status: upstream.status,
        body: text,
      })}\n\n`
    )
    res.end()
    return
  }

  let buffer = ''
  let ended = false
  const pingTimer = setInterval(() => {
    if (ended) return
    res.write(': ping\n\n')
  }, 15000)

  const sendDelta = (delta) => {
    if (!delta) return
    if (ended) return
    res.write(`data: ${JSON.stringify({ delta })}\n\n`)
  }

  const sendDone = () => {
    if (ended) return
    ended = true
    clearInterval(pingTimer)
    res.write('event: done\ndata: {}\n\n')
    res.end()
  }

  upstream.body.on('data', (chunk) => {
    buffer += chunk.toString('utf8')
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const lines = part.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data) continue
        if (data === '[DONE]') {
          sendDone()
          return
        }
        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta?.content
          sendDelta(delta)
        } catch {}
      }
    }
  })

  upstream.body.on('end', () => {
    sendDone()
  })

  upstream.body.on('error', (e) => {
    if (ended) return
    ended = true
    clearInterval(pingTimer)
    res.write(`event: error\ndata: ${JSON.stringify({ message: String(e) })}\n\n`)
    res.end()
  })

  req.on('close', () => {
    try {
      controller.abort()
      upstream.body?.destroy?.()
    } catch {}
    clearInterval(pingTimer)
  })
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`server listening on http://localhost:${port}`)
})
