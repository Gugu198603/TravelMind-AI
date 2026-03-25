import { Mic, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export interface InputAreaProps {
  isLoading: boolean
  onSend: (text: string) => void
}

export function InputArea({ isLoading, onSend }: InputAreaProps) {
  const [value, setValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const canSend = useMemo(() => value.trim().length > 0 && !isLoading, [value, isLoading])

  const hasSpeech = useMemo(() => {
    if (typeof window === 'undefined') return false
    const w = window as any
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(180, el.scrollHeight)
    el.style.height = `${next}px`
  }, [value])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.()
      } catch {}
    }
  }, [])

  const send = () => {
    const text = value.trim()
    if (!text || isLoading) return
    onSend(text)
    setValue('')
  }

  const toggleRecording = () => {
    if (!hasSpeech) return
    if (isLoading) return
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isRecording) {
      try {
        recognitionRef.current?.stop?.()
      } finally {
        setIsRecording(false)
      }
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const result = event.results?.[event.results.length - 1]
      const transcript = result?.[0]?.transcript as string | undefined
      if (!transcript) return
      const next = value.length ? `${value.replace(/\s+$/g, '')} ${transcript}` : transcript
      setValue(next)
    }

    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    recognitionRef.current = recognition
    setIsRecording(true)
    recognition.start()
  }

  return (
    <div className="w-full border-t border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
        <div className="flex items-end gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            placeholder="输入你的旅行需求…"
            className="max-h-44 min-h-[44px] flex-1 resize-none bg-transparent text-sm text-white/90 placeholder:text-white/40 focus:outline-none"
            onChange={(e) => setValue(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if ((e.nativeEvent as any).isComposing) return
              if (isComposing) return
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />

          {hasSpeech && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                isRecording
                  ? 'border-rose-300/30 bg-rose-500/20 text-rose-100'
                  : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'
              } disabled:opacity-50`}
              aria-label="语音输入"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/80 to-indigo-500/80 px-4 text-sm font-medium text-white shadow-sm transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            发送
          </button>
        </div>

        <div className="mt-2 text-xs text-white/50">
          Enter 发送 · Shift+Enter 换行
        </div>
      </div>
    </div>
  )
}

