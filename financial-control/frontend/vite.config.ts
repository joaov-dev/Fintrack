import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// ── Security headers ───────────────────────────────────────────────────────────
const baseHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// CSP base directives (shared between dev and preview)
const cspBase = [
  "default-src 'self'",
  // Styles: inline needed for React style={} props; Google Fonts stylesheet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]

// Dev CSP: allows inline scripts required by @vitejs/plugin-react Fast Refresh preamble
const cspDev = [
  ...cspBase,
  // 'unsafe-inline' needed for React Fast Refresh injected preamble (dev only)
  "script-src 'self' 'unsafe-inline'",
  // WebSocket for Vite HMR
  "connect-src 'self' ws://localhost:*",
].join('; ')

// Production CSP: no inline scripts (built output has none)
const cspProd = [
  ...cspBase,
  "script-src 'self'",
  "connect-src 'self'",
].join('; ')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        // Only proxy XHR/fetch API calls, not browser page navigations.
        // When Accept contains text/html (browser navigation), bypass to Vite
        // so React Router serves the admin SPA.
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
    },
    headers: {
      ...baseHeaders,
      'Content-Security-Policy': cspDev,
    },
  },
  preview: {
    headers: {
      ...baseHeaders,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': cspProd,
    },
  },
})
