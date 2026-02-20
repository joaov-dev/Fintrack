import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller'

export const categoryRoutes = Router()

categoryRoutes.use(authenticate)
categoryRoutes.get('/', listCategories)
categoryRoutes.post('/', createCategory)
categoryRoutes.put('/:id', updateCategory)
categoryRoutes.delete('/:id', deleteCategory)
