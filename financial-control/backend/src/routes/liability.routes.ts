import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listLiabilities, createLiability, updateLiability, deleteLiability } from '../controllers/liability.controller'

export const liabilityRoutes = Router()

liabilityRoutes.use(authenticate)
liabilityRoutes.get('/', listLiabilities)
liabilityRoutes.post('/', createLiability)
liabilityRoutes.put('/:id', updateLiability)
liabilityRoutes.delete('/:id', deleteLiability)
