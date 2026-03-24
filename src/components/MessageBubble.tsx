import { Brain, Info, User, Wrench } from 'lucide-react'
import type { Message } from '../types/chat'
import { TravelPlanCard } from './TravelPlanCard'

export interface MessageBubbleProps {
  message: Message
  isLatest?: boolean
  isLoading?: boolean
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse-soft" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse-soft [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse-soft [animation-delay:300ms]" />
    </div>
  )
}

function InlineCursor() {
  return (
    <span className="ml-1 inline-block h-4 w-[6px] translate-y-[2px] rounded-sm bg-white/60 animate-pulse-soft" />
  )
}

export function MessageBubble({ message, isLatest, isLoading }: MessageBubbleProps) {
  const base =
    'animate-fade-in max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm'

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const isThought = message.type === 'thought'
  const isTool = message.type === 'tool'
  const isTravelPlan = message.type === 'travel_plan'

  if (isSystem) {
    return (
      <div className="flex w-full justify-center">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-white/75 backdrop-blur-md">
          <Info className="h-3.5 w-3.5" />
          <span>{message.content}</span>
        </div>
      </div>
    )
  }

  const align = isUser ? 'justify-end' : 'justify-start'
  const icon = isUser ? <User className="h-4 w-4" /> : null

  const bubbleClass = (() => {
    if (isUser)
      return `${base} border-sky-300/20 bg-gradient-to-br from-sky-500/30 to-indigo-500/20 text-white/95`
    if (isThought)
      return `${base} border-amber-300/15 bg-amber-500/10 text-white/85`
    if (isTool)
      return `${base} border-emerald-300/15 bg-emerald-500/10 text-white/85`
    if (isTravelPlan)
      return 'animate-fade-in w-full max-w-full'
    return `${base} border-white/10 bg-white/10 text-white/90`
  })()

  const headerIcon = (() => {
    if (isThought) return <Brain className="h-4 w-4 text-amber-200/90" />
    if (isTool) return <Wrench className="h-4 w-4 text-emerald-200/90" />
    if (isUser) return icon
    return null
  })()

  const headerLabel = (() => {
    if (isThought) return '思考过程'
    if (isTool) return '工具调用'
    if (isUser) return '你'
    return 'TravelMind AI'
  })()

  const showCursor = Boolean(isLatest && isLoading && !isUser && message.type === 'text')

  return (
    <div className={`flex w-full ${align}`}>
      <div className="flex max-w-full flex-col gap-1">
        {(isThought || isTool) && (
          <div className="flex items-center gap-2 px-1 text-xs text-white/65">
            {headerIcon}
            <span>{headerLabel}</span>
          </div>
        )}

        {isTravelPlan && message.travelPlan ? (
          <TravelPlanCard plan={message.travelPlan} />
        ) : (
          <div className={bubbleClass}>
            {!isThought && !isTool && (
              <div className="mb-1 flex items-center gap-2 text-xs text-white/60">
                {headerIcon}
                <span>{headerLabel}</span>
              </div>
            )}

            {isTool && message.toolCall ? (
              <div className="space-y-2">
                <div className="text-xs text-white/80">
                  {message.toolCall.name}
                </div>
                {message.toolCall.args && (
                  <pre className="max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/75">
                    {JSON.stringify(message.toolCall.args, null, 2)}
                  </pre>
                )}
                {message.toolCall.result && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/75">
                    {message.toolCall.result}
                  </div>
                )}
              </div>
            ) : message.content ? (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {showCursor && <InlineCursor />}
              </div>
            ) : showCursor ? (
              <div className="flex items-center gap-2 text-white/70">
                <TypingDots />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

