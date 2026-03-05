import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { audit } from '../lib/audit'

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6366f1'),
  icon: z.string().optional().default('tag'),
})

export async function listCategories(req: AuthRequest, res: Response) {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
  return res.json(categories)
}

export async function createCategory(req: AuthRequest, res: Response) {
  const data = categorySchema.parse(req.body)
  const category = await prisma.category.create({
    data: { ...data, userId: req.userId! },
  })
  return res.status(201).json(category)
}

export async function updateCategory(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = categorySchema.partial().parse(req.body)

  const category = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  })
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' })

  const updated = await prisma.category.update({ where: { id }, data })
  return res.json(updated)
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  const { id } = req.params

  const category = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  })
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' })

  const transactionCount = await prisma.transaction.count({ where: { categoryId: id } })
  if (transactionCount > 0) {
    return res.status(400).json({
      error: 'Não é possível excluir uma categoria com transações associadas',
    })
  }

  await prisma.category.delete({ where: { id } })
  audit('CATEGORY_DELETE', req.userId!, req, { categoryId: id, name: category.name })
  return res.status(204).send()
}
