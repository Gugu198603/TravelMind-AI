import { Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { streamChat } from './api/chat'
import { ChatContainer } from './components/ChatContainer'
import { InputArea } from './components/InputArea'
import { useChatStore } from './store/chatStore'

function App() {
  const { messages, isLoading, addMessage, updateLastMessage, setLoading, clearMessages } =
    useChatStore()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (messages.length) return
    addMessage({
      id: makeId(),
      role: 'system',
      type: 'text',
      content: '欢迎来到 TravelMind AI，告诉我你的出行城市、天数和预算。',
      createdAt: Date.now(),
    })
  }, [addMessage, messages.length])

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
      await streamChat({
        messages: [...messages, userMessage],
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
        content: `请求失败：${msg}`,
        createdAt: Date.now(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">TravelMind AI</div>
            <div className="text-xs text-white/60">智能旅行规划聊天界面</div>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={() => {
              abortRef.current?.abort()
              abortRef.current = null
              clearMessages()
            }}
          >
            <Trash2 className="h-4 w-4" />
            清空
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1">
          <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <ChatContainer messages={messages} isLoading={isLoading} />
            <InputArea isLoading={isLoading} onSend={onSend} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

function makeId() {
  const g = globalThis as any
  if (g.crypto?.randomUUID) return g.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
