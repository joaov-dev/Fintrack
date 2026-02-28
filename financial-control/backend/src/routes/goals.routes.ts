import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listGoalsHandler, createGoalHandler, updateGoalHandler, deleteGoalHandler } from '../controllers/goals.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const goalsRoutes = Router()

goalsRoutes.use(authenticate)
goalsRoutes.use(requireFeature('GOALS'))
goalsRoutes.get('/', listGoalsHandler)
goalsRoutes.post('/', createGoalHandler)
goalsRoutes.put('/:id', updateGoalHandler)
goalsRoutes.delete('/:id', deleteGoalHandler)
