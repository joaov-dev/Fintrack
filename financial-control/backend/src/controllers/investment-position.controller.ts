import { Response } from 'express'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

function toNumber(d: Decimal | null | undefined) {
  return d ? Number(d) : 0
}

const positionSchema = z.object({
  accountId: z.string().cuid(),
  name: z.string().min(1),
  ticker: z.string().optional().nullable(),
  type: z.enum(['STOCK', 'FUND', 'FIXED_INCOME', 'REAL_ESTATE', 'CRYPTO', 'OTHER']),
  quantity: z.number().positive().optional().nullable(),
  avgPrice: z.number().positive().optional().nullable(),
  currentValue: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
})

const yieldSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().optional(),
})

export async function listPositions(req: AuthRequest, res: Response) {
  const { accountId } = req.query

  const where: Record<string, unknown> = { userId: req.userId }
  if (accountId) where.accountId = String(accountId)

  const positions = await prisma.investmentPosition.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      transactions: {
        select: { id: true, amount: true, date: true, description: true, type: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  const result = positions.map((p) => ({
    ...p,
    currentValue: toNumber(p.currentValue),
    quantity: p.quantity ? toNumber(p.quantity) : null,
    avgPrice: p.avgPrice ? toNumber(p.avgPrice) : null,
    totalYields: p.transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + toNumber(t.amount), 0),
  }))

  return res.json(result)
}

export async function createPosition(req: AuthRequest, res: Response) {
  const data = positionSchema.parse(req.body)

  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId: req.userId, type: 'INVESTMENT' },
  })
  if (!account) return res.status(404).json({ error: 'Conta de investimento não encontrada' })

  const position = await prisma.investmentPosition.create({
    data: { ...data, userId: req.userId!, currentValue: data.currentValue ?? 0 },
  })

  return res.status(201).json({
    ...position,
    currentValue: toNumber(position.currentValue),
    quantity: position.quantity ? toNumber(position.quantity) : null,
    avgPrice: position.avgPrice ? toNumber(position.avgPrice) : null,
    totalYields: 0,
    transactions: [],
  })
}

export async function updatePosition(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = positionSchema.partial().parse(req.body)

  const position = await prisma.investmentPosition.findFirst({
    where: { id, userId: req.userId },
  })
  if (!position) return res.status(404).json({ error: 'Posição não encontrada' })

  const updated = await prisma.investmentPosition.update({
    where: { id },
    data,
  })

  return res.json({
    ...updated,
    currentValue: toNumber(updated.currentValue),
    quantity: updated.quantity ? toNumber(updated.quantity) : null,
    avgPrice: updated.avgPrice ? toNumber(updated.avgPrice) : null,
  })
}

export async function deletePosition(req: AuthRequest, res: Response) {
  const { id } = req.params

  const position = await prisma.investmentPosition.findFirst({
    where: { id, userId: req.userId },
  })
  if (!position) return res.status(404).json({ error: 'Posição não encontrada' })

  await prisma.investmentPosition.delete({ where: { id } })
  return res.status(204).send()
}

export async function addYield(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = yieldSchema.parse(req.body)

  const position = await prisma.investmentPosition.findFirst({
    where: { id, userId: req.userId },
    include: { account: true },
  })
  if (!position) return res.status(404).json({ error: 'Posição não encontrada' })

  const yieldCategory = await prisma.category.findFirst({
    where: { userId: req.userId, name: 'Investimentos' },
  })
  if (!yieldCategory) {
    return res.status(400).json({ error: 'Categoria "Investimentos" não encontrada' })
  }

  const [transaction, updatedPosition] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: req.userId!,
        categoryId: yieldCategory.id,
        accountId: position.accountId,
        positionId: position.id,
        type: 'INCOME',
        amount: data.amount,
        description: data.description || `Rendimento — ${position.name}`,
        date: new Date(data.date),
      },
      include: { category: true, account: true },
    }),
    prisma.investmentPosition.update({
      where: { id },
      data: { currentValue: { increment: data.amount } },
    }),
  ])

  return res.status(201).json({
    position: {
      ...updatedPosition,
      currentValue: toNumber(updatedPosition.currentValue),
      quantity: updatedPosition.quantity ? toNumber(updatedPosition.quantity) : null,
      avgPrice: updatedPosition.avgPrice ? toNumber(updatedPosition.avgPrice) : null,
    },
    transaction,
  })
}
