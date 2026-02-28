import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getAllocationTargets, saveAllocationTargets } from '../controllers/allocation-target.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const allocationTargetRoutes = Router()

allocationTargetRoutes.use(authenticate)
allocationTargetRoutes.use(requireFeature('INVESTMENT_ALLOCATION'))
allocationTargetRoutes.get('/',  getAllocationTargets)
allocationTargetRoutes.post('/', saveAllocationTargets)
