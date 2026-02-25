import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  suggestRule,
} from '../controllers/categorizationRule.controller'

export const categorizationRuleRoutes = Router()

categorizationRuleRoutes.use(authenticate)
categorizationRuleRoutes.get('/suggest', suggestRule)
categorizationRuleRoutes.get('/',        listRules)
categorizationRuleRoutes.post('/',       createRule)
categorizationRuleRoutes.put('/:id',     updateRule)
categorizationRuleRoutes.delete('/:id',  deleteRule)
