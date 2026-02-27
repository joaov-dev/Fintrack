import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { getAllocationTargets, saveAllocationTargets } from '../controllers/allocation-target.controller'

export const allocationTargetRoutes = Router()

allocationTargetRoutes.use(authenticate)
allocationTargetRoutes.get('/',  getAllocationTargets)
allocationTargetRoutes.post('/', saveAllocationTargets)
