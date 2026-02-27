import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

function toNumber(d: Decimal | number): number {
  return Number(d)
}

// ─── Pure calculation functions ───────────────────────────────────────────────
// No external dependencies → fully testable without mocking anything.

export type TxForBalance = { type: string; amount: number }

/**
 * Compute the real-time balance of a single account.
 *
 * Rule: initialBalance + Σ INCOME − Σ EXPENSE
 * Transfers are naturally included (EXPENSE on source, INCOME on destination)
 * so the net effect across all accounts is always zero.
 */
export function calcAccountBalance(
  initialBalance: number,
  transactions: TxForBalance[],
): number {
  let balance = initialBalance
  for (const t of transactions) {
    if (t.type === 'INCOME') balance += t.amount
    else balance -= t.amount
  }
  return balance
}

/** Total assets = sum of every account's real-time balance */
export function calcTotalAssets(
  accounts: { initialBalance: number; transactions: TxForBalance[] }[],
): number {
  return accounts.reduce(
    (sum, acc) => sum + calcAccountBalance(acc.initialBalance, acc.transactions),
    0,
  )
}

/** Net worth = assets − liabilities */
export function calcNetWorth(totalAssets: number, totalLiabilities: number): number {
  return totalAssets - totalLiabilities
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NetWorthSnapshot {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  byAccountType: Record<string, number>
  byLiabilityType: Record<string, number>
}

export interface NetWorthPoint {
  month: string
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

// ─── Service functions (require Prisma, not unit-tested directly) ─────────────

export async function getCurrentNetWorth(
  userId: string,
  prisma: PrismaClient,
): Promise<NetWorthSnapshot> {
  const [accounts, liabilities, ccStatements] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      include: {
        transactions: { select: { type: true, amount: true } },
        investmentPositions: { select: { currentValue: true } },
      },
    }),
    prisma.liability.findMany({
      where: { userId },
      select: { type: true, currentBalance: true },
    }),
    prisma.cardStatement.findMany({
      where: { userId, status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
      select: { totalSpent: true, totalPaid: true },
    }),
  ])

  const byAccountType: Record<string, number> = {}
  let totalAssets = 0
  for (const acc of accounts) {
    // Investment accounts: use market value of positions
    const balance = acc.type === 'INVESTMENT'
      ? acc.investmentPositions.reduce((s, p) => s + toNumber(p.currentValue), 0)
      : calcAccountBalance(
          toNumber(acc.initialBalance),
          acc.transactions.map((t) => ({ type: t.type, amount: toNumber(t.amount) })),
        )
    totalAssets += balance
    byAccountType[acc.type] = (byAccountType[acc.type] ?? 0) + balance
  }

  const byLiabilityType: Record<string, number> = {}
  let totalLiabilities = 0
  for (const l of liabilities) {
    const val = toNumber(l.currentBalance)
    totalLiabilities += val
    byLiabilityType[l.type] = (byLiabilityType[l.type] ?? 0) + val
  }

  const totalCCOpenBalance = ccStatements.reduce(
    (s, stmt) => s + Math.max(0, toNumber(stmt.totalSpent) - toNumber(stmt.totalPaid)),
    0,
  )
  if (totalCCOpenBalance > 0) {
    totalLiabilities += totalCCOpenBalance
    byLiabilityType['CREDIT_CARD'] = (byLiabilityType['CREDIT_CARD'] ?? 0) + totalCCOpenBalance
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: calcNetWorth(totalAssets, totalLiabilities),
    byAccountType,
    byLiabilityType,
  }
}

export async function getNetWorthHistory(
  userId: string,
  prisma: PrismaClient,
  months = 12,
): Promise<NetWorthPoint[]> {
  const now = new Date()

  // Fetch all accounts with their full transaction history in a single query
  const [accounts, liabilities, ccStatements] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      include: {
        transactions: {
          select: { type: true, amount: true, date: true },
          orderBy: { date: 'asc' },
        },
      },
    }),
    prisma.liability.findMany({
      where: { userId },
      select: { currentBalance: true },
    }),
    prisma.cardStatement.findMany({
      where: { userId, status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
      select: { totalSpent: true, totalPaid: true },
    }),
  ])

  // Current liabilities only — we don't store historical liability snapshots.
  // The flat current value is used as the baseline for the whole series.
  const totalCCOpenBalance = ccStatements.reduce(
    (s, stmt) => s + Math.max(0, toNumber(stmt.totalSpent) - toNumber(stmt.totalPaid)),
    0,
  )
  const totalLiabilities =
    liabilities.reduce((s, l) => s + toNumber(l.currentBalance), 0) + totalCCOpenBalance

  const history: NetWorthPoint[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

    const totalAssets = accounts.reduce((sum, acc) => {
      const txsUpToMonth = acc.transactions
        .filter((t) => new Date(t.date) <= endOfMonth)
        .map((t) => ({ type: t.type, amount: toNumber(t.amount) }))
      return sum + calcAccountBalance(toNumber(acc.initialBalance), txsUpToMonth)
    }, 0)

    history.push({
      month: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      totalAssets,
      totalLiabilities,
      netWorth: calcNetWorth(totalAssets, totalLiabilities),
    })
  }

  return history
}
