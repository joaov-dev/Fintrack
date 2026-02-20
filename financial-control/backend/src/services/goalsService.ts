import { PrismaClient } from '@prisma/client'
import { calcAccountBalance } from './netWorthService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalStatus = 'ON_TRACK' | 'BEHIND' | 'VERY_BEHIND' | 'COMPLETED'

export interface GoalProgress {
  id: string
  userId: string
  name: string
  targetAmount: number
  targetDate: string | null
  linkedAccountId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  // computed
  currentAmount: number
  progress: number
  monthlyContribution: number
  estimatedCompletion: string | null
  status: GoalStatus
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Add N months to a date, returning "YYYY-MM" string. */
export function addMonthsToDate(base: Date, months: number): string {
  const d = new Date(base)
  d.setMonth(d.getMonth() + Math.ceil(months))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function computeGoalStatus(
  progress: number,
  estimatedCompletion: string | null,
  targetDate: string | null,
  monthlyContribution: number,
): GoalStatus {
  if (progress >= 1) return 'COMPLETED'
  if (monthlyContribution <= 0) return 'VERY_BEHIND'
  if (!estimatedCompletion) return 'VERY_BEHIND'
  if (!targetDate) return 'ON_TRACK'
  return estimatedCompletion <= targetDate.slice(0, 7) ? 'ON_TRACK' : 'BEHIND'
}

// ─── Service ──────────────────────────────────────────────────────────────────

async function computeProgress(
  goal: { id: string; targetAmount: string | number; linkedAccountId: string | null; targetDate: Date | null },
  prisma: PrismaClient,
): Promise<{ currentAmount: number; progress: number; monthlyContribution: number; estimatedCompletion: string | null; status: GoalStatus }> {
  const targetAmount = Number(goal.targetAmount)

  if (!goal.linkedAccountId) {
    return { currentAmount: 0, progress: 0, monthlyContribution: 0, estimatedCompletion: null, status: 'VERY_BEHIND' }
  }

  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  const [account, recentIncome] = await Promise.all([
    prisma.account.findUnique({
      where: { id: goal.linkedAccountId },
      include: { transactions: { select: { type: true, amount: true } } },
    }),
    // Monthly INCOME to this account over last 3 months (including transfers)
    prisma.transaction.findMany({
      where: {
        accountId: goal.linkedAccountId,
        type: 'INCOME',
        date: { gte: threeMonthsAgo },
      },
      select: { amount: true, date: true },
    }),
  ])

  if (!account) {
    return { currentAmount: 0, progress: 0, monthlyContribution: 0, estimatedCompletion: null, status: 'VERY_BEHIND' }
  }

  // Current balance of the linked account
  const currentAmount = Math.max(
    0,
    calcAccountBalance(
      Number(account.initialBalance),
      account.transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    ),
  )

  const progress = Math.min(1, targetAmount > 0 ? currentAmount / targetAmount : 0)

  // Monthly contribution = average INCOME per complete month over last 3 months
  const byMonth: Record<string, number> = {}
  for (const tx of recentIncome) {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth[key] = (byMonth[key] ?? 0) + Number(tx.amount)
  }

  // Exclude current month from the average (incomplete)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const completedMonths = Object.entries(byMonth)
    .filter(([key]) => key < currentMonthKey)
    .map(([, sum]) => sum)

  const monthlyContribution =
    completedMonths.length > 0
      ? completedMonths.reduce((s, v) => s + v, 0) / completedMonths.length
      : 0

  // Estimated completion
  let estimatedCompletion: string | null = null
  if (progress >= 1) {
    estimatedCompletion = null
  } else if (monthlyContribution > 0) {
    const monthsNeeded = (targetAmount - currentAmount) / monthlyContribution
    estimatedCompletion = addMonthsToDate(now, monthsNeeded)
  }

  const status = computeGoalStatus(
    progress,
    estimatedCompletion,
    goal.targetDate ? goal.targetDate.toISOString() : null,
    monthlyContribution,
  )

  return { currentAmount, progress, monthlyContribution, estimatedCompletion, status }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listGoals(userId: string, prisma: PrismaClient): Promise<GoalProgress[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  return Promise.all(
    goals.map(async (g) => {
      const computed = await computeProgress(g, prisma)
      return {
        id: g.id,
        userId: g.userId,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
        linkedAccountId: g.linkedAccountId,
        notes: g.notes,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
        ...computed,
      }
    }),
  )
}

export async function createGoal(
  userId: string,
  data: { name: string; targetAmount: number; targetDate?: string | null; linkedAccountId?: string | null; notes?: string | null },
  prisma: PrismaClient,
) {
  return prisma.goal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      linkedAccountId: data.linkedAccountId ?? null,
      notes: data.notes ?? null,
    },
  })
}

export async function updateGoal(
  userId: string,
  id: string,
  data: { name?: string; targetAmount?: number; targetDate?: string | null; linkedAccountId?: string | null; notes?: string | null },
  prisma: PrismaClient,
) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } })
  if (!goal) throw new Error('Goal not found')

  return prisma.goal.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
      ...(data.linkedAccountId !== undefined && { linkedAccountId: data.linkedAccountId }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })
}

export async function deleteGoal(userId: string, id: string, prisma: PrismaClient) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } })
  if (!goal) throw new Error('Goal not found')
  await prisma.goal.delete({ where: { id } })
}
