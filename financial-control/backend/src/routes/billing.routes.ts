import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  resumeSubscription,
  getEntitlements,
} from '../controllers/billing.controller'

export const billingRoutes = Router()

billingRoutes.get('/plans', getPlans)

billingRoutes.use(authenticate)
billingRoutes.get('/entitlements', getEntitlements)
billingRoutes.get('/current-subscription', getCurrentSubscription)
billingRoutes.post('/checkout-session', createCheckoutSession)
billingRoutes.post('/portal-session', createPortalSession)
billingRoutes.post('/cancel', cancelSubscription)
billingRoutes.post('/resume', resumeSubscription)
