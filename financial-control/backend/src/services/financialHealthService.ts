import { PrismaClient } from '@prisma/client'
import { calcAccountBalance } from './netWorthService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PillarTrend = 'up' | 'down' | 'stable' | 'unknown'

export interface PillarResult {
  /** The raw computed ratio/value (e.g. 0.12 for 12%, or 4.2 for 4.2 months) */
  value: number
  /** Discrete score: 0, 25, 50, 75, or 100 */
  score: number
  /** Trend vs. the previous 3-month period: 'up' always means the metric improved */
  trend: PillarTrend
  /** Previous period value, null when no prior data is available */
  previousValue: number | null
}

export interface FinancialHealthData {
  /** Weighted average of all pillar scores — 0 to 100 */
  score: number
  /** Crítica | Atenção | Saudável | Excelente */
  classification: string
  /** False when there is no transaction/account/liability data to evaluate */
  hasEnoughData: boolean
  pillars: {
    savingsRate: PillarResult
    incomeCommitment: PillarResult
    creditDependency: PillarResult
    emergencyReserve: PillarResult
  }
}

// ─── Pure scoring functions (unit-testable without Prisma) ────────────────────

/**
 * Pillar 1 — Taxa de Poupança (30%)
 * rate = (income − expense) / income  over the last 3 complete months
 */
export function scoreSavingsRate(rate: number): number {
  if (rate < 0)    return 0
  if (rate < 0.05) return 25
  if (rate < 0.10) return 50
  if (rate < 0.20) return 75
  return 100
}

/**
 * Pillar 2 — Comprometimento da Renda (30%)
 * ratio = recurring_expenses / income  over the last 3 complete months
 * Realistic bands: rent alone is typically 25–35% of income, so ≤ 50% is "good".
 */
export function scoreIncomeCommitment(ratio: number): number {
  if (ratio > 0.85) return 0   // > 85% in fixed costs → critical
  if (ratio > 0.70) return 25  // > 70% → high
  if (ratio > 0.50) return 50  // > 50% → moderate
  if (ratio > 0.30) return 75  // > 30% → good
  return 100                   // ≤ 30% → excellent
}

/**
 * Pillar 3 — Dependência de Crédito (20%)
 * ratio = total_liabilities / (monthly_income × 6)
 * Bands (months of income in debt): <3 → 100, <6 → 75, <12 → 50, <18 → 25, ≥18 → 0
 */
export function scoreCreditDependency(ratio: number): number {
  if (ratio > 3.00) return 0   // debt > 18 months of income
  if (ratio > 2.00) return 25  // debt > 12 months of income
  if (ratio > 1.00) return 50  // debt > 6 months of income
  if (ratio > 0.50) return 75  // debt > 3 months of income
  return 100
}

/**
 * Pillar 4 — Reserva de Emergência (20%)
 * months = liquid_balance / avg_monthly_expense
 * Liquid accounts = CHECKING, SAVINGS, CASH
 */
export function scoreEmergencyReserve(months: number): number {
  if (months < 1) return 0
  if (months < 3) return 25
  if (months < 6) return 75
  return 100
}

/**
 * Weighted average → final health score 0–100
 */
export function calcHealthScore(pillars: {
  savingsRate: number
  incomeCommitment: number
  creditDependency: number
  emergencyReserve: number
}): number {
  return Math.round(
    pillars.savingsRate      * 0.30 +
    pillars.incomeCommitment * 0.30 +
    pillars.creditDependency * 0.20 +
    pillars.emergencyReserve * 0.20,
  )
}

/** Map final score to human-readable classification */
export function classifyScore(score: number): string {
  if (score < 40) return 'Crítica'
  if (score < 60) return 'Atenção'
  if (score < 80) return 'Saudável'
  return 'Excelente'
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function calcMetrics(txs: { type: string; amount: number; isRecurring: boolean }[]) {
  const income    = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense   = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const recurring = txs.filter(t => t.type === 'EXPENSE' && t.isRecurring).reduce((s, t) => s + t.amount, 0)
  return { income, expense, recurring }
}

function trend(
  current: number,
  previous: number | null,
  /** true when a lower value is the improvement (e.g. income commitment, credit dependency) */
  lowerIsBetter: boolean,
  threshold: number,
): PillarTrend {
  if (previous === null) return 'unknown'
  const delta = current - previous
  if (Math.abs(delta) < threshold) return 'stable'
  const improved = lowerIsBetter ? delta < 0 : delta > 0
  return improved ? 'up' : 'down'
}

// ─── Service function (Prisma-dependent) ─────────────────────────────────────

export async function getFinancialHealth(
  userId: string,
  prisma: PrismaClient,
): Promise<FinancialHealthData> {
  const now = new Date()
  // Use only complete calendar months to avoid partial-month distortion.
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const threeMonthsAgo      = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const sixMonthsAgo        = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  const [allTransactions, liquidAccounts, liabilities, ccStatements] = await Promise.all([
    // Fetch 6 months of complete data for trend comparison
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: sixMonthsAgo, lt: startOfCurrentMonth },
        transferId: null,
        isCardPayment: { not: true },
      },
      select: { type: true, amount: true, isRecurring: true, date: true },
    }),
    // Liquid accounts for pillar 4 — balance includes ALL transactions (transfers too)
    prisma.account.findMany({
      where: { userId, type: { in: ['CHECKING', 'SAVINGS', 'CASH'] } },
      include: {
        transactions: { select: { type: true, amount: true } },
      },
    }),
    // Liabilities for pillar 3
    prisma.liability.findMany({
      where: { userId },
      select: { currentBalance: true },
    }),
    // CC open balances for pillar 3 (short-term liabilities)
    prisma.cardStatement.findMany({
      where: { userId, status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
      select: { totalSpent: true, totalPaid: true },
    }),
  ])

  // ── Split into current (last 3 complete months) and previous (months 4-6) ──
  const currentTxs  = allTransactions
    .filter(t => new Date(t.date) >= threeMonthsAgo)
    .map(t => ({ ...t, amount: Number(t.amount) }))

  const previousTxs = allTransactions
    .filter(t => new Date(t.date) < threeMonthsAgo)
    .map(t => ({ ...t, amount: Number(t.amount) }))

  const cur  = calcMetrics(currentTxs)
  const prev = calcMetrics(previousTxs)
  const hasPrevData = prev.income > 0 || prev.expense > 0

  // ── Pillar 1: Taxa de Poupança ─────────────────────────────────────────────
  const savingsRateValue = cur.income > 0 ? (cur.income - cur.expense) / cur.income : 0
  const prevSavingsRate  = prev.income > 0 ? (prev.income - prev.expense) / prev.income : null

  const savingsRateScore = scoreSavingsRate(savingsRateValue)
  const savingsTrend     = trend(savingsRateValue, hasPrevData ? prevSavingsRate : null, false, 0.02)

  // ── Pillar 2: Comprometimento da Renda ────────────────────────────────────
  const incomeCommitmentValue =
    cur.income > 0 ? cur.recurring / cur.income : cur.recurring > 0 ? 1 : 0
  const prevCommitment =
    prev.income > 0 ? prev.recurring / prev.income : null

  const incomeCommitmentScore = scoreIncomeCommitment(incomeCommitmentValue)
  const commitmentTrend       = trend(incomeCommitmentValue, hasPrevData ? prevCommitment : null, true, 0.02)

  // ── Pillar 3: Dependência de Crédito ──────────────────────────────────────
  const totalCCOpenBalance = ccStatements.reduce(
    (s, stmt) => s + Math.max(0, Number(stmt.totalSpent) - Number(stmt.totalPaid)),
    0,
  )
  const totalLiabilities =
    liabilities.reduce((s, l) => s + Number(l.currentBalance), 0) + totalCCOpenBalance

  const monthlyIncome     = cur.income / 3
  const prevMonthlyIncome = prev.income / 3

  // Without income data we can't assess credit dependency
  const creditDependencyValue     = monthlyIncome > 0     ? totalLiabilities / (monthlyIncome * 6)     : 0
  const prevCreditDependencyValue = prevMonthlyIncome > 0 ? totalLiabilities / (prevMonthlyIncome * 6) : null

  const creditDependencyScore = scoreCreditDependency(creditDependencyValue)
  // Lower ratio = better, so lowerIsBetter = true; threshold = 0.05 (5% change)
  const creditTrend = trend(creditDependencyValue, hasPrevData ? prevCreditDependencyValue : null, true, 0.05)

  // ── Pillar 4: Reserva de Emergência ───────────────────────────────────────
  const liquidBalance = liquidAccounts.reduce((sum, acc) => {
    const bal = calcAccountBalance(
      Number(acc.initialBalance),
      acc.transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    )
    return sum + Math.max(0, bal)
  }, 0)

  const avgMonthlyExpense     = cur.expense  / 3
  const prevAvgMonthlyExpense = prev.expense / 3

  const emergencyReserveValue     = avgMonthlyExpense > 0     ? liquidBalance / avgMonthlyExpense     : (liquidBalance > 0 ? 12 : 0)
  const prevEmergencyReserveValue = prevAvgMonthlyExpense > 0 ? liquidBalance / prevAvgMonthlyExpense : null

  const emergencyReserveScore = scoreEmergencyReserve(emergencyReserveValue)
  // More months = better, threshold = 0.2 months
  const emergencyTrend = trend(emergencyReserveValue, hasPrevData ? prevEmergencyReserveValue : null, false, 0.2)

  // ── Final score ────────────────────────────────────────────────────────────
  const score = calcHealthScore({
    savingsRate:      savingsRateScore,
    incomeCommitment: incomeCommitmentScore,
    creditDependency: creditDependencyScore,
    emergencyReserve: emergencyReserveScore,
  })

  const hasEnoughData =
    cur.income > 0 || cur.expense > 0 || liquidBalance > 0 || totalLiabilities > 0

  return {
    score,
    classification: classifyScore(score),
    hasEnoughData,
    pillars: {
      savingsRate:      { value: savingsRateValue,      score: savingsRateScore,      trend: savingsTrend,     previousValue: prevSavingsRate },
      incomeCommitment: { value: incomeCommitmentValue, score: incomeCommitmentScore, trend: commitmentTrend,  previousValue: prevCommitment },
      creditDependency: { value: creditDependencyValue, score: creditDependencyScore, trend: creditTrend,      previousValue: prevCreditDependencyValue },
      emergencyReserve: { value: emergencyReserveValue, score: emergencyReserveScore, trend: emergencyTrend,   previousValue: prevEmergencyReserveValue },
    },
  }
}
