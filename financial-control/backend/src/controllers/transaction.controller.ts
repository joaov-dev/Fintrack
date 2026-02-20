import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

const transactionSchema = z.object({
  categoryId: z.string().cuid(),
  accountId: z.string().cuid().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  recurrenceEnd: z.string().datetime().optional().nullable(),
})

/** Auto-generates recurring transaction instances for a given month if they don't exist yet */
async function generateRecurringForMonth(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)

  const templates = await prisma.transaction.findMany({
    where: {
      userId,
      isRecurring: true,
      date: { lt: start },
      OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: start } }],
    },
  })

  for (const tpl of templates) {
    if (!tpl.recurrenceType) continue

    if (tpl.recurrenceType === 'WEEKLY') {
      const targetDay = new Date(tpl.date).getDay()
      const d = new Date(year, month - 1, 1)
      while (d <= end) {
        if (d.getDay() === targetDay) {
          const exists = await prisma.transaction.findFirst({
            where: {
              parentId: tpl.id,
              date: { gte: new Date(d), lte: new Date(d.getTime() + 86399999) },
            },
          })
          if (!exists) {
            await prisma.transaction.create({
              data: {
                userId: tpl.userId, categoryId: tpl.categoryId, accountId: tpl.accountId,
                type: tpl.type, amount: tpl.amount, description: tpl.description,
                notes: tpl.notes, date: new Date(d), isRecurring: false, parentId: tpl.id,
              },
            })
          }
        }
        d.setDate(d.getDate() + 1)
      }
      continue
    }

    const tplDate = new Date(tpl.date)
    let instanceDate: Date | null = null

    if (tpl.recurrenceType === 'MONTHLY') {
      const day = Math.min(tplDate.getDate(), new Date(year, month, 0).getDate())
      instanceDate = new Date(year, month - 1, day, 12)
    } else if (tpl.recurrenceType === 'YEARLY' && tplDate.getMonth() === month - 1) {
      instanceDate = new Date(year, month - 1, tplDate.getDate(), 12)
    }

    if (!instanceDate) continue

    const exists = await prisma.transaction.findFirst({
      where: { parentId: tpl.id, date: { gte: start, lte: end } },
    })
    if (!exists) {
      await prisma.transaction.create({
        data: {
          userId: tpl.userId, categoryId: tpl.categoryId, accountId: tpl.accountId,
          type: tpl.type, amount: tpl.amount, description: tpl.description,
          notes: tpl.notes, date: instanceDate, isRecurring: false, parentId: tpl.id,
        },
      })
    }
  }
}

export async function listTransactions(req: AuthRequest, res: Response) {
  const { month, year, type, categoryId, accountId, search, isRecurring, startDate, endDate } = req.query

  if (month && year && !isRecurring) {
    await generateRecurringForMonth(req.userId!, Number(month), Number(year))
  }

  const where: Record<string, unknown> = { userId: req.userId }

  if (isRecurring === 'true') {
    where.isRecurring = true
    where.parentId = null
  } else if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    where.date = { gte: start, lte: end }
  } else if (startDate && endDate) {
    where.date = { gte: new Date(String(startDate)), lte: new Date(String(endDate)) }
  }

  if (type) where.type = type
  if (categoryId) where.categoryId = categoryId
  if (accountId) where.accountId = accountId
  if (search) where.description = { contains: String(search), mode: 'insensitive' }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
  })

  return res.json(transactions)
}

export async function createTransaction(req: AuthRequest, res: Response) {
  const data = transactionSchema.parse(req.body)

  const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: req.userId } })
  if (!category) return res.status(400).json({ error: 'Categoria inválida' })

  if (data.accountId) {
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId: req.userId } })
    if (!account) return res.status(400).json({ error: 'Conta inválida' })
  }

  if (data.isRecurring && !data.recurrenceType) {
    return res.status(400).json({ error: 'Informe o tipo de recorrência' })
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      userId: req.userId!,
      date: new Date(data.date),
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
    },
    include: { category: true, account: true },
  })
  return res.status(201).json(transaction)
}

export async function updateTransaction(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = transactionSchema.partial().parse(req.body)

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: req.userId } })
    if (!category) return res.status(400).json({ error: 'Categoria inválida' })
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
    },
    include: { category: true, account: true },
  })
  return res.json(updated)
}

export async function deleteTransaction(req: AuthRequest, res: Response) {
  const { id } = req.params

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  if (transaction.isRecurring) {
    await prisma.transaction.deleteMany({ where: { parentId: id } })
  }

  await prisma.transaction.delete({ where: { id } })
  return res.status(204).send()
}
