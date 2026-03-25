import { create } from 'zustand'
import type { User } from '../api/auth'
import { login, logout, me, register } from '../api/auth'

export interface AuthStore {
  user: User | null
  isChecking: boolean
  isSubmitting: boolean
  error: string | null
  check: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isChecking: false,
  isSubmitting: false,
  error: null,

  check: async () => {
    if (get().isChecking) return
    set({ isChecking: true, error: null })
    try {
      const user = await me()
      set({ user })
    } catch (e) {
      set({ user: null })
    } finally {
      set({ isChecking: false })
    }
  },

  login: async (username, password) => {
    set({ isSubmitting: true, error: null })
    try {
      const user = await login(username, password)
      set({ user })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ error: msg })
      throw e
    } finally {
      set({ isSubmitting: false })
    }
  },

  register: async (username, password) => {
    set({ isSubmitting: true, error: null })
    try {
      const user = await register(username, password)
      set({ user })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ error: msg })
      throw e
    } finally {
      set({ isSubmitting: false })
    }
  },

  logout: async () => {
    set({ isSubmitting: true, error: null })
    try {
      await logout()
      set({ user: null })
    } finally {
      set({ isSubmitting: false })
    }
  },
}))

