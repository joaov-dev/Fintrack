import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  suggestRule,
} from '../controllers/categorizationRule.controller'
import { requireFeature } from '../middlewares/planGate.middleware'
import { ownedResource } from '../middlewares/ownership.middleware'

export const categorizationRuleRoutes = Router()

categorizationRuleRoutes.use(authenticate)
categorizationRuleRoutes.use(requireFeature('RULES_AUTOCATEGORIZATION'))
categorizationRuleRoutes.get('/suggest', suggestRule)
categorizationRuleRoutes.get('/',        listRules)
categorizationRuleRoutes.post('/',       createRule)
categorizationRuleRoutes.put('/:id',     ownedResource('categorizationRule'), updateRule)
categorizationRuleRoutes.delete('/:id',  ownedResource('categorizationRule'), deleteRule)
