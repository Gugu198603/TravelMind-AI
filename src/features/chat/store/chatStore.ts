import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message } from '../types'
import {
  deleteSession as deleteRemoteSession,
  getSession as getRemoteSession,
  listSessions,
  upsertSession as upsertRemoteSession,
} from '../api/sessions'

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface ChatStore {
  sessions: Record<string, ChatSession>
  activeSessionId: string | null
  isLoading: boolean
  hasHydrated: boolean
  resetHydration: () => void
  hydrateFromServer: () => Promise<void>
  createSession: () => string
  setActiveSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  clearActiveMessages: () => void
}

function makeId() {
  const g = globalThis as any
  if (g.crypto?.randomUUID) return g.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultTitle() {
  return '新对话'
}

function welcomeMessage(): Message {
  return {
    id: makeId(),
    role: 'system',
    type: 'text',
    content: '欢迎来到 TravelMind AI，告诉我你的出行城市、天数和预算。',
    createdAt: Date.now(),
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null
const syncQueue = new Set<string>()

type SetState = any

function scheduleSync(set: SetState, get: () => ChatStore, sessionId: string) {
  if (!sessionId) return
  syncQueue.add(sessionId)
  if (syncTimer) return
  syncTimer = setTimeout(async () => {
    syncTimer = null
    const ids = Array.from(syncQueue)
    syncQueue.clear()
    for (const id of ids) {
      const s = get().sessions[id]
      if (!s) continue
      try {
        await upsertRemoteSession(s)
      } catch (e: any) {
        if (e?.status === 409 && e?.data?.session) {
          const remote = e.data.session as ChatSession
          set((state: ChatStore) => ({
            sessions: { ...state.sessions, [id]: remote },
          }))
        }
      }
    }
  }, 600)
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,
      isLoading: false,
      hasHydrated: false,

      resetHydration: () => set({ hasHydrated: false }),

      hydrateFromServer: async () => {
        if (get().hasHydrated) return
        try {
          const remoteList = await listSessions()
          if (!remoteList.length) {
            const localIds = Object.keys(get().sessions)
            for (const id of localIds) scheduleSync(set, get, id)
            set({ hasHydrated: true })
            return
          }

          const remoteSessions = await Promise.all(
            remoteList.map((s) => getRemoteSession(s.id).catch(() => null))
          )

          set((state) => {
            const merged = { ...state.sessions }
            const remoteIds = new Set(remoteList.map((s) => s.id))
            for (const rs of remoteSessions) {
              if (!rs) continue
              const local = merged[rs.id]
              if (!local || (rs.updatedAt || 0) >= (local.updatedAt || 0)) {
                merged[rs.id] = rs
              } else {
                scheduleSync(set, get, rs.id)
              }
            }
            for (const id of Object.keys(merged)) {
              if (!remoteIds.has(id)) scheduleSync(set, get, id)
            }

            const ids = Object.keys(merged).sort(
              (a, b) => (merged[b].updatedAt || 0) - (merged[a].updatedAt || 0)
            )
            const nextActive =
              state.activeSessionId && merged[state.activeSessionId]
                ? state.activeSessionId
                : ids[0] ?? null

            return { sessions: merged, activeSessionId: nextActive, hasHydrated: true }
          })
        } catch {
          set({ hasHydrated: true })
        }
      },

      createSession: () => {
        const id = makeId()
        const now = Date.now()
        const session: ChatSession = {
          id,
          title: defaultTitle(),
          createdAt: now,
          updatedAt: now,
          messages: [welcomeMessage()],
        }
        set((state) => ({
          sessions: { ...state.sessions, [id]: session },
          activeSessionId: id,
        }))
        scheduleSync(set, get, id)
        return id
      },

      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId })
        ;(async () => {
          try {
            const remote = await getRemoteSession(sessionId)
            set((state) => {
              const local = state.sessions[sessionId]
              if (local && (local.updatedAt || 0) > (remote.updatedAt || 0)) {
                scheduleSync(set, get, sessionId)
                return state
              }
              return { sessions: { ...state.sessions, [sessionId]: remote } }
            })
          } catch {}
        })()
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const next = { ...state.sessions }
          delete next[sessionId]
          const ids = Object.keys(next).sort(
            (a, b) => next[b].updatedAt - next[a].updatedAt
          )
          const nextActive =
            state.activeSessionId === sessionId ? ids[0] ?? null : state.activeSessionId
          return { sessions: next, activeSessionId: nextActive, isLoading: false }
        })
        ;(async () => {
          try {
            await deleteRemoteSession(sessionId)
          } catch {}
        })()
      },

      addMessage: (message) =>
        set((state) => {
          let activeId = state.activeSessionId
          let sessions = state.sessions

          if (!activeId || !sessions[activeId]) {
            const newId = makeId()
            const now = Date.now()
            sessions = {
              ...sessions,
              [newId]: {
                id: newId,
                title: defaultTitle(),
                createdAt: now,
                updatedAt: now,
                messages: [welcomeMessage()],
              },
            }
            activeId = newId
          }

          if (!activeId) return state

          const current = sessions[activeId]
          const nextMessages = [...current.messages, message]
          let nextTitle = current.title
          if (nextTitle === defaultTitle() && message.role === 'user') {
            const t = message.content.trim().replace(/\s+/g, ' ')
            nextTitle = t.length > 0 ? t.slice(0, 18) : nextTitle
          }

          scheduleSync(set, get, activeId)
          return {
            activeSessionId: activeId,
            sessions: {
              ...sessions,
              [activeId]: {
                ...current,
                title: nextTitle,
                updatedAt: Date.now(),
                messages: nextMessages,
              },
            },
          }
        }),

      updateLastMessage: (content) =>
        set((state) => {
          const activeId = state.activeSessionId
          if (!activeId) return state
          const session = state.sessions[activeId]
          if (!session || session.messages.length === 0) return state
          const nextMessages = [...session.messages]
          nextMessages[nextMessages.length - 1] = {
            ...nextMessages[nextMessages.length - 1],
            content,
          }
          scheduleSync(set, get, activeId)
          return {
            sessions: {
              ...state.sessions,
              [activeId]: { ...session, updatedAt: Date.now(), messages: nextMessages },
            },
          }
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      clearActiveMessages: () =>
        set((state) => {
          const activeId = state.activeSessionId
          if (!activeId) return { isLoading: false }
          const session = state.sessions[activeId]
          if (!session) return { isLoading: false }
          scheduleSync(set, get, activeId)
          return {
            isLoading: false,
            sessions: {
              ...state.sessions,
              [activeId]: { ...session, updatedAt: Date.now(), messages: [welcomeMessage()] },
            },
          }
        }),
    }),
    {
      name: 'travelmind.chat.v1',
      version: 1,
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
)
