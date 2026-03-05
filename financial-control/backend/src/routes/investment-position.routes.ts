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
import { ownedResource } from '../middlewares/ownership.middleware'

export const investmentPositionRoutes = Router()

investmentPositionRoutes.use(authenticate)
investmentPositionRoutes.use(requireFeature('INVESTMENTS_ADVANCED'))
investmentPositionRoutes.get('/',    listPositions)
investmentPositionRoutes.post('/',   createPosition)
investmentPositionRoutes.put('/:id',    ownedResource('investmentPosition'), updatePosition)
investmentPositionRoutes.delete('/:id', ownedResource('investmentPosition'), deletePosition)
investmentPositionRoutes.post('/:id/yield', ownedResource('investmentPosition'), addYield)

// Movement sub-routes — ownership validated on the parent position
investmentPositionRoutes.get('/:positionId/movements',                ownedResource('investmentPosition', 'positionId'), listMovements)
investmentPositionRoutes.post('/:positionId/movements',               ownedResource('investmentPosition', 'positionId'), addMovement)
investmentPositionRoutes.delete('/:positionId/movements/:movementId', ownedResource('investmentPosition', 'positionId'), deleteMovement)
