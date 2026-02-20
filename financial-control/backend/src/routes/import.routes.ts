import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { importTransactions } from '../controllers/import.controller'

export const importRoutes = Router()

importRoutes.use(authenticate)
importRoutes.post('/transactions', importTransactions)
