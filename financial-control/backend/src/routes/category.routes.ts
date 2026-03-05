import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller'
import { ownedResource } from '../middlewares/ownership.middleware'

export const categoryRoutes = Router()

categoryRoutes.use(authenticate)
categoryRoutes.get('/',       listCategories)
categoryRoutes.post('/',      createCategory)
categoryRoutes.put('/:id',    ownedResource('category'), updateCategory)
categoryRoutes.delete('/:id', ownedResource('category'), deleteCategory)
