import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import hpp from 'hpp'

import { authRoutes } from './routes/auth.routes'
import { categoryRoutes } from './routes/category.routes'
import { transactionRoutes } from './routes/transaction.routes'
import { dashboardRoutes } from './routes/dashboard.routes'
import { accountRoutes } from './routes/account.routes'
import { budgetRoutes } from './routes/budget.routes'
import { transferRoutes } from './routes/transfer.routes'
import { investmentPositionRoutes } from './routes/investment-position.routes'
import { liabilityRoutes } from './routes/liability.routes'
import { analyticsRoutes } from './routes/analytics.routes'
import { importRoutes } from './routes/import.routes'
import { goalsRoutes } from './routes/goals.routes'
import { creditCardRoutes } from './routes/credit-cards.routes'
import { microGoalsRoutes } from './routes/micro-goals.routes'
import { categorizationRuleRoutes } from './routes/categorizationRule.routes'
import { investmentMovementRoutes } from './routes/investment-movement.routes'
import { allocationTargetRoutes } from './routes/allocation-target.routes'
import { billingRoutes } from './routes/billing.routes'
import { healthRoutes } from './routes/health.routes'
import { privacyRoutes } from './routes/privacy.routes'
import { adminRoutes } from './routes/admin.routes'
import { stripeWebhook } from './controllers/billing.controller'
import { errorHandler } from './middlewares/error.middleware'
import { apiLimiter, authLimiter, userLimiter, heavyLimiter } from './middlewares/rateLimiter'
import { requestLogger } from './middlewares/requestLogger'
import { anomalyDetector } from './middlewares/anomalyDetector'
import { startRetentionService } from './services/retentionService'

const app = express()
const PORT = process.env.PORT || 3333

// ── Correlation ID + HTTP access log (SecOps) ────────────────────────────────
// requestLogger MUST be first: attaches req.requestId used by everything below.
app.use(requestLogger)

// ── Anomaly detection (SecOps) ────────────────────────────────────────────────
// Runs before rate limiters — detection is passive (logs only, never blocks).
app.use(anomalyDetector)

// ── Security headers (OWASP #9) ───────────────────────────────────────────────
// Sets: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
//       Referrer-Policy, Content-Security-Policy, Cross-Origin-* policies, etc.
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins, credentials: true }))

// ── Stripe webhook — raw body BEFORE json parser ──────────────────────────────
// Stays at /api/billing/webhook/stripe (no version prefix — Stripe URL is static)
app.post('/api/billing/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

// ── Payload limits (OWASP #6) — ordered from most specific to most general ───
// Attachment uploads: base64 ~2 MB raw ≈ 2.7 MB base64 — allow up to 3 MB
app.use('/api/v1/transactions', (req, res, next) => {
  if (req.path.includes('/attachments') && req.method === 'POST') {
    return express.json({ limit: '3mb' })(req, res, next)
  }
  next()
})
// CSV / OFX import may include many transactions in one file
app.use('/api/v1/import', express.json({ limit: '10mb' }))
// Everything else: 100 KB is generous for any structured JSON payload
app.use(express.json({ limit: '100kb' }))

app.use(cookieParser())

// ── HTTP Parameter Pollution protection (OWASP #10 / #2) ─────────────────────
// Prevents attacks like ?type=INCOME&type=EXPENSE confusing query parsers
app.use(hpp())

// ── Rate limiting (OWASP #3) ──────────────────────────────────────────────────
// Layer 1: IP-based global cap — keeps bots from overwhelming the server
app.use('/api', apiLimiter)
// Layer 2: stricter limits on auth brute-force targets
app.use('/api/v1/auth/login',    authLimiter)
app.use('/api/v1/auth/register', authLimiter)
// Layer 3: per-user cap (applied inside authenticated routes via router middleware)
// Layer 4: heavy endpoints — analytics & import are DB-intensive
app.use('/api/v1/analytics', heavyLimiter)
app.use('/api/v1/import',    heavyLimiter)

// ── Admin panel — isolated router, own rate limiting, cookie-based auth ───────
// Mounted BEFORE /api so apiLimiter does not apply to /admin/* routes.
// Admin routes apply their own adminLoginLimiter + adminApiLimiter internally.
app.use('/admin', adminRoutes)

// ── Health check (no version — used by monitoring/infra tools) ───────────────
app.use('/api/health', healthRoutes)

// ── API v1 routes (OWASP #8 — versioning) ────────────────────────────────────
// All business routes live under /api/v1/ so breaking changes can be introduced
// in /api/v2/ without affecting existing clients.
const v1 = express.Router()
// Apply per-user rate limiter to all authenticated v1 routes
v1.use(userLimiter)

v1.use('/auth',                        authRoutes)
v1.use('/categories',                  categoryRoutes)
v1.use('/transactions',                transactionRoutes)
v1.use('/dashboard',                   dashboardRoutes)
v1.use('/accounts',                    accountRoutes)
v1.use('/budgets',                     budgetRoutes)
v1.use('/transfers',                   transferRoutes)
v1.use('/investment-positions',        investmentPositionRoutes)
v1.use('/liabilities',                 liabilityRoutes)
v1.use('/analytics',                   analyticsRoutes)
v1.use('/import',                      importRoutes)
v1.use('/goals',                       goalsRoutes)
v1.use('/credit-cards',               creditCardRoutes)
v1.use('/micro-goals',                microGoalsRoutes)
v1.use('/categorization-rules',        categorizationRuleRoutes)
v1.use('/investment-movements',        investmentMovementRoutes)
v1.use('/investment-allocation-targets', allocationTargetRoutes)
v1.use('/billing',                     billingRoutes)
v1.use('/privacy',                     privacyRoutes)

app.use('/api/v1', v1)

// ── Global error handler (OWASP #7) ──────────────────────────────────────────
app.use(errorHandler)

// Don't bind to a port when imported by integration tests (supertest handles transport)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })

  // Start log retention cleanup service (runs 60s after startup, then every 24h)
  startRetentionService()
}

export default app
