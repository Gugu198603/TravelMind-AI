import { X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onAuthed?: () => void
}

export function AuthDialog({ open, onClose, onAuthed }: AuthDialogProps) {
  const { isSubmitting, error, login, register } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (!open) return null

  const submit = async () => {
    if (!username.trim() || !password) return
    if (mode === 'login') {
      await login(username.trim(), password)
    } else {
      await register(username.trim(), password)
    }
    onAuthed?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-base font-semibold text-white/90">
                {mode === 'login' ? '登录' : '注册'}
              </div>
              <div className="mt-0.5 text-xs text-white/55">
                登录后可跨设备同步历史记录
              </div>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              onClick={onClose}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pb-5">
            <div className="grid gap-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名（至少 3 位）"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码（至少 6 位）"
                type="password"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                }}
              />

              {error && (
                <div className="rounded-2xl border border-rose-300/15 bg-rose-500/10 px-4 py-3 text-xs text-rose-100/90">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={isSubmitting || !username.trim() || !password}
                onClick={submit}
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-sky-500/80 to-indigo-500/80 text-sm font-semibold text-white transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mode === 'login' ? '登录' : '注册并登录'}
              </button>

              <button
                type="button"
                className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80 hover:bg-white/10"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

