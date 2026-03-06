import { Response } from 'express'
import { prisma } from '../../services/prisma'
import { AdminRequest } from '../../middlewares/adminAuth.middleware'

function parseDateParam(value: string | undefined, defaultDate: Date): Date {
  if (!value) return defaultDate
  const d = new Date(value)
  return isNaN(d.getTime()) ? defaultDate : d
}

/** Build an array of { date, count } for a date range, grouped by day. */
async function dailyCountQuery(
  model: 'user' | 'subscriptionEvent',
  from: Date,
  to: Date,
  where: object = {},
): Promise<{ date: string; count: number }[]> {
  // Use Prisma raw SQL for grouping by date
  let rows: { day: Date; count: bigint }[]

  if (model === 'user') {
    rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM users
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY day
      ORDER BY day
    `
  } else {
    rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM subscription_events
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY day
      ORDER BY day
    `
  }

  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    count: Number(r.count),
  }))
}

export async function adminStats(req: AdminRequest, res: Response) {
  const to = parseDateParam(req.query.to as string | undefined, new Date())
  const defaultFrom = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  const from = parseDateParam(req.query.from as string | undefined, defaultFrom)

  const [
    totalUsers,
    activeUsers,
    mauUsers,
    proSubscribers,
    businessSubscribers,
    planDistribution,
    newUsers,
    recentSignups,
    recentSubEvents,
  ] = await Promise.all([
    // Total registered users
    prisma.user.count(),

    // Users not suspended
    prisma.user.count({ where: { status: 'ACTIVE' } }),

    // MAU: users logged in during last 30 days
    prisma.user.count({
      where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),

    // PRO subscribers with active/trialing subscription
    prisma.user.count({
      where: {
        currentPlan: 'PRO',
        subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] },
      },
    }),

    // BUSINESS subscribers with active/trialing subscription
    prisma.user.count({
      where: {
        currentPlan: 'BUSINESS',
        subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] },
      },
    }),

    // Plan distribution
    prisma.user.groupBy({
      by: ['currentPlan'],
      _count: { id: true },
    }),

    // New users timeseries
    dailyCountQuery('user', from, to),

    // Recent signups
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, currentPlan: true, createdAt: true },
    }),

    // Recent subscription events
    prisma.subscriptionEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { id: true, email: true } } },
    }),
  ])

  // MRR: sum of active subscriptions' monthly price
  const mrrResult = await prisma.$queryRaw<{ mrr: bigint }[]>`
    SELECT COALESCE(SUM(
      CASE p."billingCycle"
        WHEN 'MONTHLY' THEN p."amountCents"
        WHEN 'YEARLY'  THEN p."amountCents" / 12
        ELSE 0
      END
    ), 0)::bigint AS mrr
    FROM subscriptions s
    JOIN prices p ON s."priceId" = p.id
    WHERE s.status IN ('ACTIVE', 'TRIALING')
  `
  const mrrCents = Number(mrrResult[0]?.mrr ?? 0)

  // Churn: canceled subscriptions in the period
  const churnThisPeriod = await prisma.subscriptionEvent.count({
    where: {
      eventType: { in: ['customer.subscription.deleted', 'subscription.canceled'] },
      createdAt: { gte: from, lte: to },
    },
  })

  // New subscribers in period (for conversion rate)
  const newSubscribersInPeriod = await prisma.user.count({
    where: {
      currentPlan: { in: ['PRO', 'BUSINESS'] },
      createdAt: { gte: from, lte: to },
    },
  })
  const newUsersInPeriod = await prisma.user.count({
    where: { createdAt: { gte: from, lte: to } },
  })

  const conversionFreeToPaid =
    newUsersInPeriod > 0 ? (newSubscribersInPeriod / newUsersInPeriod) * 100 : 0

  return res.json({
    totals: {
      users: totalUsers,
      activeUsers,
      mauUsers,
      proSubscribers,
      businessSubscribers,
      mrrCents,
      conversionFreeToPaid: Math.round(conversionFreeToPaid * 100) / 100,
      churnThisPeriod,
    },
    timeseries: {
      newUsers,
    },
    planDistribution: planDistribution.map((g) => ({
      plan: g.currentPlan,
      count: g._count.id,
    })),
    recentSignups,
    recentSubEvents: recentSubEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      userId: e.userId,
      userEmail: e.user?.email ?? null,
      createdAt: e.createdAt,
    })),
    period: { from: from.toISOString(), to: to.toISOString() },
  })
}
