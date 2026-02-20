import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listPositions,
  createPosition,
  updatePosition,
  deletePosition,
  addYield,
} from '../controllers/investment-position.controller'

export const investmentPositionRoutes = Router()

investmentPositionRoutes.use(authenticate)
investmentPositionRoutes.get('/', listPositions)
investmentPositionRoutes.post('/', createPosition)
investmentPositionRoutes.put('/:id', updatePosition)
investmentPositionRoutes.delete('/:id', deletePosition)
investmentPositionRoutes.post('/:id/yield', addYield)
