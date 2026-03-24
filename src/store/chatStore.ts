import { create } from 'zustand'
import type { Message } from '../types/chat'

export interface ChatStore {
  messages: Message[]
  isLoading: boolean
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  updateLastMessage: (content) =>
    set((state) => {
      if (state.messages.length === 0) return state
      const next = [...state.messages]
      next[next.length - 1] = { ...next[next.length - 1], content }
      return { messages: next }
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [], isLoading: false }),
}))
