import { PrismaClient } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarDayEvent {
  label: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  isLiability: boolean
}

export interface CalendarDay {
  date: string      // "YYYY-MM-DD"
  isPast: boolean
  isToday: boolean
  events: CalendarDayEvent[]
  netFlow: number   // sum of income - expense for this day
}

export interface ProjectionItem {
  label: string
  amount: number
}

export interface MonthlyProjection {
  expectedBalance: number
  projectedIncome: number
  projectedExpense: number
  fixedExpenses: number
  variableExpenses: number
  dailyVariableAvg: number
  daysRemaining: number
  calendarDays: CalendarDay[]
  // Breakdown for info modals
  incomeBreakdown: {
    realizedItems: ProjectionItem[]
    recurringItems: ProjectionItem[]
  }
  expenseBreakdown: {
    fixedRealizedItems: ProjectionItem[]
    recurringItems: ProjectionItem[]
    liabilityItems: ProjectionItem[]
    ccItems: ProjectionItem[]
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Returns the number of days in a given month (1-indexed month). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Format a Date as "YYYY-MM-DD". */
function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getMonthlyProjection(
  userId: string,
  prisma: PrismaClient,
): Promise<MonthlyProjection> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const today = new Date(year, month, now.getDate(), 23, 59, 59, 999)
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

  const todayDay = now.getDate()
  const totalDays = daysInMonth(year, month + 1)
  const daysRemaining = totalDays - todayDay
  const daysPassedSafe = Math.max(todayDay, 1)

  const [realizedTxs, futureRecurringTxs, allMonthTxs, allActiveLiabilities, ccDueStatements] = await Promise.all([
    // 1. Transactions realized up to today (excl. transfers)
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: today },
        transferId: null,
      },
      select: { type: true, amount: true, isRecurring: true, parentId: true, description: true, date: true },
    }),
    // 2. Future recurring transactions in this month (excl. transfers)
    prisma.transaction.findMany({
      where: {
        userId,
        isRecurring: true,
        transferId: null,
        date: { gt: today, lte: endOfMonth },
      },
      select: { type: true, amount: true, description: true, date: true },
    }),
    // 3. All transactions this month for calendar (realized + future instances already created)
    prisma.transaction.findMany({
      where: {
        userId,
        transferId: null,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { type: true, amount: true, description: true, date: true, isRecurring: true, parentId: true },
    }),
    // 4. ALL active liabilities (to compute monthly installments)
    prisma.liability.findMany({
      where: {
        userId,
        currentBalance: { gt: 0 },
      },
      select: { name: true, currentBalance: true, installments: true, dueDate: true },
    }),
    // 5. Credit card statements due this month with open balance
    prisma.cardStatement.findMany({
      where: {
        userId,
        dueDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] },
      },
      select: {
        dueDate: true,
        totalSpent: true,
        totalPaid: true,
        card: { select: { name: true } },
      },
    }),
  ])

  // ── Classify realized expenses as fixed vs variable ────────────────────────
  let realizedIncome = 0
  let fixedExpenseRealized = 0
  let variableExpenseRealized = 0

  const realizedIncomeItems: ProjectionItem[] = []
  const fixedRealizedItems: ProjectionItem[] = []

  for (const tx of realizedTxs) {
    const amount = Number(tx.amount)
    if (tx.type === 'INCOME') {
      realizedIncome += amount
      realizedIncomeItems.push({ label: tx.description, amount })
    } else {
      const isFixed = tx.isRecurring || tx.parentId !== null
      if (isFixed) {
        fixedExpenseRealized += amount
        fixedRealizedItems.push({ label: tx.description, amount })
      } else {
        variableExpenseRealized += amount
      }
    }
  }

  // ── Future recurring ───────────────────────────────────────────────────────
  const futureRecurringIncome = futureRecurringTxs
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0)

  const futureRecurringExpense = futureRecurringTxs
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0)

  // ── Variable (informational only — not included in projectedExpense) ────────
  const dailyVariableAvg = variableExpenseRealized / daysPassedSafe
  const projectedVariableFromRemaining = dailyVariableAvg * daysRemaining

  // ── Liability installments ────────────────────────────────────────────────
  const liabilityItems: ProjectionItem[] = allActiveLiabilities
    .map((l) => {
      if (l.installments && l.installments > 0) {
        // Has installments → monthly cost = currentBalance / installments
        return { label: l.name, amount: Number(l.currentBalance) / l.installments }
      }
      // No installments but due this month → full current balance
      if (l.dueDate) {
        const d = new Date(l.dueDate)
        if (d.getFullYear() === year && d.getMonth() === month) {
          return { label: l.name, amount: Number(l.currentBalance) }
        }
      }
      return null
    })
    .filter((item): item is ProjectionItem => item !== null)

  const liabilityInstallmentsTotal = liabilityItems.reduce((s, i) => s + i.amount, 0)

  // ── Credit card open statements ───────────────────────────────────────────
  const ccItems: ProjectionItem[] = ccDueStatements
    .map((stmt) => ({
      label: `Fatura ${stmt.card.name}`,
      amount: Math.max(0, Number(stmt.totalSpent) - Number(stmt.totalPaid)),
    }))
    .filter((item) => item.amount > 0)

  const ccOpenBalancesTotal = ccItems.reduce((s, i) => s + i.amount, 0)

  // ── Final projection ───────────────────────────────────────────────────────
  const fixedExpenses = fixedExpenseRealized + futureRecurringExpense
  const variableExpenses = variableExpenseRealized + projectedVariableFromRemaining

  const projectedIncome = realizedIncome + futureRecurringIncome

  // projectedExpense = committed expenses only (recurring + liability installments + CC statements)
  const projectedExpense = fixedExpenses + liabilityInstallmentsTotal + ccOpenBalancesTotal

  const expectedBalance = projectedIncome - projectedExpense

  // ── Breakdown details for info modals ─────────────────────────────────────
  const incomeBreakdown = {
    realizedItems: realizedIncomeItems,
    recurringItems: futureRecurringTxs
      .filter((t) => t.type === 'INCOME')
      .map((t) => ({ label: t.description, amount: Number(t.amount) })),
  }

  const expenseBreakdown = {
    fixedRealizedItems,
    recurringItems: futureRecurringTxs
      .filter((t) => t.type === 'EXPENSE')
      .map((t) => ({ label: t.description, amount: Number(t.amount) })),
    liabilityItems,
    ccItems,
  }

  // ── Build calendar ─────────────────────────────────────────────────────────
  const txsByDay = new Map<number, CalendarDayEvent[]>()

  for (const tx of allMonthTxs) {
    const d = new Date(tx.date)
    const dayNum = d.getDate()
    if (!txsByDay.has(dayNum)) txsByDay.set(dayNum, [])
    txsByDay.get(dayNum)!.push({
      label: tx.description,
      amount: Number(tx.amount),
      type: tx.type as 'INCOME' | 'EXPENSE',
      isLiability: false,
    })
  }

  // Add credit card due-date events to calendar
  for (const stmt of ccDueStatements) {
    const openBalance = Math.max(0, Number(stmt.totalSpent) - Number(stmt.totalPaid))
    if (openBalance <= 0) continue
    const d = new Date(stmt.dueDate)
    const dayNum = d.getDate()
    if (!txsByDay.has(dayNum)) txsByDay.set(dayNum, [])
    txsByDay.get(dayNum)!.push({
      label: `Vencimento Fatura ${stmt.card.name}`,
      amount: openBalance,
      type: 'EXPENSE',
      isLiability: true,
    })
  }

  // Add liability events (only those due this month) to calendar
  for (const liability of allActiveLiabilities) {
    if (!liability.dueDate) continue
    const d = new Date(liability.dueDate)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const dayNum = d.getDate()
    if (!txsByDay.has(dayNum)) txsByDay.set(dayNum, [])
    txsByDay.get(dayNum)!.push({
      label: liability.name,
      amount: Number(liability.currentBalance),
      type: 'EXPENSE',
      isLiability: true,
    })
  }

  // Build day-by-day array
  const todayString = toDateString(new Date(year, month, todayDay))
  const calendarDays: CalendarDay[] = []

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day)
    const dateStr = toDateString(dateObj)
    const events = txsByDay.get(day) ?? []
    const netFlow = events.reduce((s, e) => s + (e.type === 'INCOME' ? e.amount : -e.amount), 0)

    calendarDays.push({
      date: dateStr,
      isPast: dateStr < todayString,
      isToday: dateStr === todayString,
      events,
      netFlow,
    })
  }

  return {
    expectedBalance,
    projectedIncome,
    projectedExpense,
    fixedExpenses,
    variableExpenses,
    dailyVariableAvg,
    daysRemaining,
    calendarDays,
    incomeBreakdown,
    expenseBreakdown,
  }
}
