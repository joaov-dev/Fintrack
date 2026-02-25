import { create } from 'zustand'
import { User } from '@/types'
import { api, setAccessToken } from '@/services/api'
import { setFormatterConfig } from '@/lib/utils'

// Syncs the formatter singleton with the user's stored preferences.
// Called before every set({ user }) so formatted values update immediately.
function applyUserConfig(user: User): void {
  setFormatterConfig({
    locale:     user.locale     ?? 'pt-BR',
    currency:   user.currency   ?? 'BRL',
    dateFormat: (user.dateFormat as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') ?? 'DD/MM/YYYY',
  })
}

interface AuthState {
  user: User | null
  token: string | null       // kept for route guard compatibility — in-memory only
  isLoading: boolean
  isInitialized: boolean
  requiresMfa: boolean
  mfaToken: string | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  verifyMfa: (code: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setUser: (user: User) => void
}

// Deduplication guard: prevents React StrictMode from running initialize() twice
// concurrently, which would cause the second call to arrive with an already-rotated
// (and therefore invalid) refresh token, breaking the session.
let _initPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  requiresMfa: false,
  mfaToken: null,

  /** Called once at app startup — silently restores session from refresh cookie */
  initialize: async () => {
    if (_initPromise) return _initPromise
    _initPromise = (async () => {
      try {
        const { data } = await api.post('/auth/refresh')
        setAccessToken(data.accessToken)
        const { data: user } = await api.get('/auth/me')
        applyUserConfig(user)
        set({ user, token: data.accessToken, isInitialized: true })
      } catch {
        setAccessToken(null)
        set({ user: null, token: null, isInitialized: true })
      }
    })()
    return _initPromise
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.requiresMfa) {
        set({ requiresMfa: true, mfaToken: data.mfaToken })
        return
      }
      setAccessToken(data.accessToken)
      applyUserConfig(data.user)
      set({ user: data.user, token: data.accessToken, requiresMfa: false, mfaToken: null })
    } finally {
      set({ isLoading: false })
    }
  },

  verifyMfa: async (code) => {
    set({ isLoading: true })
    try {
      const { mfaToken } = get()
      const { data } = await api.post('/auth/mfa/verify', { mfaToken, code })
      setAccessToken(data.accessToken)
      applyUserConfig(data.user)
      set({ user: data.user, token: data.accessToken, requiresMfa: false, mfaToken: null })
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      setAccessToken(data.accessToken)
      applyUserConfig(data.user)
      set({ user: data.user, token: data.accessToken })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch { /* ignore errors — clear local state regardless */ }
    setAccessToken(null)
    set({ user: null, token: null, requiresMfa: false, mfaToken: null })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      applyUserConfig(data)
      set({ user: data })
    } catch {
      setAccessToken(null)
      set({ user: null, token: null })
    }
  },

  setUser: (user) => {
    applyUserConfig(user)
    set({ user })
  },
}))
