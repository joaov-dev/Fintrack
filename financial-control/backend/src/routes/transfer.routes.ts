import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { createTransfer, deleteTransfer } from '../controllers/transfer.controller'

export const transferRoutes = Router()

transferRoutes.use(authenticate)
transferRoutes.post('/', createTransfer)
transferRoutes.delete('/:transferId', deleteTransfer)
