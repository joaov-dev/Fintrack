import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listGoalsHandler, createGoalHandler, updateGoalHandler, deleteGoalHandler } from '../controllers/goals.controller'

export const goalsRoutes = Router()

goalsRoutes.use(authenticate)
goalsRoutes.get('/', listGoalsHandler)
goalsRoutes.post('/', createGoalHandler)
goalsRoutes.put('/:id', updateGoalHandler)
goalsRoutes.delete('/:id', deleteGoalHandler)
