import { PrismaClient } from '@prisma/client'
import { calcAccountBalance } from './netWorthService'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PillarResult {
  /** The raw computed ratio/value (e.g. 0.12 for 12%, or 4.2 for 4.2 months) */
  value: number
  /** Discrete score: 0, 25, 50, 75, or 100 */
  score: number
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
 * rate = (income − expense) / income  over the last 3 months
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
 * ratio = recurring_expenses / income  over the last 3 months
 */
export function scoreIncomeCommitment(ratio: number): number {
  if (ratio > 0.80) return 0
  if (ratio > 0.60) return 25
  if (ratio > 0.40) return 50
  if (ratio > 0.20) return 75
  return 100
}

/**
 * Pillar 3 — Dependência de Crédito (20%)
 * ratio = total_liabilities / (monthly_income × 6)
 */
export function scoreCreditDependency(ratio: number): number {
  if (ratio > 1.00) return 0
  if (ratio > 0.75) return 25
  if (ratio > 0.50) return 50
  if (ratio > 0.25) return 75
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
    pillars.savingsRate     * 0.30 +
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

// ─── Service function (Prisma-dependent) ─────────────────────────────────────

export async function getFinancialHealth(
  userId: string,
  prisma: PrismaClient,
): Promise<FinancialHealthData> {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  const [transactions, liquidAccounts, liabilities] = await Promise.all([
    // Transactions for pillars 1 & 2 — exclude transfers
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: threeMonthsAgo },
        transferId: null,
      },
      select: { type: true, amount: true, isRecurring: true },
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
  ])

  // ── Pillar 1: Taxa de Poupança ─────────────────────────────────────────────
  const totalIncome3m = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalExpense3m = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0)

  const savingsRateValue =
    totalIncome3m > 0 ? (totalIncome3m - totalExpense3m) / totalIncome3m : 0
  const savingsRateScore = scoreSavingsRate(savingsRateValue)

  // ── Pillar 2: Comprometimento da Renda ────────────────────────────────────
  const recurringExpense3m = transactions
    .filter((t) => t.type === 'EXPENSE' && t.isRecurring)
    .reduce((s, t) => s + Number(t.amount), 0)

  const incomeCommitmentValue =
    totalIncome3m > 0
      ? recurringExpense3m / totalIncome3m
      : recurringExpense3m > 0 ? 1 : 0
  const incomeCommitmentScore = scoreIncomeCommitment(incomeCommitmentValue)

  // ── Pillar 3: Dependência de Crédito ──────────────────────────────────────
  const totalLiabilities = liabilities.reduce(
    (s, l) => s + Number(l.currentBalance),
    0,
  )
  const monthlyIncome = totalIncome3m / 3
  const creditDependencyValue =
    monthlyIncome > 0
      ? totalLiabilities / (monthlyIncome * 6)
      : totalLiabilities > 0 ? 2 : 0
  const creditDependencyScore = scoreCreditDependency(creditDependencyValue)

  // ── Pillar 4: Reserva de Emergência ───────────────────────────────────────
  const liquidBalance = liquidAccounts.reduce((sum, acc) => {
    const bal = calcAccountBalance(
      Number(acc.initialBalance),
      acc.transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    )
    return sum + Math.max(0, bal) // negative balances don't help reserves
  }, 0)

  const avgMonthlyExpense = totalExpense3m / 3
  const emergencyReserveValue =
    avgMonthlyExpense > 0
      ? liquidBalance / avgMonthlyExpense
      : liquidBalance > 0 ? 12 : 0
  const emergencyReserveScore = scoreEmergencyReserve(emergencyReserveValue)

  // ── Final score ────────────────────────────────────────────────────────────
  const score = calcHealthScore({
    savingsRate:      savingsRateScore,
    incomeCommitment: incomeCommitmentScore,
    creditDependency: creditDependencyScore,
    emergencyReserve: emergencyReserveScore,
  })

  // True only when there is meaningful financial data to produce a reliable score
  const hasEnoughData =
    totalIncome3m > 0 || totalExpense3m > 0 || liquidBalance > 0 || totalLiabilities > 0

  return {
    score,
    classification: classifyScore(score),
    hasEnoughData,
    pillars: {
      savingsRate:      { value: savingsRateValue,      score: savingsRateScore },
      incomeCommitment: { value: incomeCommitmentValue, score: incomeCommitmentScore },
      creditDependency: { value: creditDependencyValue, score: creditDependencyScore },
      emergencyReserve: { value: emergencyReserveValue, score: emergencyReserveScore },
    },
  }
}
