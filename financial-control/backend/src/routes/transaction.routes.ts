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
import { requireFeature } from '../middlewares/planGate.middleware'
import { ownedResource } from '../middlewares/ownership.middleware'

export const transactionRoutes = Router()

transactionRoutes.use(authenticate)

transactionRoutes.get('/tags',    listTags)
transactionRoutes.get('/suggest', suggestCategory)
transactionRoutes.post('/split',  createSplitTransaction)

transactionRoutes.get('/',    listTransactions)
transactionRoutes.post('/',   createTransaction)
transactionRoutes.put('/:id',    ownedResource('transaction'), updateTransaction)
transactionRoutes.delete('/:id', ownedResource('transaction'), deleteTransaction)
transactionRoutes.patch('/:id/skip',  requireFeature('RECURRING_TRANSACTIONS'), ownedResource('transaction'), skipInstance)
transactionRoutes.patch('/:id/pause', requireFeature('RECURRING_TRANSACTIONS'), ownedResource('transaction'), pauseTemplate)

transactionRoutes.post('/:id/attachments',        ownedResource('transaction'), addAttachment)
transactionRoutes.get('/:id/attachments/:aid',    ownedResource('transaction'), getAttachment)
transactionRoutes.delete('/:id/attachments/:aid', ownedResource('transaction'), deleteAttachment)
