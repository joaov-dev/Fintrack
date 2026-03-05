import { Response } from 'express'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { audit } from '../lib/audit'

function toNumber(d: Decimal | null | undefined) {
  return d ? Number(d) : 0
}

function toNumberOrNull(d: Decimal | null | undefined) {
  return d ? Number(d) : null
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

/** Compute derived investment metrics from a position's movements */
function computeMetrics(
  currentValue: number,
  quantity: number | null,
  avgPrice: number | null,
  movements: { type: string; amount: number | Decimal; quantity: number | Decimal | null }[],
) {
  let totalContributions = 0
  let totalWithdrawals = 0
  let totalIncome = 0

  for (const m of movements) {
    const amt = Number(m.amount)
    if (m.type === 'CONTRIBUTION') totalContributions += amt
    else if (m.type === 'WITHDRAWAL') totalWithdrawals += amt
    else if (['DIVIDEND', 'JCP', 'INTEREST'].includes(m.type)) totalIncome += amt
  }

  // Cost basis: prefer quantity × avgPrice when both are available
  const costBasis =
    quantity != null && avgPrice != null && quantity > 0
      ? quantity * avgPrice
      : totalContributions - totalWithdrawals

  const unrealizedGain = currentValue - (costBasis > 0 ? costBasis : 0)
  const unrealizedGainPct = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0

  // Total P&L = current + what was taken out + income - what was put in
  const totalPnL = currentValue + totalWithdrawals + totalIncome - totalContributions
  const totalReturnPct = totalContributions > 0 ? (totalPnL / totalContributions) * 100 : 0

  // Realized gain is imprecise without lot tracking; approximate as total P&L - unrealized
  const realizedGain = totalPnL - unrealizedGain

  return {
    totalContributions,
    totalWithdrawals,
    totalIncome,
    costBasis: costBasis > 0 ? costBasis : 0,
    unrealizedGain,
    unrealizedGainPct,
    realizedGain,
    totalPnL,
    totalReturnPct,
  }
}

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
      movements: {
        orderBy: { date: 'desc' },
      },
    },
  })

  const result = positions.map((p) => {
    const cv = toNumber(p.currentValue)
    const qty = toNumberOrNull(p.quantity)
    const avg = toNumberOrNull(p.avgPrice)
    const metrics = computeMetrics(cv, qty, avg, p.movements)

    return {
      ...p,
      currentValue: cv,
      quantity: qty,
      avgPrice: avg,
      // Legacy field kept for backward compat
      totalYields: p.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + toNumber(t.amount), 0),
      movements: p.movements.map((m) => ({
        ...m,
        amount: Number(m.amount),
        quantity: m.quantity ? Number(m.quantity) : null,
        unitPrice: m.unitPrice ? Number(m.unitPrice) : null,
        date: m.date.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
      ...metrics,
    }
  })

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
    quantity: toNumberOrNull(position.quantity),
    avgPrice: toNumberOrNull(position.avgPrice),
    totalYields: 0,
    transactions: [],
    movements: [],
    totalContributions: 0,
    totalWithdrawals: 0,
    totalIncome: 0,
    costBasis: 0,
    unrealizedGain: 0,
    unrealizedGainPct: 0,
    realizedGain: 0,
    totalPnL: 0,
    totalReturnPct: 0,
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
    quantity: toNumberOrNull(updated.quantity),
    avgPrice: toNumberOrNull(updated.avgPrice),
  })
}

export async function deletePosition(req: AuthRequest, res: Response) {
  const { id } = req.params

  const position = await prisma.investmentPosition.findFirst({
    where: { id, userId: req.userId },
  })
  if (!position) return res.status(404).json({ error: 'Posição não encontrada' })

  await prisma.investmentPosition.delete({ where: { id } })
  audit('INVESTMENT_POSITION_DELETE', req.userId!, req, { positionId: id, name: position.name })
  return res.status(204).send()
}

// Legacy endpoint — kept for backward compatibility
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
      quantity: toNumberOrNull(updatedPosition.quantity),
      avgPrice: toNumberOrNull(updatedPosition.avgPrice),
    },
    transaction,
  })
}
