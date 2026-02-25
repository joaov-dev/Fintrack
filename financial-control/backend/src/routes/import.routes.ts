import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { importTransactions, checkDuplicates } from '../controllers/import.controller'

export const importRoutes = Router()

importRoutes.use(authenticate)
importRoutes.post('/check-duplicates', checkDuplicates)
importRoutes.post('/transactions', importTransactions)
