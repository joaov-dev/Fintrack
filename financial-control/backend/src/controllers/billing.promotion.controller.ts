import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

function activePromoWhere(userId: string) {
  return {
    userId,
    expiresAt: { gt: new Date() },
    redeemedAt: null,
  } as const
}

export async function getActivePromotion(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const promo = await prisma.userPromotion.findFirst({
    where: activePromoWhere(userId),
    orderBy: { createdAt: 'desc' },
    select: {
      discountPct: true,
      expiresAt: true,
      shownAt: true,
    },
  })
  return res.json(promo ?? null)
}

export async function markPromotionSeen(req: AuthRequest, res: Response) {
  const userId = req.userId!
  await prisma.userPromotion.updateMany({
    where: { ...activePromoWhere(userId), shownAt: null },
    data: { shownAt: new Date() },
  })
  return res.json({ ok: true })
}
