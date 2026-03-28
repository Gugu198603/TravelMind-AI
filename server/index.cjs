const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const app = express()

// CORS：支持本地开发与通过环境变量配置的生产域名白名单（逗号分隔）
function getAllowedOrigins() {
  const env = process.env.CORS_ORIGIN || ''
  const list = env
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // 开发默认允许
  list.push('http://127.0.0.1:5173', 'http://localhost:5173')
  return list
}

app.use(
  cors({
    origin(origin, cb) {
      const allowed = getAllowedOrigins()
      // 无来源（如同源或 curl）默认放行
      if (!origin) return cb(null, true)
      if (allowed.includes(origin)) return cb(null, true)
      // 允许 localhost 任意端口（常见本地调试场景）
      if (/^http:\/\/localhost:\d+/.test(origin)) return cb(null, true)
      if (/^http:\/\/127\.0\.0\.1:\d+/.test(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))

const dataFile = path.join(__dirname, 'data.json')
let db = { users: {}, authSessions: {} }
try {
  const raw = fs.readFileSync(dataFile, 'utf8')
  db = JSON.parse(raw)
} catch {}
if (!db || typeof db !== 'object') db = { users: {}, authSessions: {} }
if (!db.users || typeof db.users !== 'object') db.users = {}
if (!db.authSessions || typeof db.authSessions !== 'object') db.authSessions = {}

let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    const tmp = `${dataFile}.tmp`
    fs.writeFile(tmp, JSON.stringify(db), (err) => {
      if (err) return
      fs.rename(tmp, dataFile, () => {})
    })
  }, 300)
}

function getUserId(req) {
  const v = req.headers['x-user-id']
  if (typeof v === 'string' && v.trim()) return v.trim()
  return null
}

function ensureUser(userId) {
  if (!db.users[userId]) db.users[userId] = { id: userId, sessions: {} }
  return db.users[userId]
}

function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}
  const out = {}
  const parts = header.split(';')
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx === -1) continue
    const k = p.slice(0, idx).trim()
    const v = p.slice(idx + 1).trim()
    out[k] = decodeURIComponent(v)
  }
  return out
}

function setCookie(res, name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge != null) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`)
}

function makeId() {
  return crypto.randomBytes(16).toString('hex')
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10)
}

function verifyPassword(password, hash) {
  try {
    return bcrypt.compareSync(password, hash)
  } catch {
    return false
  }
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production'
  return { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
}

function getAuthUser(req) {
  const cookies = parseCookies(req)
  const sid = cookies.sid
  if (!sid) return null
  const session = db.authSessions[sid]
  if (!session) return null
  if (typeof session.expiresAt === 'number' && session.expiresAt < Date.now()) {
    delete db.authSessions[sid]
    scheduleSave()
    return null
  }
  const user = db.users[session.userId]
  if (!user) return null
  return { id: user.id, username: user.username }
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.user = user
  next()
}

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    res.status(400).json({ error: 'Missing username or password' })
    return
  }
  const uname = String(username).trim()
  const pwd = String(password)
  if (uname.length < 3) {
    res.status(400).json({ error: 'Username too short' })
    return
  }
  if (pwd.length < 6) {
    res.status(400).json({ error: 'Password too short' })
    return
  }

  const userIds = Object.keys(db.users)
  for (const id of userIds) {
    if (db.users[id]?.username === uname) {
      res.status(409).json({ error: 'Username already exists' })
      return
    }
  }

  const userId = makeId()
  db.users[userId] = {
    id: userId,
    username: uname,
    passwordHash: hashPassword(pwd),
    createdAt: Date.now(),
    sessions: {},
  }

  const sid = makeId()
  db.authSessions[sid] = {
    sid,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + cookieOptions().maxAge,
    lastSeenAt: Date.now(),
  }
  scheduleSave()

  setCookie(res, 'sid', sid, cookieOptions())
  res.json({ user: { id: userId, username: uname } })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    res.status(400).json({ error: 'Missing username or password' })
    return
  }
  const uname = String(username).trim()
  const pwd = String(password)

  const user = Object.values(db.users).find((u) => u && u.username === uname)
  if (!user || !verifyPassword(pwd, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const sid = makeId()
  db.authSessions[sid] = {
    sid,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + cookieOptions().maxAge,
    lastSeenAt: Date.now(),
  }
  scheduleSave()

  setCookie(res, 'sid', sid, cookieOptions())
  res.json({ user: { id: user.id, username: user.username } })
})

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req)
  const sid = cookies.sid
  if (sid && db.authSessions[sid]) {
    delete db.authSessions[sid]
    scheduleSave()
  }
  clearCookie(res, 'sid')
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req)
  res.json({ user })
})

app.get('/api/sessions', (req, res) => {
  const user = getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const userRecord = ensureUser(user.id)
  const list = Object.values(userRecord.sessions).map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  res.json({ sessions: list })
})

app.get('/api/sessions/:id', (req, res) => {
  const user = getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const userRecord = ensureUser(user.id)
  const s = userRecord.sessions[req.params.id]
  if (!s) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ session: s })
})

app.put('/api/sessions/:id', (req, res) => {
  const user = getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const body = req.body || {}
  const incoming = body.session || body
  const id = req.params.id
  const now = Date.now()

  const session = {
    id,
    title: typeof incoming.title === 'string' ? incoming.title : '新对话',
    createdAt: typeof incoming.createdAt === 'number' ? incoming.createdAt : now,
    updatedAt: typeof incoming.updatedAt === 'number' ? incoming.updatedAt : now,
    messages: Array.isArray(incoming.messages) ? incoming.messages : [],
  }

  const userRecord = ensureUser(user.id)
  const existing = userRecord.sessions[id]
  if (existing && typeof existing.updatedAt === 'number' && existing.updatedAt > session.updatedAt) {
    res.status(409).json({ error: 'Conflict', session: existing })
    return
  }
  userRecord.sessions[id] = session
  scheduleSave()
  res.json({ session })
})

app.delete('/api/sessions/:id', (req, res) => {
  const user = getAuthUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const userRecord = ensureUser(user.id)
  delete userRecord.sessions[req.params.id]
  scheduleSave()
  res.json({ ok: true })
})

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

// 生产环境：静态托管前端构建产物，并提供 SPA fallback
try {
  const distPath = path.join(__dirname, '..', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, { maxAge: '1h', index: false }))
    app.get('*', (req, res, next) => {
      // 避免覆盖 API 路由
      if (req.path.startsWith('/api/')) return next()
      const indexFile = path.join(distPath, 'index.html')
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile)
      next()
    })
  }
} catch {}

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`server listening on http://localhost:${port}`)
})
