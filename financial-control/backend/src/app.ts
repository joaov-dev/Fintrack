import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
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
import { stripeWebhook } from './controllers/billing.controller'
import { errorHandler } from './middlewares/error.middleware'
import { apiLimiter, authLimiter } from './middlewares/rateLimiter'

const app = express()
const PORT = process.env.PORT || 3333

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.post('/api/billing/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook)
app.use(express.json({ limit: '5mb' })) // large enough for base64-encoded profile photos (2 MB raw ≈ 2.7 MB base64)
app.use(cookieParser())
app.use('/api', apiLimiter)

// Stricter limit on auth endpoints prone to bruteforce
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/budgets', budgetRoutes)
app.use('/api/transfers', transferRoutes)
app.use('/api/investment-positions', investmentPositionRoutes)
app.use('/api/liabilities', liabilityRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/import', importRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/credit-cards', creditCardRoutes)
app.use('/api/micro-goals', microGoalsRoutes)
app.use('/api/categorization-rules',           categorizationRuleRoutes)
app.use('/api/investment-movements',           investmentMovementRoutes)
app.use('/api/investment-allocation-targets',  allocationTargetRoutes)
app.use('/api/billing', billingRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
