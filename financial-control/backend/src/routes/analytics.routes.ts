import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getNetWorth, getNetWorthHistoryHandler, getFinancialHealthHandler, getInsightsHandler, getMonthlyProjectionHandler } from '../controllers/analytics.controller'

export const analyticsRoutes = Router()

analyticsRoutes.use(authenticate)
analyticsRoutes.get('/net-worth', getNetWorth)
analyticsRoutes.get('/net-worth/history', getNetWorthHistoryHandler)
analyticsRoutes.get('/financial-health', getFinancialHealthHandler)
analyticsRoutes.get('/insights', getInsightsHandler)
analyticsRoutes.get('/monthly-projection', getMonthlyProjectionHandler)
