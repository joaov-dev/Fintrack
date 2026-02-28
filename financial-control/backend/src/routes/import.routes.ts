import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { importTransactions, checkDuplicates } from '../controllers/import.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const importRoutes = Router()

importRoutes.use(authenticate)
importRoutes.use(requireFeature('CSV_IMPORT'))
importRoutes.post('/check-duplicates', checkDuplicates)
importRoutes.post('/transactions', importTransactions)
