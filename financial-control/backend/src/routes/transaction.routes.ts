import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listTransactions,
  createTransaction,
  createSplitTransaction,
  updateTransaction,
  deleteTransaction,
  suggestCategory,
  addAttachment,
  getAttachment,
  deleteAttachment,
  listTags,
  skipInstance,
  pauseTemplate,
} from '../controllers/transaction.controller'

export const transactionRoutes = Router()

transactionRoutes.use(authenticate)

transactionRoutes.get('/tags',           listTags)
transactionRoutes.get('/suggest',        suggestCategory)
transactionRoutes.post('/split',         createSplitTransaction)

transactionRoutes.get('/',              listTransactions)
transactionRoutes.post('/',             createTransaction)
transactionRoutes.put('/:id',           updateTransaction)
transactionRoutes.delete('/:id',        deleteTransaction)
transactionRoutes.patch('/:id/skip',    skipInstance)
transactionRoutes.patch('/:id/pause',   pauseTemplate)

transactionRoutes.post('/:id/attachments',        addAttachment)
transactionRoutes.get('/:id/attachments/:aid',    getAttachment)
transactionRoutes.delete('/:id/attachments/:aid', deleteAttachment)
