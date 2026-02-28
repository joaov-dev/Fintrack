import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getNetWorth, getNetWorthHistoryHandler, getFinancialHealthHandler, getMonthlyProjectionHandler } from '../controllers/analytics.controller'
import { getInsights, getInsightsSummary, dismissInsight, snoozeInsight, reactivateInsight } from '../controllers/insights.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const analyticsRoutes = Router()

analyticsRoutes.use(authenticate)
analyticsRoutes.get('/net-worth', getNetWorth)
analyticsRoutes.get('/net-worth/history', getNetWorthHistoryHandler)
analyticsRoutes.get('/financial-health', requireFeature('FINANCIAL_HEALTH'), getFinancialHealthHandler)
analyticsRoutes.get('/monthly-projection', requireFeature('FORECAST'), getMonthlyProjectionHandler)

// Insights — order matters: /summary must be before /:id
analyticsRoutes.get('/insights/summary', requireFeature('INSIGHTS'), getInsightsSummary)
analyticsRoutes.get('/insights', requireFeature('INSIGHTS'), getInsights)
analyticsRoutes.post('/insights/:id/dismiss', requireFeature('INSIGHTS'), dismissInsight)
analyticsRoutes.post('/insights/:id/snooze', requireFeature('INSIGHTS'), snoozeInsight)
analyticsRoutes.post('/insights/:id/reactivate', requireFeature('INSIGHTS'), reactivateInsight)
