import { create } from 'zustand'
import { authApi } from '@/api/auth'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    await authApi.getCsrf()
    const { data } = await authApi.login(username, password)
    set({ user: data })
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null })
  },

  fetchMe: async () => {
    try {
      const { data } = await authApi.me()
      set({ user: data, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
