import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

function toNum(d: { toNumber?: () => number } | null | undefined) {
  return d ? Number(d) : null
}

const movementSchema = z.object({
  type: z.enum(['CONTRIBUTION', 'WITHDRAWAL', 'DIVIDEND', 'JCP', 'INTEREST', 'BONUS', 'SPLIT']),
  amount: z.number().min(0),
  quantity: z.number().positive().optional().nullable(),
  unitPrice: z.number().positive().optional().nullable(),
  date: z.string(),
  description: z.string().optional().nullable(),
})

function serializeMovement(m: {
  id: string; positionId: string; userId: string; type: string; amount: { toNumber: () => number };
  quantity: { toNumber: () => number } | null; unitPrice: { toNumber: () => number } | null;
  date: Date; description: string | null; createdAt: Date;
  position?: { name: string; ticker: string | null; type: string }
}) {
  return {
    ...m,
    amount: Number(m.amount),
    quantity: toNum(m.quantity),
    unitPrice: toNum(m.unitPrice),
    date: m.date.toISOString(),
    createdAt: m.createdAt.toISOString(),
  }
}

// GET /investment-positions/:positionId/movements
export async function listMovements(req: AuthRequest, res: Response) {
  const { positionId } = req.params
  const userId = req.userId!

  const position = await prisma.investmentPosition.findFirst({ where: { id: positionId, userId } })
  if (!position) return res.status(404).json({ error: 'Posição não encontrada' })

  const movements = await prisma.investmentMovement.findMany({
    where: { positionId, userId },
    orderBy: { date: 'desc' },
  })

  return res.json(movements.map(serializeMovement))
}

// GET /investment-movements  (all movements across all positions)
export async function listAllMovements(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const { from, to, type, positionId } = req.query

  const where: Record<string, unknown> = { userId }
  if (positionId) where.positionId = String(positionId)
  if (type) where.type = String(type)
  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(String(from))
    if (to) dateFilter.lte = new Date(String(to))
    where.date = dateFilter
  }

  const movements = await prisma.investmentMovement.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      position: { select: { name: true, ticker: true, type: true, accountId: true } },
    },
  })

  return res.json(movements.map(serializeMovement))
}

// POST /investment-positions/:positionId/movements
export async function addMovement(req: AuthRequest, res: Response) {
  const { positionId } = req.params
  const userId = req.userId!

  const position = await prisma.investmentPosition.findFirst({
    where: { id: positionId, userId },
  })
  if (!position) return res.status(404).json({ error: 'Posição não encontrada' })

  const data = movementSchema.parse(req.body)

  const [movement] = await prisma.$transaction(async (tx) => {
    const mv = await tx.investmentMovement.create({
      data: {
        positionId,
        userId,
        type: data.type,
        amount: data.amount,
        quantity: data.quantity ?? null,
        unitPrice: data.unitPrice ?? null,
        date: new Date(data.date),
        description: data.description ?? null,
      },
      include: { position: { select: { name: true, ticker: true, type: true, accountId: true } } },
    })

    // Auto-update position quantity and avgPrice for CONTRIBUTION and BONUS
    if ((data.type === 'CONTRIBUTION' || data.type === 'BONUS') && data.quantity) {
      const oldQty = position.quantity ? Number(position.quantity) : 0
      const oldAvg = position.avgPrice ? Number(position.avgPrice) : 0
      const newQty = oldQty + data.quantity
      const unitP = data.unitPrice ?? (data.amount > 0 && data.quantity > 0 ? data.amount / data.quantity : 0)
      const newAvg = newQty > 0 ? (oldQty * oldAvg + data.quantity * unitP) / newQty : oldAvg

      await tx.investmentPosition.update({
        where: { id: positionId },
        data: {
          quantity: newQty,
          avgPrice: newAvg > 0 ? newAvg : undefined,
        },
      })
    }

    // Auto-reduce quantity for WITHDRAWAL
    if (data.type === 'WITHDRAWAL' && data.quantity) {
      const oldQty = position.quantity ? Number(position.quantity) : 0
      const newQty = Math.max(0, oldQty - data.quantity)
      await tx.investmentPosition.update({
        where: { id: positionId },
        data: { quantity: newQty },
      })
    }

    // For SPLIT: quantity multiplied by ratio (store in description, quantity = delta shares)
    if (data.type === 'SPLIT' && data.quantity && data.quantity !== 0) {
      const oldQty = position.quantity ? Number(position.quantity) : 0
      const newQty = oldQty + data.quantity
      const newAvg = newQty > 0 && position.avgPrice
        ? (Number(position.avgPrice) * oldQty) / newQty
        : Number(position.avgPrice ?? 0)
      await tx.investmentPosition.update({
        where: { id: positionId },
        data: { quantity: newQty, avgPrice: newAvg },
      })
    }

    return [mv]
  })

  return res.status(201).json(serializeMovement(movement))
}

// DELETE /investment-positions/:positionId/movements/:movementId
export async function deleteMovement(req: AuthRequest, res: Response) {
  const { movementId } = req.params
  const userId = req.userId!

  const movement = await prisma.investmentMovement.findFirst({
    where: { id: movementId, userId },
  })
  if (!movement) return res.status(404).json({ error: 'Movimentação não encontrada' })

  await prisma.investmentMovement.delete({ where: { id: movementId } })
  return res.status(204).send()
}
