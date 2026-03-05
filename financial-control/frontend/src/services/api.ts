import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send refresh_token cookie automatically
})

// ── In-memory access token (not localStorage — safer vs XSS) ──────────────────
let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

// ── Request interceptor: attach access token + CSRF defense ──────────────────
// X-Requested-With proves the request comes from our JS (browsers cannot set
// this header in cross-origin <form> or <img> requests without a CORS preflight).
// Combined with SameSite=Strict on the refresh cookie and Bearer-token
// authentication, this provides defense-in-depth against CSRF attacks.
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let _isRefreshing = false
let _refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  _refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
  _refreshSubscribers.forEach((cb) => cb(token))
  _refreshSubscribers = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    // Only auto-refresh when the request was made WITH a token (authenticated request).
    // Skipping login/register/refresh so their 401s propagate normally to the caller.
    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.headers?.Authorization
    ) {
      if (_isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      _isRefreshing = true

      try {
        const { data } = await api.post('/auth/refresh')
        setAccessToken(data.accessToken)
        onRefreshed(data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch {
        setAccessToken(null)
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        _isRefreshing = false
      }
    }

    return Promise.reject(err)
  },
)
