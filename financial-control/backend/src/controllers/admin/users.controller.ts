import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../services/prisma'
import { AdminRequest } from '../../middlewares/adminAuth.middleware'

async function logAdminAction(
  adminId: string,
  action: string,
  req: AdminRequest,
  opts: { targetType?: string; targetId?: string; details?: object } = {},
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      details: (opts.details ?? undefined) as any,
      ip: req.ip ?? null,
    },
  })
}

const listSchema = z.object({
  q:       z.string().optional(),
  plan:    z.enum(['FREE', 'PRO', 'BUSINESS']).optional(),
  status:  z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(25),
  sortBy:  z.enum(['createdAt', 'lastLoginAt', 'name', 'email']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export async function listUsers(req: AdminRequest, res: Response) {
  const { q, plan, status, page, limit, sortBy, sortDir } = listSchema.parse(req.query)

  const where: any = {}
  if (plan)   where.currentPlan = plan
  if (status) where.status = status
  if (q) {
    where.OR = [
      { name:  { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { id:    { equals: q } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        currentPlan: true,
        subscriptionStatus: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return res.json({
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function getUserDetail(req: AdminRequest, res: Response) {
  const { id } = req.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      currentPlan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      status: true,
      mfaEnabled: true,
      createdAt: true,
      lastLoginAt: true,
      currency: true,
      locale: true,
      timezone: true,
    },
  })

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const [subscription, usageCounts, auditLogs] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { code: true, name: true } },
        price: { select: { amountCents: true, billingCycle: true, currency: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),

    Promise.all([
      prisma.transaction.count({ where: { userId: id } }),
      prisma.account.count({ where: { userId: id } }),
      prisma.category.count({ where: { userId: id } }),
      prisma.budget.count({ where: { userId: id } }),
      prisma.goal.count({ where: { userId: id } }),
    ]).then(([transactions, accounts, categories, budgets, goals]) => ({
      transactions, accounts, categories, budgets, goals,
    })),

    prisma.adminAuditLog.findMany({
      where: { targetType: 'user', targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { admin: { select: { username: true } } },
    }),
  ])

  return res.json({ profile: user, subscription, usage: usageCounts, auditLog: auditLogs })
}

export async function suspendUser(req: AdminRequest, res: Response) {
  const { id } = req.params

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (user.status === 'SUSPENDED') return res.status(400).json({ error: 'Usuário já suspenso' })

  await prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } })

  // Also revoke all active sessions
  await prisma.session.deleteMany({ where: { userId: id } })

  await logAdminAction(req.admin!.id, 'ADMIN_USER_SUSPEND', req, { targetType: 'user', targetId: id })

  return res.json({ ok: true })
}

export async function reactivateUser(req: AdminRequest, res: Response) {
  const { id } = req.params

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (user.status === 'ACTIVE') return res.status(400).json({ error: 'Usuário já ativo' })

  await prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } })

  await logAdminAction(req.admin!.id, 'ADMIN_USER_REACTIVATE', req, { targetType: 'user', targetId: id })

  return res.json({ ok: true })
}

export async function forceLogoutUser(req: AdminRequest, res: Response) {
  const { id } = req.params

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { count } = await prisma.session.deleteMany({ where: { userId: id } })

  await logAdminAction(req.admin!.id, 'ADMIN_USER_FORCE_LOGOUT', req, {
    targetType: 'user',
    targetId: id,
    details: { sessionsRevoked: count },
  })

  return res.json({ ok: true, sessionsRevoked: count })
}

export async function exportUser(req: AdminRequest, res: Response) {
  const { id } = req.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, createdAt: true,
      currentPlan: true, subscriptionStatus: true, status: true, lastLoginAt: true,
    },
  })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const [transactions, accounts, categories, budgets, goals] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: id }, orderBy: { date: 'desc' } }),
    prisma.account.findMany({ where: { userId: id } }),
    prisma.category.findMany({ where: { userId: id } }),
    prisma.budget.findMany({ where: { userId: id } }),
    prisma.goal.findMany({ where: { userId: id } }),
  ])

  await logAdminAction(req.admin!.id, 'ADMIN_USER_EXPORT', req, { targetType: 'user', targetId: id })

  return res.json({ user, transactions, accounts, categories, budgets, goals, exportedAt: new Date() })
}
