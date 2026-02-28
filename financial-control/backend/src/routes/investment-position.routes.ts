import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listPositions,
  createPosition,
  updatePosition,
  deletePosition,
  addYield,
} from '../controllers/investment-position.controller'
import {
  listMovements,
  addMovement,
  deleteMovement,
} from '../controllers/investment-movement.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const investmentPositionRoutes = Router()

investmentPositionRoutes.use(authenticate)
investmentPositionRoutes.use(requireFeature('INVESTMENTS_ADVANCED'))
investmentPositionRoutes.get('/',     listPositions)
investmentPositionRoutes.post('/',    createPosition)
investmentPositionRoutes.put('/:id',  updatePosition)
investmentPositionRoutes.delete('/:id', deletePosition)
investmentPositionRoutes.post('/:id/yield', addYield)

// Movement sub-routes
investmentPositionRoutes.get('/:positionId/movements',                  listMovements)
investmentPositionRoutes.post('/:positionId/movements',                 addMovement)
investmentPositionRoutes.delete('/:positionId/movements/:movementId',   deleteMovement)
