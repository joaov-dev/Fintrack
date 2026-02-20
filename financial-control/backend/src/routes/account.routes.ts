import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller'

export const accountRoutes = Router()

accountRoutes.use(authenticate)
accountRoutes.get('/', listAccounts)
accountRoutes.post('/', createAccount)
accountRoutes.put('/:id', updateAccount)
accountRoutes.delete('/:id', deleteAccount)
