import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listLiabilities, createLiability, updateLiability, deleteLiability, payLiability, listLiabilityPayments } from '../controllers/liability.controller'
import { requireFeature } from '../middlewares/planGate.middleware'

export const liabilityRoutes = Router()

liabilityRoutes.use(authenticate)
liabilityRoutes.use(requireFeature('LIABILITIES'))
liabilityRoutes.get('/', listLiabilities)
liabilityRoutes.post('/', createLiability)
liabilityRoutes.put('/:id', updateLiability)
liabilityRoutes.delete('/:id', deleteLiability)
liabilityRoutes.post('/:id/pay', payLiability)
liabilityRoutes.get('/:id/payments', listLiabilityPayments)
