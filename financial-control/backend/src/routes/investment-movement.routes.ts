import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listAllMovements } from '../controllers/investment-movement.controller'

export const investmentMovementRoutes = Router()

investmentMovementRoutes.use(authenticate)
investmentMovementRoutes.get('/', listAllMovements)
