import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { listBudgets, upsertBudget, deleteBudget } from '../controllers/budget.controller'
import { ownedResource } from '../middlewares/ownership.middleware'

export const budgetRoutes = Router()

budgetRoutes.use(authenticate)
budgetRoutes.get('/',        listBudgets)
budgetRoutes.post('/',       upsertBudget)
budgetRoutes.delete('/:id',  ownedResource('budget'), deleteBudget)
