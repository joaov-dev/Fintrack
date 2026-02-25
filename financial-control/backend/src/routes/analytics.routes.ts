import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getNetWorth, getNetWorthHistoryHandler, getFinancialHealthHandler, getMonthlyProjectionHandler } from '../controllers/analytics.controller'
import { getInsights, getInsightsSummary, dismissInsight, snoozeInsight, reactivateInsight } from '../controllers/insights.controller'

export const analyticsRoutes = Router()

analyticsRoutes.use(authenticate)
analyticsRoutes.get('/net-worth', getNetWorth)
analyticsRoutes.get('/net-worth/history', getNetWorthHistoryHandler)
analyticsRoutes.get('/financial-health', getFinancialHealthHandler)
analyticsRoutes.get('/monthly-projection', getMonthlyProjectionHandler)

// Insights — order matters: /summary must be before /:id
analyticsRoutes.get('/insights/summary', getInsightsSummary)
analyticsRoutes.get('/insights', getInsights)
analyticsRoutes.post('/insights/:id/dismiss', dismissInsight)
analyticsRoutes.post('/insights/:id/snooze', snoozeInsight)
analyticsRoutes.post('/insights/:id/reactivate', reactivateInsight)
