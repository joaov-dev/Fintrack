import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listCreditCardsHandler,
  createCreditCardHandler,
  updateCreditCardHandler,
  archiveCreditCardHandler,
} from '../controllers/creditCard.controller'
import {
  listStatementsHandler,
  getStatementDetailHandler,
  payStatementHandler,
} from '../controllers/cardStatement.controller'
import { requireFeature, requireUsage } from '../middlewares/planGate.middleware'

export const creditCardRoutes = Router()

creditCardRoutes.use(authenticate)

creditCardRoutes.get('/', listCreditCardsHandler)
creditCardRoutes.post('/', requireFeature('CREDIT_CARDS'), requireUsage('CREDIT_CARDS_LIMIT'), createCreditCardHandler)
creditCardRoutes.patch('/:id', updateCreditCardHandler)
creditCardRoutes.post('/:id/archive', archiveCreditCardHandler)

creditCardRoutes.get('/:id/statements', listStatementsHandler)
creditCardRoutes.get('/:id/statements/:sid', getStatementDetailHandler)
creditCardRoutes.post('/:id/statements/:sid/pay', payStatementHandler)
