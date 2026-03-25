import { History, LogIn, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AuthDialog, useAuthStore } from '../../auth'
import { streamChat } from '../api/streamChat'
import { ChatHistoryPanel } from '../components/ChatHistoryPanel'
import { ChatContainer } from '../components/ChatContainer'
import { InputArea } from '../components/InputArea'
import { useChatStore } from '../store/chatStore'

export function ChatPage() {
  const {
    sessions,
    activeSessionId,
    isLoading,
    createSession,
    setActiveSession,
    deleteSession,
    addMessage,
    updateLastMessage,
    setLoading,
    clearActiveMessages,
  } = useChatStore()
  const { user, check, logout, isSubmitting } = useAuthStore()
  const abortRef = useRef<AbortController | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  const sessionList = useMemo(
    () =>
      Object.values(sessions).sort((a, b) => {
        if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
        return b.createdAt - a.createdAt
      }),
    [sessions]
  )

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const messages = activeSession?.messages ?? []

  useEffect(() => {
    check()
  }, [check])

  useEffect(() => {
    if (!user) return
    const s = useChatStore.getState()
    s.resetHydration()
    s.hydrateFromServer()
  }, [user])

  useEffect(() => {
    if (sessionList.length === 0) {
      createSession()
      return
    }
    if (!activeSessionId || !sessions[activeSessionId]) {
      setActiveSession(sessionList[0].id)
    }
  }, [activeSessionId, createSession, sessionList, sessions, setActiveSession])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const onSend = async (text: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMessage = {
      id: makeId(),
      role: 'user',
      type: 'text',
      content: text,
      createdAt: Date.now(),
    } as const

    addMessage(userMessage)
    setLoading(true)

    const assistantMessage = {
      id: makeId(),
      role: 'assistant',
      type: 'text',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    } as const

    addMessage(assistantMessage)

    let acc = ''
    try {
      const snapshot = useChatStore.getState()
      const sid = snapshot.activeSessionId
      const baseMessages = sid && snapshot.sessions[sid] ? snapshot.sessions[sid].messages : []
      await streamChat({
        messages: baseMessages,
        signal: controller.signal,
        onDelta: (delta) => {
          acc += delta
          updateLastMessage(acc)
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      addMessage({
        id: makeId(),
        role: 'system',
        type: 'text',
        content: msg.includes('Missing AI_API_KEY')
          ? '后端未配置 AI_API_KEY，请在 .env 中设置后重启服务。'
          : `请求失败：${msg}`,
        createdAt: Date.now(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="mx-auto flex h-full max-w-6xl gap-4 px-4 py-6 sm:px-6">
        <div className="hidden h-full w-80 overflow-hidden rounded-3xl border border-white/10 md:block">
          <ChatHistoryPanel
            sessions={sessionList}
            activeSessionId={activeSessionId}
            onNew={() => createSession()}
            onSelect={(id) => setActiveSession(id)}
            onDelete={(id) => deleteSession(id)}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight">TravelMind AI</div>
              <div className="text-xs text-white/60">
                {activeSession?.title ?? '智能旅行规划聊天界面'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 sm:flex"
                  onClick={() => logout()}
                  disabled={isSubmitting}
                  title={user.username}
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              ) : (
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 sm:flex"
                  onClick={() => setShowAuth(true)}
                >
                  <LogIn className="h-4 w-4" />
                  登录
                </button>
              )}

              {!user ? (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 sm:hidden"
                  onClick={() => setShowAuth(true)}
                >
                  <LogIn className="h-4 w-4" />
                  登录
                </button>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 sm:hidden"
                  onClick={() => logout()}
                  disabled={isSubmitting}
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              )}

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 md:hidden"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-4 w-4" />
                历史
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => {
                  abortRef.current?.abort()
                  abortRef.current = null
                  clearActiveMessages()
                }}
              >
                <Trash2 className="h-4 w-4" />
                清空
              </button>
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1">
            <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <ChatContainer messages={messages} isLoading={isLoading} />
              <InputArea isLoading={isLoading} onSend={onSend} />
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="absolute inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowHistory(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[22rem] max-w-[90vw] overflow-hidden rounded-r-3xl border border-white/10">
            <ChatHistoryPanel
              sessions={sessionList}
              activeSessionId={activeSessionId}
              onNew={() => {
                createSession()
                setShowHistory(false)
              }}
              onSelect={(id) => {
                setActiveSession(id)
                setShowHistory(false)
              }}
              onDelete={(id) => deleteSession(id)}
              onClose={() => setShowHistory(false)}
            />
          </div>
        </div>
      )}

      <AuthDialog
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthed={() => {
          const s = useChatStore.getState()
          s.resetHydration()
          s.hydrateFromServer()
        }}
      />
    </div>
  )
}

function makeId() {
  const g = globalThis as any
  if (g.crypto?.randomUUID) return g.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
