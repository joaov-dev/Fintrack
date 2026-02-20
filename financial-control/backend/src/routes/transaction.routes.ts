import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller'

export const transactionRoutes = Router()

transactionRoutes.use(authenticate)
transactionRoutes.get('/', listTransactions)
transactionRoutes.post('/', createTransaction)
transactionRoutes.put('/:id', updateTransaction)
transactionRoutes.delete('/:id', deleteTransaction)
