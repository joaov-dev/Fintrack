import 'dotenv/config'
import express from 'express'
import cors from 'cors'
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
import { errorHandler } from './middlewares/error.middleware'

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

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

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
