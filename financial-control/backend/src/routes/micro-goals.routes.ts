import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listMicroGoals, createMicroGoal, updateMicroGoal, deleteMicroGoal } from '../controllers/microGoals.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const microGoalsRoutes = Router()

microGoalsRoutes.use(authenticate)
microGoalsRoutes.use(requireFeature('INSIGHTS'))
microGoalsRoutes.get('/', listMicroGoals)
microGoalsRoutes.post('/', createMicroGoal)
microGoalsRoutes.patch('/:id', updateMicroGoal)
microGoalsRoutes.delete('/:id', deleteMicroGoal)
