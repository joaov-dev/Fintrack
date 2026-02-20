import { PrismaClient } from '@prisma/client'
import { calcAccountBalance, getNetWorthHistory } from './netWorthService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  message: string
  suggestedAction: string
  dataContext?: Record<string, unknown>
}

export interface InsightsAlerts {
  budgetExceeded: boolean
  overdueLiabilities: number
  negativeBalanceProjection: boolean
}

export interface InsightsResponse {
  insights: Insight[]
  alerts: InsightsAlerts
  /** False when the user has no transaction/account/liability data to evaluate */
  hasEnoughData: boolean
  evaluatedAt: string
}

// ─── Pure helpers (unit-testable) ─────────────────────────────────────────────

/** Group raw transactions by "YYYY-MM" key, excluding the current month. */
export function groupByMonth(
  transactions: { type: string; amount: number; date: Date | string; isRecurring: boolean }[],
  currentMonthKey: string,
): Record<string, { income: number; expense: number; recurringExpense: number }> {
  const result: Record<string, { income: number; expense: number; recurringExpense: number }> = {}

  for (const tx of transactions) {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (key === currentMonthKey) continue

    if (!result[key]) result[key] = { income: 0, expense: 0, recurringExpense: 0 }

    if (tx.type === 'INCOME') {
      result[key].income += Number(tx.amount)
    } else {
      result[key].expense += Number(tx.amount)
      if (tx.isRecurring) result[key].recurringExpense += Number(tx.amount)
    }
  }

  return result
}

// ─── Service function ─────────────────────────────────────────────────────────

export async function generateInsights(
  userId: string,
  prisma: PrismaClient,
): Promise<InsightsResponse> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

  // Start of 4 complete months ago (to capture 4 full prior months)
  const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1)

  const [recentTxs, liquidAccounts, liabilities, budgets, futureRecurring, spendingByCategory, netWorthHistory] =
    await Promise.all([
      // All non-transfer transactions for the last 4 months (insights 1, 2, 4, 5)
      prisma.transaction.findMany({
        where: { userId, date: { gte: fourMonthsAgo }, transferId: null },
        select: { type: true, amount: true, date: true, isRecurring: true },
      }),
      // Liquid accounts for emergency reserve (insight 4) and projection (alert 3)
      prisma.account.findMany({
        where: { userId, type: { in: ['CHECKING', 'SAVINGS', 'CASH'] } },
        include: { transactions: { select: { type: true, amount: true } } },
      }),
      // Liabilities for credit dependency (insight 5) and overdue (alert 2)
      prisma.liability.findMany({
        where: { userId },
        select: { currentBalance: true, dueDate: true },
      }),
      // Current-month budgets for budget-exceeded alert (alert 1)
      prisma.budget.findMany({
        where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
        select: { categoryId: true, amount: true },
      }),
      // Future recurring transactions this month — for negative balance projection (alert 3)
      prisma.transaction.findMany({
        where: {
          userId,
          isRecurring: true,
          transferId: null,
          date: { gt: today, lte: endOfCurrentMonth },
        },
        select: { type: true, amount: true },
      }),
      // Current-month spending grouped by category — for budget-exceeded alert (alert 1)
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          transferId: null,
          date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
        },
        _sum: { amount: true },
      }),
      // Net worth history — 7 points → gives "6 months ago" baseline (insight 3)
      getNetWorthHistory(userId, prisma, 7),
    ])

  // ── Shared pre-computation ─────────────────────────────────────────────────

  const byMonth = groupByMonth(recentTxs, currentMonthKey)
  const sortedMonths = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  const last4Months = sortedMonths.slice(-4)
  const last3Months = last4Months.slice(-3)

  const last3Count = Math.max(last3Months.length, 1)
  const avg3mIncome   = last3Months.reduce((s, [, m]) => s + m.income, 0) / last3Count
  const avg3mExpense  = last3Months.reduce((s, [, m]) => s + m.expense, 0) / last3Count
  const avg3mRecurring = last3Months.reduce((s, [, m]) => s + m.recurringExpense, 0) / last3Count

  const liquidBalance = liquidAccounts.reduce((sum, acc) => {
    const bal = calcAccountBalance(
      Number(acc.initialBalance),
      acc.transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    )
    return sum + Math.max(0, bal)
  }, 0)

  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.currentBalance), 0)

  const insights: Insight[] = []

  // ── Insight 1 — Negative cashflow ─────────────────────────────────────────
  if (last4Months.length >= 3) {
    const negativeCount = last4Months.filter(([, m]) => m.income - m.expense < 0).length

    if (negativeCount >= 3) {
      const total = last4Months.length
      insights.push({
        id: 'negative-cashflow',
        severity: negativeCount === total ? 'CRITICAL' : 'WARNING',
        title: 'Gastos acima da renda',
        message: `Você gastou mais do que ganhou em ${negativeCount} dos últimos ${total} meses.`,
        suggestedAction: 'Revise seus gastos fixos ou reduza despesas variáveis para evitar endividamento.',
        dataContext: { negativeMonths: negativeCount, totalMonths: total },
      })
    }
  }

  // ── Insight 2 — High fixed costs ──────────────────────────────────────────
  if (avg3mIncome > 0) {
    const commitmentRatio = avg3mRecurring / avg3mIncome

    if (commitmentRatio >= 0.60) {
      insights.push({
        id: 'high-fixed-costs',
        severity: commitmentRatio >= 0.80 ? 'CRITICAL' : 'WARNING',
        title: 'Renda excessivamente comprometida',
        message: `Seus gastos fixos consomem ${(commitmentRatio * 100).toFixed(0)}% da sua renda mensal.`,
        suggestedAction: 'Avalie contratos, assinaturas ou despesas recorrentes que podem ser reduzidas.',
        dataContext: { commitmentRatio: Math.round(commitmentRatio * 1000) / 1000 },
      })
    }
  }

  // ── Insight 3 — Stagnant net worth ────────────────────────────────────────
  if (netWorthHistory.length >= 7) {
    const current       = netWorthHistory[6].netWorth
    const sixMonthsAgo  = netWorthHistory[0].netWorth

    if (Math.abs(sixMonthsAgo) > 0) {
      const variation = (current - sixMonthsAgo) / Math.abs(sixMonthsAgo)

      if (Math.abs(variation) <= 0.01) {
        insights.push({
          id: 'stagnant-net-worth',
          severity: 'WARNING',
          title: 'Patrimônio estagnado',
          message: 'Seu patrimônio praticamente não mudou nos últimos 6 meses.',
          suggestedAction:
            'Aumentar sua taxa de poupança ou revisar investimentos pode ajudar a retomar o crescimento.',
          dataContext: { variationPercent: Math.round(variation * 10000) / 100 },
        })
      }
    }
  }

  // ── Insight 4 — Low emergency reserve ────────────────────────────────────
  const emergencyMonths = avg3mExpense > 0 ? liquidBalance / avg3mExpense : liquidBalance > 0 ? 12 : 0

  if (emergencyMonths < 3) {
    insights.push({
      id: 'low-emergency-reserve',
      severity: emergencyMonths < 1 ? 'CRITICAL' : 'WARNING',
      title: 'Reserva de emergência baixa',
      message: `Sua reserva cobre apenas ${emergencyMonths.toFixed(1)} ${emergencyMonths === 1 ? 'mês' : 'meses'} de despesas.`,
      suggestedAction: 'Priorize a construção de uma reserva antes de novos investimentos.',
      dataContext: { emergencyMonths: Math.round(emergencyMonths * 100) / 100, liquidBalance },
    })
  }

  // ── Insight 5 — High credit dependency ───────────────────────────────────
  if (avg3mIncome > 0 || totalLiabilities > 0) {
    const creditRatio =
      avg3mIncome > 0 ? totalLiabilities / (avg3mIncome * 6) : totalLiabilities > 0 ? 2 : 0

    if (creditRatio >= 0.75) {
      insights.push({
        id: 'high-credit-dependency',
        severity: creditRatio > 1 ? 'CRITICAL' : 'WARNING',
        title: 'Dependência elevada de crédito',
        message:
          creditRatio > 1
            ? 'Suas dívidas equivalem a mais de 6 meses da sua renda.'
            : `Suas dívidas equivalem a ${(creditRatio * 6).toFixed(1)} meses da sua renda.`,
        suggestedAction: 'Considere reduzir o uso de crédito ou renegociar passivos.',
        dataContext: { creditRatio: Math.round(creditRatio * 1000) / 1000, totalLiabilities },
      })
    }
  }

  // ── Sort by severity and cap at 5 ─────────────────────────────────────────
  const SEVERITY_ORDER: Record<InsightSeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }
  const sortedInsights = insights
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 5)

  // ── Alert 1 — Budget exceeded ─────────────────────────────────────────────
  const spendingMap = new Map(
    spendingByCategory.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]),
  )
  const budgetExceeded = budgets.some((b) => (spendingMap.get(b.categoryId) ?? 0) > Number(b.amount))

  // ── Alert 2 — Overdue liabilities ─────────────────────────────────────────
  const overdueLiabilities = liabilities.filter(
    (l) => l.dueDate && new Date(l.dueDate) < today && Number(l.currentBalance) > 0,
  ).length

  // ── Alert 3 — Negative balance projection ─────────────────────────────────
  const futureIncome  = futureRecurring.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const futureExpense = futureRecurring.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const negativeBalanceProjection = liquidBalance + futureIncome - futureExpense < 0

  // True only when the user has meaningful financial activity to analyse
  const hasEnoughData =
    avg3mIncome > 0 || avg3mExpense > 0 || liquidBalance > 0 || totalLiabilities > 0

  return {
    insights: sortedInsights,
    alerts: { budgetExceeded, overdueLiabilities, negativeBalanceProjection },
    hasEnoughData,
    evaluatedAt: now.toISOString(),
  }
}
