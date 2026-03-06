import { create } from 'zustand'
import adminApi from '../services/adminApi'

interface AdminUser {
  id: string
  username: string
  role: string
}

interface AdminAuthState {
  admin: AdminUser | null
  isInitialized: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  admin: null,
  isInitialized: false,

  fetchMe: async () => {
    try {
      const { data } = await adminApi.get('/auth/me')
      set({ admin: data.admin, isInitialized: true })
    } catch {
      set({ admin: null, isInitialized: true })
    }
  },

  login: async (username, password) => {
    const { data } = await adminApi.post('/auth/login', { username, password })
    set({ admin: data.admin })
  },

  logout: async () => {
    await adminApi.post('/auth/logout').catch(() => {})
    set({ admin: null })
    window.location.href = '/admin/login'
  },
}))
