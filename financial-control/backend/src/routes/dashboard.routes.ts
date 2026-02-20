import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getSummary } from '../controllers/dashboard.controller'

export const dashboardRoutes = Router()

dashboardRoutes.use(authenticate)
dashboardRoutes.get('/summary', getSummary)
