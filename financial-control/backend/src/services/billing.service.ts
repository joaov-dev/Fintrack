import {
  FeatureKey,
  PlanCode,
  SubscriptionStatus,
  PrismaClient,
} from '@prisma/client'
import { prisma } from './prisma'

export type FeatureAccess = {
  enabled: boolean
  limitPerMonth: number | null
  usageThisMonth: number | null
}

export type Entitlements = {
  plan: PlanCode
  subscriptionStatus: SubscriptionStatus | null
  trialEndsAt: string | null
  subscriptionEndsAt: string | null
  graceUntil: string | null
  features: Record<FeatureKey, FeatureAccess>
}

const PLAN_FEATURES: Record<PlanCode, Partial<Record<FeatureKey, { enabled: boolean; limitPerMonth?: number | null }>>> = {
  FREE: {
    BASIC_DASHBOARD: { enabled: true },
    ACCOUNTS_LIMIT: { enabled: true, limitPerMonth: 2 },
    CREDIT_CARDS_LIMIT: { enabled: true, limitPerMonth: 2 },
    TRANSACTIONS_MONTHLY_LIMIT: { enabled: true, limitPerMonth: 200 },
  },
  PRO: {
    BASIC_DASHBOARD: { enabled: true },
    RECURRING_TRANSACTIONS: { enabled: true },
    GOALS: { enabled: true },
    LIABILITIES: { enabled: true },
    CREDIT_CARDS: { enabled: true },
    CSV_IMPORT: { enabled: true },
    RULES_AUTOCATEGORIZATION: { enabled: true },
    INSIGHTS: { enabled: true },
    FINANCIAL_HEALTH: { enabled: true },
    FORECAST: { enabled: true },
    ACCOUNTS_LIMIT: { enabled: true, limitPerMonth: 10 },
    CREDIT_CARDS_LIMIT: { enabled: true, limitPerMonth: 10 },
    TRANSACTIONS_MONTHLY_LIMIT: { enabled: true, limitPerMonth: 5000 },
  },
  BUSINESS: {
    BASIC_DASHBOARD: { enabled: true },
    RECURRING_TRANSACTIONS: { enabled: true },
    GOALS: { enabled: true },
    LIABILITIES: { enabled: true },
    CREDIT_CARDS: { enabled: true },
    CSV_IMPORT: { enabled: true },
    RULES_AUTOCATEGORIZATION: { enabled: true },
    INSIGHTS: { enabled: true },
    FINANCIAL_HEALTH: { enabled: true },
    FORECAST: { enabled: true },
    REPORTS_ADVANCED: { enabled: true },
    INVESTMENTS_ADVANCED: { enabled: true },
    INVESTMENT_ALLOCATION: { enabled: true },
    EXPORT_DATA: { enabled: true },
    ACCOUNTS_LIMIT: { enabled: true, limitPerMonth: null },
    CREDIT_CARDS_LIMIT: { enabled: true, limitPerMonth: null },
    TRANSACTIONS_MONTHLY_LIMIT: { enabled: true, limitPerMonth: null },
  },
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE']

function allFeatureKeys(): FeatureKey[] {
  return [
    'BASIC_DASHBOARD',
    'RECURRING_TRANSACTIONS',
    'GOALS',
    'LIABILITIES',
    'CREDIT_CARDS',
    'CSV_IMPORT',
    'RULES_AUTOCATEGORIZATION',
    'INSIGHTS',
    'FINANCIAL_HEALTH',
    'FORECAST',
    'REPORTS_ADVANCED',
    'INVESTMENTS_ADVANCED',
    'INVESTMENT_ALLOCATION',
    'EXPORT_DATA',
    'ACCOUNTS_LIMIT',
    'CREDIT_CARDS_LIMIT',
    'TRANSACTIONS_MONTHLY_LIMIT',
  ]
}

async function getCurrentUsageCount(userId: string, featureKey: FeatureKey, db: PrismaClient): Promise<number | null> {
  if (featureKey === 'ACCOUNTS_LIMIT') {
    return db.account.count({ where: { userId } })
  }
  if (featureKey === 'CREDIT_CARDS_LIMIT') {
    return db.creditCard.count({ where: { userId, isArchived: false } })
  }
  if (featureKey === 'TRANSACTIONS_MONTHLY_LIMIT') {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return db.transaction.count({ where: { userId, date: { gte: start, lte: end } } })
  }
  return null
}

function resolvePlanFromSubscription(
  currentPlan: PlanCode,
  subscriptionStatus: SubscriptionStatus | null,
  subscriptionEndsAt: Date | null,
  graceUntil: Date | null,
): PlanCode {
  if (!subscriptionStatus) return currentPlan

  if (subscriptionStatus === 'PAST_DUE') {
    const now = Date.now()
    if ((graceUntil && graceUntil.getTime() > now) || (subscriptionEndsAt && subscriptionEndsAt.getTime() > now)) {
      return currentPlan
    }
    return 'FREE'
  }

  if (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'UNPAID' || subscriptionStatus === 'INCOMPLETE_EXPIRED') {
    return 'FREE'
  }

  return currentPlan
}

export async function resolveEntitlements(userId: string, db: PrismaClient = prisma): Promise<Entitlements> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      graceUntil: true,
      subscriptions: {
        where: { status: { in: ACTIVE_STATUSES } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: {
          plan: { include: { featureGates: true } },
        },
      },
    },
  })

  if (!user) throw new Error('User not found')

  const activeSub = user.subscriptions[0] ?? null
  const dbPlan = activeSub?.plan?.code ?? user.currentPlan
  const effectivePlan = resolvePlanFromSubscription(
    dbPlan,
    user.subscriptionStatus,
    user.subscriptionEndsAt,
    user.graceUntil,
  )

  const features: Record<FeatureKey, FeatureAccess> = {} as Record<FeatureKey, FeatureAccess>
  const defaults = PLAN_FEATURES[effectivePlan]

  for (const key of allFeatureKeys()) {
    const defaultGate = defaults[key] ?? { enabled: false, limitPerMonth: null }
    const gateFromDb = activeSub?.plan?.featureGates.find((g) => g.featureKey === key)
    const enabled = gateFromDb?.enabled ?? defaultGate.enabled
    const limitPerMonth = gateFromDb?.limitPerMonth ?? defaultGate.limitPerMonth ?? null
    const usageThisMonth = enabled ? await getCurrentUsageCount(userId, key, db) : null

    features[key] = { enabled, limitPerMonth, usageThisMonth }
  }

  return {
    plan: effectivePlan,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() ?? null,
    graceUntil: user.graceUntil?.toISOString() ?? null,
    features,
  }
}

export async function checkFeatureAccess(userId: string, featureKey: FeatureKey, db: PrismaClient = prisma): Promise<boolean> {
  const ent = await resolveEntitlements(userId, db)
  return ent.features[featureKey]?.enabled === true
}

export async function checkUsageLimit(userId: string, featureKey: FeatureKey, increment = 0, db: PrismaClient = prisma): Promise<boolean> {
  const ent = await resolveEntitlements(userId, db)
  const gate = ent.features[featureKey]
  if (!gate?.enabled) return false
  if (gate.limitPerMonth == null) return true
  const current = gate.usageThisMonth ?? 0
  return current + increment <= gate.limitPerMonth
}

export function getPlanDisplayName(plan: PlanCode): string {
  if (plan === 'PRO') return 'Pro'
  if (plan === 'BUSINESS') return 'Business'
  return 'Free'
}
