import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller'
import { requireUsage } from '../middlewares/planGate.middleware'

export const accountRoutes = Router()

accountRoutes.use(authenticate)
accountRoutes.get('/', listAccounts)
accountRoutes.post('/', requireUsage('ACCOUNTS_LIMIT'), createAccount)
accountRoutes.put('/:id', updateAccount)
accountRoutes.delete('/:id', deleteAccount)
