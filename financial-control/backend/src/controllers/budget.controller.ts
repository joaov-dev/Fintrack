import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { audit } from '../lib/audit'

const budgetSchema = z.object({
  categoryId: z.string().cuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  amount: z.number().positive(),
})

function toNumber(d: Decimal) {
  return Number(d)
}

export async function listBudgets(req: AuthRequest, res: Response) {
  const { month, year } = req.query
  const now = new Date()

  const where: Record<string, unknown> = { userId: req.userId }
  if (month) where.month = Number(month)
  if (year) where.year = Number(year)
  if (!month && !year) {
    where.month = now.getMonth() + 1
    where.year = now.getFullYear()
  }

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
    orderBy: { category: { name: 'asc' } },
  })

  // Enrich with spent amount for the queried period
  const m = Number(month) || now.getMonth() + 1
  const y = Number(year) || now.getFullYear()
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59, 999)

  const result = await Promise.all(
    budgets.map(async (budget) => {
      const agg = await prisma.transaction.aggregate({
        where: {
          userId: req.userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
          isCardPayment: { not: true },
        },
        _sum: { amount: true },
      })
      const spent = agg._sum.amount ? toNumber(agg._sum.amount) : 0
      return {
        ...budget,
        amount: toNumber(budget.amount),
        spent,
        remaining: toNumber(budget.amount) - spent,
        percentage: toNumber(budget.amount) > 0 ? (spent / toNumber(budget.amount)) * 100 : 0,
      }
    }),
  )

  return res.json(result)
}

export async function upsertBudget(req: AuthRequest, res: Response) {
  const data = budgetSchema.parse(req.body)

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId: req.userId },
  })
  if (!category) return res.status(400).json({ error: 'Categoria inválida' })
  if (category.type !== 'EXPENSE') return res.status(400).json({ error: 'Orçamentos são apenas para categorias de despesa' })

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId: req.userId!,
        categoryId: data.categoryId,
        month: data.month,
        year: data.year,
      },
    },
    update: { amount: data.amount },
    create: { ...data, userId: req.userId! },
    include: { category: true },
  })

  return res.status(200).json({ ...budget, amount: toNumber(budget.amount) })
}

export async function deleteBudget(req: AuthRequest, res: Response) {
  const { id } = req.params

  const budget = await prisma.budget.findFirst({ where: { id, userId: req.userId } })
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' })

  await prisma.budget.delete({ where: { id } })
  audit('BUDGET_DELETE', req.userId!, req, { budgetId: id })
  return res.status(204).send()
}
