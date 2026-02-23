/**
 * Pure utility functions for credit-card billing cycle calculations.
 * No external dependencies — fully unit-testable.
 */

export interface BillingCycle {
  periodStart: Date
  periodEnd: Date
  closingDate: Date
  dueDate: Date
}

/**
 * Resolves the actual closing day for a given month, handling months with
 * fewer days than the configured closingDay (e.g. closingDay=31, February → 28/29).
 */
export function resolveClosingDay(year: number, month: number, closingDay: number): number {
  // month is 0-indexed (Date API convention)
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.min(closingDay, lastDay)
}

/**
 * Given a card's statementClosingDay and dueDay, determines which billing cycle
 * a transactionDate belongs to and returns the full period boundaries.
 *
 * Logic:
 *   - If transactionDate.day <= closingDay of that month
 *       → statement closes this month
 *   - If transactionDate.day > closingDay of that month
 *       → statement closes next month
 *
 *   dueDate placement:
 *   - If dueDay > closingDay → dueDate is in the same month as closingDate
 *   - If dueDay <= closingDay → dueDate is in the month AFTER closingDate
 */
export function getBillingCycle(
  closingDay: number,
  dueDay: number,
  transactionDate: Date,
): BillingCycle {
  const txYear = transactionDate.getFullYear()
  const txMonth = transactionDate.getMonth() // 0-indexed
  const txDay = transactionDate.getDate()

  const resolvedClosingThisMonth = resolveClosingDay(txYear, txMonth, closingDay)

  let closingYear: number
  let closingMonth: number // 0-indexed
  let closingActualDay: number

  if (txDay <= resolvedClosingThisMonth) {
    // Closes this month
    closingYear = txYear
    closingMonth = txMonth
    closingActualDay = resolvedClosingThisMonth
  } else {
    // Closes next month
    const nextMonth = txMonth === 11 ? 0 : txMonth + 1
    const nextYear = txMonth === 11 ? txYear + 1 : txYear
    closingYear = nextYear
    closingMonth = nextMonth
    closingActualDay = resolveClosingDay(nextYear, nextMonth, closingDay)
  }

  const closingDate = new Date(closingYear, closingMonth, closingActualDay, 23, 59, 59, 999)

  // periodStart = day after closing of the PREVIOUS month
  const prevClosingMonth = closingMonth === 0 ? 11 : closingMonth - 1
  const prevClosingYear = closingMonth === 0 ? closingYear - 1 : closingYear
  const prevClosingDay = resolveClosingDay(prevClosingYear, prevClosingMonth, closingDay)
  const periodStart = new Date(prevClosingYear, prevClosingMonth, prevClosingDay + 1, 0, 0, 0, 0)
  // Handle edge: if prevClosingDay was last day of month, +1 overflows → JS Date handles it
  const periodStartNormalized = new Date(
    prevClosingYear,
    prevClosingMonth,
    prevClosingDay + 1,
    0,
    0,
    0,
    0,
  )
  const periodEnd = new Date(closingYear, closingMonth, closingActualDay, 23, 59, 59, 999)

  // dueDate
  let dueDateYear: number
  let dueDateMonth: number
  if (dueDay > closingDay) {
    // Same month as closing
    dueDateYear = closingYear
    dueDateMonth = closingMonth
  } else {
    // Month after closing
    dueDateMonth = closingMonth === 11 ? 0 : closingMonth + 1
    dueDateYear = closingMonth === 11 ? closingYear + 1 : closingYear
  }
  const resolvedDueDay = resolveClosingDay(dueDateYear, dueDateMonth, dueDay)
  const dueDate = new Date(dueDateYear, dueDateMonth, resolvedDueDay, 23, 59, 59, 999)

  return {
    periodStart: periodStartNormalized,
    periodEnd,
    closingDate,
    dueDate,
  }
}

/**
 * Returns the billing cycle for installment N (1-indexed) given the first
 * installment's transaction date. Each subsequent installment falls on the
 * same day of month in successive months.
 */
export function getInstallmentDate(startDate: Date, installmentNumber: number): Date {
  const day = startDate.getDate()
  const month = startDate.getMonth() + (installmentNumber - 1)
  const year = startDate.getFullYear()
  // Adding months via Date constructor handles year overflow
  const raw = new Date(year, month, 1)
  const lastDay = new Date(raw.getFullYear(), raw.getMonth() + 1, 0).getDate()
  return new Date(raw.getFullYear(), raw.getMonth(), Math.min(day, lastDay), 12, 0, 0, 0)
}
