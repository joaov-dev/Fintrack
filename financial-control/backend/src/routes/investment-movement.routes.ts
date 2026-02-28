import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listAllMovements } from '../controllers/investment-movement.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const investmentMovementRoutes = Router()

investmentMovementRoutes.use(authenticate)
investmentMovementRoutes.use(requireFeature('INVESTMENTS_ADVANCED'))
investmentMovementRoutes.get('/', listAllMovements)
