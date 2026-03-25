import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Message } from '../types'
import { MessageBubble } from './MessageBubble'

export interface ChatContainerProps {
  messages: Message[]
  isLoading: boolean
}

export function ChatContainer({ messages, isLoading }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const autoScrollRef = useRef(true)

  const lastMessageId = useMemo(
    () => (messages.length ? messages[messages.length - 1].id : null),
    [messages]
  )

  const lastMessageContent = messages.length ? messages[messages.length - 1].content : ''

  useLayoutEffect(() => {
    if (!autoScroll) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, lastMessageContent, autoScroll, isLoading])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      const threshold = 24
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      const atBottom = distance <= threshold
      if (autoScrollRef.current !== atBottom) {
        autoScrollRef.current = atBottom
        setAutoScroll(atBottom)
      }
    }

    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 w-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10" />
        <div
          ref={scrollRef}
          className="relative h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isLatest={m.id === lastMessageId}
                isLoading={isLoading}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
      {!autoScroll && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
          <div className="pointer-events-auto rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur-md">
            已暂停自动滚动
          </div>
        </div>
      )}
    </div>
  )
}

