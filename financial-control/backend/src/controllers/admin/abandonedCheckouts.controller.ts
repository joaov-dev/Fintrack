import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../services/prisma'
import { getStripeClient, hasStripeConfig } from '../../services/stripe.service'
import { AdminRequest } from '../../middlewares/adminAuth.middleware'

type CouponStatus = 'NONE' | 'PENDING' | 'REDEEMED' | 'EXPIRED'

function deriveCouponStatus(promotions: { expiresAt: Date; redeemedAt: Date | null }[]): CouponStatus {
  if (!promotions.length) return 'NONE'
  const latest = promotions[0]
  if (latest.redeemedAt) return 'REDEEMED'
  if (latest.expiresAt > new Date()) return 'PENDING'
  return 'EXPIRED'
}

const listSchema = z.object({
  days:  z.coerce.number().int().min(1).max(90).default(30),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export async function listAbandonedCheckouts(req: AdminRequest, res: Response) {
  const { days, page, limit } = listSchema.parse(req.query)

  const cutoffStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const cutoffEnd   = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

  const where = {
    completedAt: null,
    createdAt: { gte: cutoffStart, lte: cutoffEnd },
    user: { currentPlan: 'FREE' as const },
  }

  const [total, rawAttempts] = await Promise.all([
    prisma.checkoutAttempt.groupBy({ by: ['userId'], where, _count: true })
      .then((r: unknown[]) => r.length),
    prisma.checkoutAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            promotions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { expiresAt: true, redeemedAt: true, id: true },
            },
          },
        },
      },
    }),
  ])

  const data = rawAttempts.map((a: typeof rawAttempts[0]) => ({
    userId:               a.user.id,
    userName:             a.user.name,
    userEmail:            a.user.email,
    planCode:             a.planCode,
    billingCycle:         a.billingCycle,
    attemptedAt:          a.createdAt,
    couponStatus:         deriveCouponStatus(a.user.promotions),
    promotionId:          a.user.promotions[0]?.id ?? null,
    promotionExpiresAt:   a.user.promotions[0]?.expiresAt ?? null,
  }))

  return res.json({
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  })
}

async function createRecoveryCouponForUser(userId: string, adminId: string) {
  // Guard: only one active promo per user
  const existing = await prisma.userPromotion.findFirst({
    where: { userId, expiresAt: { gt: new Date() }, redeemedAt: null },
  })
  if (existing) return { skipped: true }

  let stripeCouponId = 'promo_no_stripe'

  if (hasStripeConfig()) {
    const stripe = getStripeClient()
    const coupon = await stripe.coupons.create({
      percent_off: 10,
      duration: 'once',
      metadata: { userId, reason: 'abandoned_checkout' },
    })
    stripeCouponId = coupon.id
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.userPromotion.create({
    data: { userId, stripeCouponId, discountPct: 10, expiresAt, sentByAdminId: adminId },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'ADMIN_SEND_RECOVERY_COUPON',
      targetType: 'user',
      targetId: userId,
      details: { stripeCouponId, expiresAt },
    },
  })

  return { skipped: false }
}

export async function sendCouponToUser(req: AdminRequest, res: Response) {
  const { userId } = req.params
  const adminId = req.admin!.id

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, currentPlan: true } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (user.currentPlan !== 'FREE') return res.status(400).json({ error: 'Usuário já possui um plano pago' })

  const hasAttempt = await prisma.checkoutAttempt.findFirst({ where: { userId, completedAt: null } })
  if (!hasAttempt) return res.status(400).json({ error: 'Nenhuma tentativa de checkout encontrada para este usuário' })

  const result = await createRecoveryCouponForUser(userId, adminId)
  if (result.skipped) return res.status(400).json({ error: 'Usuário já possui um cupom ativo' })

  return res.json({ ok: true })
}

export async function sendCouponBulk(req: AdminRequest, res: Response) {
  const adminId = req.admin!.id
  const cutoffEnd = new Date(Date.now() - 60 * 60 * 1000)
  const cutoffStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const attempts = await prisma.checkoutAttempt.findMany({
    where: {
      completedAt: null,
      createdAt: { gte: cutoffStart, lte: cutoffEnd },
      user: { currentPlan: 'FREE' },
    },
    distinct: ['userId'],
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { userId: true },
  })

  const results = await Promise.allSettled(
    attempts.map((a: { userId: string }) => createRecoveryCouponForUser(a.userId, adminId))
  )

  const sent    = results.filter((r): r is PromiseFulfilledResult<{ skipped: boolean }> => r.status === 'fulfilled' && !(r.value as { skipped: boolean }).skipped).length
  const skipped = results.filter((r): r is PromiseFulfilledResult<{ skipped: boolean }> => r.status === 'fulfilled' && !!(r.value as { skipped: boolean }).skipped).length
  const errors  = results.filter((r) => r.status === 'rejected').length

  return res.json({ ok: true, sent, skipped, errors })
}
