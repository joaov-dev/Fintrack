import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

const targetsSchema = z.array(
  z.object({
    type: z.enum(['STOCK', 'FUND', 'FIXED_INCOME', 'REAL_ESTATE', 'CRYPTO', 'OTHER']),
    targetPct: z.number().min(0).max(100),
  }),
)

export async function getAllocationTargets(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const targets = await prisma.investmentAllocationTarget.findMany({ where: { userId } })
  return res.json(targets.map((t) => ({ ...t, targetPct: Number(t.targetPct) })))
}

export async function saveAllocationTargets(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const targets = targetsSchema.parse(req.body)

  const results = await prisma.$transaction(
    targets.map((t) =>
      prisma.investmentAllocationTarget.upsert({
        where: { userId_type: { userId, type: t.type } },
        create: { userId, type: t.type, targetPct: t.targetPct },
        update: { targetPct: t.targetPct },
      }),
    ),
  )

  return res.json(results.map((r) => ({ ...r, targetPct: Number(r.targetPct) })))
}
