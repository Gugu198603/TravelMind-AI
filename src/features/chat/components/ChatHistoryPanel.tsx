import { MessageSquare, Plus, Trash2, X } from 'lucide-react'
import type { ChatSession } from '../store/chatStore'

export interface ChatHistoryPanelProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClose?: () => void
}

export function ChatHistoryPanel({
  sessions,
  activeSessionId,
  onNew,
  onSelect,
  onDelete,
  onClose,
}: ChatHistoryPanelProps) {
  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold text-white/90">历史记录</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNew}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/85 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            新对话
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="space-y-1">
          {sessions.map((s) => {
            const active = s.id === activeSessionId
            return (
              <div
                key={s.id}
                className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 ${
                  active
                    ? 'border-sky-300/25 bg-sky-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                      active
                        ? 'border-sky-300/20 bg-sky-500/20'
                        : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-white/75" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white/90">{s.title}</div>
                    <div className="mt-0.5 text-xs text-white/45">
                      {new Date(s.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/10 text-white/60 opacity-0 transition hover:bg-white/10 hover:text-white/85 group-hover:opacity-100"
                  aria-label="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          {sessions.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-white/50">
              暂无历史记录
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

