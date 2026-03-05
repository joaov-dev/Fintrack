import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listLiabilities, createLiability, updateLiability, deleteLiability, payLiability, listLiabilityPayments } from '../controllers/liability.controller'
import { requireFeature } from '../middlewares/planGate.middleware'
import { ownedResource } from '../middlewares/ownership.middleware'

export const liabilityRoutes = Router()

liabilityRoutes.use(authenticate)
liabilityRoutes.use(requireFeature('LIABILITIES'))
liabilityRoutes.get('/',              listLiabilities)
liabilityRoutes.post('/',             createLiability)
liabilityRoutes.put('/:id',           ownedResource('liability'), updateLiability)
liabilityRoutes.delete('/:id',        ownedResource('liability'), deleteLiability)
liabilityRoutes.post('/:id/pay',      ownedResource('liability'), payLiability)
liabilityRoutes.get('/:id/payments',  ownedResource('liability'), listLiabilityPayments)
