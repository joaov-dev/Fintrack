import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller'
import { requireUsage } from '../middlewares/planGate.middleware'
import { ownedResource } from '../middlewares/ownership.middleware'

export const accountRoutes = Router()

accountRoutes.use(authenticate)
accountRoutes.get('/',       listAccounts)
accountRoutes.post('/',      requireUsage('ACCOUNTS_LIMIT'), createAccount)
accountRoutes.put('/:id',    ownedResource('account'), updateAccount)
accountRoutes.delete('/:id', ownedResource('account'), deleteAccount)
