import { PrismaClient, InsightType, InsightSeverity, InsightStatus, MicroGoalStatus } from '@prisma/client'
import { calcAccountBalance, getNetWorthHistory } from './netWorthService'
import { groupByMonth } from './insightsService'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface InsightCTA {
  label: string
  route: string
  params?: Record<string, string>
}

export interface InsightOut {
  id: string
  type: InsightType
  severity: InsightSeverity
  status: InsightStatus
  title: string
  message: string
  explanation?: string | null
  suggestedAction: string
  cta?: InsightCTA | null
  dataContext?: Record<string, unknown>
  snoozedUntil?: string | null
  createdAt: string
}

export interface MicroGoalOut {
  id: string
  userId: string
  name: string
  scopeType: string
  scopeRefId: string | null
  limitAmount: number
  startDate: string
  endDate: string
  status: string
  currentAmount: number
  expectedPace: number
  createdAt: string
}

export interface InsightsAlerts {
  budgetExceeded: boolean
  overdueLiabilities: number
  negativeBalanceProjection: boolean
}

export interface InsightsResponse {
  insights: InsightOut[]
  microGoals: MicroGoalOut[]
  alerts: InsightsAlerts
  hasEnoughData: boolean
  evaluatedAt: string
}

// ─── Internal candidate type ──────────────────────────────────────────────────

interface InsightCandidate {
  type: InsightType
  severity: InsightSeverity
  title: string
  message: string
  explanation?: string
  suggestedAction: string
  cta: InsightCTA
  dedupeKey: string
  context: Record<string, unknown>
  validTo: Date
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const engineCache = new Map<string, { data: InsightsResponse; computedAt: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function invalidateInsightCache(userId: string) {
  engineCache.delete(userId)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }

// ─── Engine ───────────────────────────────────────────────────────────────────

export async function runInsightEngine(
  userId: string,
  prisma: PrismaClient,
): Promise<InsightsResponse> {
  // Check cache
  const cached = engineCache.get(userId)
  if (cached && Date.now() - cached.computedAt < CACHE_TTL) {
    return cached.data
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfCurrentMonth = endOfMonth(now)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
  const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  const [
    recentTxs,
    currentMonthTxsByCat,
    last7dTxsByCat,
    liquidAccounts,
    liabilities,
    budgets,
    spendingByCategory,
    futureRecurring,
    netWorthHistory,
    creditCards,
    ccStatements,
    microGoals,
    categories,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: fourMonthsAgo }, transferId: null, isCardPayment: { not: true } },
      select: { type: true, amount: true, date: true, description: true, isRecurring: true, categoryId: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId, type: 'EXPENSE', transferId: null, isCardPayment: { not: true },
        date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId, type: 'EXPENSE', transferId: null, isCardPayment: { not: true },
        date: { gte: sevenDaysAgo, lte: today },
      },
      _sum: { amount: true },
    }),
    prisma.account.findMany({
      where: { userId, type: { in: ['CHECKING', 'SAVINGS', 'CASH'] } },
      include: { transactions: { select: { type: true, amount: true } } },
    }),
    prisma.liability.findMany({
      where: { userId },
      select: { id: true, currentBalance: true, dueDate: true, name: true },
    }),
    prisma.budget.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
      select: { categoryId: true, amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId, type: 'EXPENSE', transferId: null, isCardPayment: { not: true },
        date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId, isRecurring: true, transferId: null, isCardPayment: { not: true },
        date: { gt: today, lte: endOfCurrentMonth },
      },
      select: { type: true, amount: true },
    }),
    getNetWorthHistory(userId, prisma, 7),
    prisma.creditCard.findMany({
      where: { userId, isArchived: false },
      include: {
        statements: {
          where: { status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
          select: { totalSpent: true, totalPaid: true },
        },
      },
    }),
    prisma.cardStatement.findMany({
      where: { userId, status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
      select: { totalSpent: true, totalPaid: true },
    }),
    prisma.microGoal.findMany({ where: { userId, status: { not: 'COMPLETED' } } }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true } }),
  ])

  // ── Pre-computation ────────────────────────────────────────────────────────

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const byMonth = groupByMonth(
    recentTxs.map((t) => ({ ...t, amount: Number(t.amount) })),
    currentMonthKey,
  )
  const sortedMonths = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  const last4Months = sortedMonths.slice(-4)
  const last3Months = last4Months.slice(-3)
  const last3Count = Math.max(last3Months.length, 1)
  const avg3mIncome = last3Months.reduce((s, [, m]) => s + m.income, 0) / last3Count
  const avg3mExpense = last3Months.reduce((s, [, m]) => s + m.expense, 0) / last3Count
  const avg3mRecurring = last3Months.reduce((s, [, m]) => s + m.recurringExpense, 0) / last3Count

  const liquidBalance = liquidAccounts.reduce((sum, acc) => {
    const bal = calcAccountBalance(
      Number(acc.initialBalance),
      acc.transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    )
    return sum + Math.max(0, bal)
  }, 0)

  const totalCCOpenBalance = ccStatements.reduce(
    (s, stmt) => s + Math.max(0, Number(stmt.totalSpent) - Number(stmt.totalPaid)),
    0,
  )
  const totalLiabilities =
    liabilities.reduce((s, l) => s + Number(l.currentBalance), 0) + totalCCOpenBalance

  // Historical baseline per category (avg of last 3 full months)
  const baselineByCategory = new Map<string, number>()
  const countByCategory = new Map<string, number>()
  for (const tx of recentTxs) {
    if (tx.type !== 'EXPENSE') continue
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (key === currentMonthKey) continue
    baselineByCategory.set(tx.categoryId, (baselineByCategory.get(tx.categoryId) ?? 0) + Number(tx.amount))
    countByCategory.set(tx.categoryId, (countByCategory.get(tx.categoryId) ?? 0) + 1)
  }
  // Normalize to monthly avg using last3Count as denominator
  for (const [catId, total] of baselineByCategory) {
    baselineByCategory.set(catId, total / last3Count)
  }

  const currentByCat = new Map(
    currentMonthTxsByCat.map((r) => [r.categoryId, Number(r._sum.amount ?? 0)]),
  )
  const last7dByCat = new Map(
    last7dTxsByCat.map((r) => [r.categoryId, Number(r._sum.amount ?? 0)]),
  )

  // ── Generate insight candidates ────────────────────────────────────────────
  const candidates: InsightCandidate[] = []

  // 1. NEGATIVE_CASHFLOW
  // Require income data — without it every month trivially shows as "negative"
  if (last4Months.length >= 3 && avg3mIncome > 0) {
    // Only count months where income was actually recorded AND exceeded by expenses
    const negativeCount = last4Months.filter(([, m]) => m.income > 0 && m.expense > m.income).length
    if (negativeCount >= 3) {
      const total = last4Months.length
      candidates.push({
        type: 'NEGATIVE_CASHFLOW',
        severity: negativeCount === total ? 'CRITICAL' : 'WARNING',
        title: 'Gastos acima da renda',
        message: `Você gastou mais do que ganhou em ${negativeCount} dos últimos ${total} meses.`,
        explanation: 'Comparação entre receitas e despesas (excluindo transferências e pagamentos de cartão) dos últimos meses completos.',
        suggestedAction: 'Revise seus gastos fixos ou reduza despesas variáveis para evitar endividamento.',
        cta: { label: 'Ver relatórios', route: '/reports' },
        dedupeKey: `NEGATIVE_CASHFLOW:${currentMonthKey}`,
        context: { negativeMonths: negativeCount, totalMonths: total },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // 2. HIGH_FIXED_COSTS
  if (avg3mIncome > 0) {
    const commitmentRatio = avg3mRecurring / avg3mIncome
    if (commitmentRatio >= 0.60) {
      candidates.push({
        type: 'HIGH_FIXED_COSTS',
        severity: commitmentRatio >= 0.80 ? 'CRITICAL' : 'WARNING',
        title: 'Renda excessivamente comprometida',
        message: `Seus gastos fixos consomem ${(commitmentRatio * 100).toFixed(0)}% da sua renda mensal.`,
        explanation: 'Despesas recorrentes divididas pela renda média dos últimos 3 meses.',
        suggestedAction: 'Avalie contratos, assinaturas ou despesas recorrentes que podem ser reduzidas.',
        cta: { label: 'Ver relatórios', route: '/reports' },
        dedupeKey: `HIGH_FIXED_COSTS:${currentMonthKey}`,
        context: { commitmentRatio: Math.round(commitmentRatio * 1000) / 1000 },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // 3. STAGNANT_NET_WORTH
  if (netWorthHistory.length >= 7) {
    const current = netWorthHistory[6].netWorth
    const sixMonthsAgo = netWorthHistory[0].netWorth
    if (Math.abs(sixMonthsAgo) > 0) {
      const variation = (current - sixMonthsAgo) / Math.abs(sixMonthsAgo)
      if (Math.abs(variation) <= 0.01) {
        candidates.push({
          type: 'STAGNANT_NET_WORTH',
          severity: 'WARNING',
          title: 'Patrimônio estagnado',
          message: 'Seu patrimônio praticamente não mudou nos últimos 6 meses.',
          explanation: 'Variação menor que 1% entre o patrimônio líquido atual e de 6 meses atrás.',
          suggestedAction: 'Aumentar sua taxa de poupança ou revisar investimentos pode ajudar a retomar o crescimento.',
          cta: { label: 'Ver relatórios', route: '/reports' },
          dedupeKey: `STAGNANT_NET_WORTH:${currentMonthKey}`,
          context: { variationPercent: Math.round(variation * 10000) / 100 },
          validTo: endOfCurrentMonth,
        })
      }
    }
  }

  // 4. LOW_EMERGENCY_RESERVE
  // Require expense history to estimate coverage — without it the calculation is meaningless
  if (avg3mExpense > 0) {
    const emergencyMonths = liquidBalance / avg3mExpense
    if (emergencyMonths < 3) {
      candidates.push({
        type: 'LOW_EMERGENCY_RESERVE',
        severity: emergencyMonths < 1 ? 'CRITICAL' : 'WARNING',
        title: 'Reserva de emergência baixa',
        message: `Sua reserva cobre apenas ${emergencyMonths.toFixed(1)} ${emergencyMonths === 1 ? 'mês' : 'meses'} de despesas.`,
        explanation: 'Saldo de contas líquidas (corrente, poupança, dinheiro) dividido pela despesa mensal média dos últimos 3 meses.',
        suggestedAction: 'Priorize a construção de uma reserva antes de novos investimentos.',
        cta: { label: 'Ver contas', route: '/accounts' },
        dedupeKey: `LOW_EMERGENCY_RESERVE:${currentMonthKey}`,
        context: { emergencyMonths: Math.round(emergencyMonths * 100) / 100, liquidBalance },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // 5. HIGH_CREDIT_DEPENDENCY
  // Require at least 1 month of income data — without it the ratio is meaningless
  if (avg3mIncome > 0) {
    // Months of income needed to clear total debt
    const debtMonths = totalLiabilities / avg3mIncome
    // WARNING: debt > 6 months of income; CRITICAL: debt > 18 months of income
    if (debtMonths >= 6) {
      const creditRatio = totalLiabilities / (avg3mIncome * 6)
      candidates.push({
        type: 'HIGH_CREDIT_DEPENDENCY',
        severity: debtMonths > 18 ? 'CRITICAL' : 'WARNING',
        title: 'Dependência elevada de crédito',
        message:
          debtMonths > 18
            ? `Suas dívidas equivalem a mais de 18 meses da sua renda.`
            : `Suas dívidas equivalem a ${debtMonths.toFixed(1)} meses da sua renda.`,
        explanation: 'Total de passivos e faturas de cartão (excluindo pagamentos já efetuados) dividido pela renda mensal média dos últimos 3 meses.',
        suggestedAction: 'Considere reduzir o uso de crédito ou renegociar passivos.',
        cta: { label: 'Ver passivos', route: '/liabilities' },
        dedupeKey: `HIGH_CREDIT_DEPENDENCY:${currentMonthKey}`,
        context: { creditRatio: Math.round(creditRatio * 1000) / 1000, debtMonths: Math.round(debtMonths * 10) / 10, totalLiabilities },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // 6. HIGH_CC_UTILIZATION
  for (const card of creditCards) {
    const openBalance = card.statements.reduce(
      (s, stmt) => s + Math.max(0, Number(stmt.totalSpent) - Number(stmt.totalPaid)),
      0,
    )
    const creditLimit = Number(card.creditLimit)
    const utilizationPercent = creditLimit > 0 ? openBalance / creditLimit : 0
    if (utilizationPercent >= 0.80) {
      candidates.push({
        type: 'HIGH_CC_UTILIZATION',
        severity: utilizationPercent >= 0.90 ? 'CRITICAL' : 'WARNING',
        title: `Alta utilização: ${card.name}`,
        message: `O cartão ${card.name} está com ${(utilizationPercent * 100).toFixed(0)}% do limite utilizado.`,
        explanation: 'Saldo em aberto das faturas dividido pelo limite de crédito do cartão.',
        suggestedAction: 'Reduza os gastos no cartão ou pague a fatura para liberar limite.',
        cta: { label: 'Ver cartões', route: '/credit-cards' },
        dedupeKey: `HIGH_CC_UTILIZATION:${card.id}:${currentMonthKey}`,
        context: {
          cardName: card.name,
          utilizationPercent: Math.round(utilizationPercent * 1000) / 1000,
          openBalance,
          creditLimit,
        },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // 7. OUTLIER_SPEND — current month > 135% of 3-month baseline & Δ ≥ R$100
  for (const [categoryId, currentAmount] of currentByCat) {
    const baseline = baselineByCategory.get(categoryId) ?? 0
    if (baseline > 0 && currentAmount > baseline * 1.35 && currentAmount - baseline >= 100) {
      const catName = categoryMap.get(categoryId) ?? 'categoria'
      const overPct = ((currentAmount / baseline - 1) * 100).toFixed(0)
      candidates.push({
        type: 'OUTLIER_SPEND',
        severity: 'WARNING',
        title: `Gasto elevado: ${catName}`,
        message: `Gasto em ${catName} está ${overPct}% acima da média dos últimos 3 meses.`,
        explanation: `Gasto atual de R$ ${currentAmount.toFixed(2)} vs média histórica de R$ ${baseline.toFixed(2)}.`,
        suggestedAction: 'Verifique quais transações contribuíram para o aumento.',
        cta: {
          label: 'Ver transações',
          route: '/transactions',
          params: { categoryId, month: String(now.getMonth() + 1), year: String(now.getFullYear()) },
        },
        dedupeKey: `OUTLIER_SPEND:${categoryId}:${currentMonthKey}`,
        context: { categoryId, categoryName: catName, currentAmount, baseline },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // 8. CATEGORY_SPIKE — last 7 days > 60% of monthly baseline, before day 20
  if (now.getDate() <= 20) {
    for (const [categoryId, spent7d] of last7dByCat) {
      const baseline = baselineByCategory.get(categoryId) ?? 0
      if (baseline > 0 && spent7d > baseline * 0.60 && spent7d >= 50) {
        const catName = categoryMap.get(categoryId) ?? 'categoria'
        const pct = ((spent7d / baseline) * 100).toFixed(0)
        candidates.push({
          type: 'CATEGORY_SPIKE',
          severity: 'WARNING',
          title: `Pico de gastos: ${catName}`,
          message: `Você gastou ${pct}% do orçamento habitual de ${catName} só nos últimos 7 dias.`,
          explanation: 'Despesas nos últimos 7 dias comparadas à média mensal histórica desta categoria.',
          suggestedAction: 'Ainda restam dias no mês — monitore os próximos gastos nesta categoria.',
          cta: { label: 'Ver transações', route: '/transactions', params: { categoryId } },
          dedupeKey: `CATEGORY_SPIKE:${categoryId}:${currentMonthKey}`,
          context: { categoryId, categoryName: catName, spent7d, baseline },
          validTo: endOfCurrentMonth,
        })
      }
    }
  }

  // 9. DUE_PAYMENT — liability due within 7 days
  for (const liability of liabilities) {
    if (!liability.dueDate || Number(liability.currentBalance) <= 0) continue
    const dueDate = new Date(liability.dueDate)
    if (dueDate >= today && dueDate <= sevenDaysFromNow) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      candidates.push({
        type: 'DUE_PAYMENT',
        severity: daysUntilDue <= 2 ? 'CRITICAL' : 'WARNING',
        title: `Vencimento próximo: ${liability.name}`,
        message:
          daysUntilDue === 0
            ? `"${liability.name}" vence hoje.`
            : `"${liability.name}" vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}.`,
        explanation: 'Passivo com saldo positivo e data de vencimento nos próximos 7 dias.',
        suggestedAction: 'Verifique se o pagamento já foi programado para evitar juros.',
        cta: { label: 'Ver passivos', route: '/liabilities' },
        dedupeKey: `DUE_PAYMENT:${liability.id}:${currentMonthKey}`,
        context: { liabilityId: liability.id, daysUntilDue, dueDate: dueDate.toISOString() },
        validTo: dueDate,
      })
    }
  }

  // 10. BUDGET_AT_RISK — ≥ 85% spent with ≥ 7 days remaining
  const daysRemainingInMonth = Math.ceil(
    (endOfCurrentMonth.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )
  if (daysRemainingInMonth >= 7) {
    const spendingMap = new Map(
      spendingByCategory.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]),
    )
    for (const budget of budgets) {
      const spent = spendingMap.get(budget.categoryId) ?? 0
      const budgetAmount = Number(budget.amount)
      if (budgetAmount > 0 && spent / budgetAmount >= 0.85) {
        const pct = ((spent / budgetAmount) * 100).toFixed(0)
        const catName = categoryMap.get(budget.categoryId) ?? 'categoria'
        candidates.push({
          type: 'BUDGET_AT_RISK',
          severity: spent >= budgetAmount ? 'CRITICAL' : 'WARNING',
          title: `Orçamento em risco: ${catName}`,
          message: `${pct}% do orçamento de ${catName} já foi usado com ${daysRemainingInMonth} dias restantes.`,
          explanation: 'Gasto acumulado neste mês dividido pelo orçamento definido para esta categoria.',
          suggestedAction: 'Reduza os gastos nesta categoria para não estourar o orçamento.',
          cta: {
            label: 'Ver gastos',
            route: '/transactions',
            params: {
              categoryId: budget.categoryId,
              month: String(now.getMonth() + 1),
              year: String(now.getFullYear()),
            },
          },
          dedupeKey: `BUDGET_AT_RISK:${budget.categoryId}:${currentMonthKey}`,
          context: {
            categoryId: budget.categoryId,
            categoryName: catName,
            spent,
            budgetAmount,
            percentUsed: Number(pct),
          },
          validTo: endOfCurrentMonth,
        })
      }
    }
  }

  // 11. NEW_SUBSCRIPTION — recurring EXPENSE first appeared in the last 30 days
  {
    // Build a set of normalized descriptions from recurring expenses BEFORE the 30-day window
    const historicalRecurringDesc = new Set(
      recentTxs
        .filter((t) => t.isRecurring && t.type === 'EXPENSE' && new Date(t.date) < thirtyDaysAgo)
        .map((t) => t.description.toLowerCase().trim()),
    )

    const seenNew = new Set<string>()
    for (const tx of recentTxs) {
      if (!tx.isRecurring || tx.type !== 'EXPENSE') continue
      if (new Date(tx.date) < thirtyDaysAgo) continue
      const key = tx.description.toLowerCase().trim()
      if (!key || historicalRecurringDesc.has(key) || seenNew.has(key)) continue

      seenNew.add(key)
      const amount = Number(tx.amount)
      candidates.push({
        type: 'NEW_SUBSCRIPTION',
        severity: 'INFO',
        title: `Nova recorrência: ${tx.description}`,
        message: `"${tx.description}" apareceu como despesa recorrente este mês — R$ ${amount.toFixed(2)}.`,
        explanation: 'Transação marcada como recorrente sem histórico nos 3 meses anteriores. Pode ser uma nova assinatura ou serviço.',
        suggestedAction: 'Verifique se este gasto foi intencional e se o valor está correto.',
        cta: { label: 'Ver transações', route: '/transactions' },
        dedupeKey: `NEW_SUBSCRIPTION:${key}:${currentMonthKey}`,
        context: { description: tx.description, amount },
        validTo: endOfCurrentMonth,
      })
    }
  }

  // ── MicroGoal engine ───────────────────────────────────────────────────────

  const microGoalOuts: MicroGoalOut[] = []
  const microGoalCandidates: InsightCandidate[] = []
  const microGoalStatusUpdates: Promise<unknown>[] = []

  const microGoalResults = await Promise.all(
    microGoals.map(async (goal) => {
      const startDate = new Date(goal.startDate)
      const endDate = new Date(goal.endDate)
      const limitAmount = Number(goal.limitAmount)

      const whereClause: Parameters<typeof prisma.transaction.aggregate>[0]['where'] = {
        userId,
        type: 'EXPENSE',
        transferId: null,
        isCardPayment: { not: true },
        date: { gte: startDate, lte: endDate },
      }
      if (goal.scopeType === 'CATEGORY' && goal.scopeRefId) {
        whereClause.categoryId = goal.scopeRefId
      }

      const agg = await prisma.transaction.aggregate({ where: whereClause, _sum: { amount: true } })
      const currentAmount = Number(agg._sum.amount ?? 0)

      const totalDays = Math.max(
        1,
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      )
      const elapsed = Math.max(
        0,
        (today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      )
      const expectedPace = limitAmount * (elapsed / totalDays)

      let newStatus: MicroGoalStatus = 'ON_TRACK'
      if (currentAmount > limitAmount) {
        newStatus = 'BREACHED'
      } else if (expectedPace > 0 && currentAmount > expectedPace * 1.15) {
        newStatus = 'AT_RISK'
      }

      return { goal, currentAmount, expectedPace, newStatus, startDate, endDate, limitAmount }
    }),
  )

  for (const { goal, currentAmount, expectedPace, newStatus, endDate, limitAmount } of microGoalResults) {
    if (newStatus !== goal.status) {
      microGoalStatusUpdates.push(
        prisma.microGoal.update({ where: { id: goal.id }, data: { status: newStatus } }),
      )
    }

    if (newStatus === 'AT_RISK' || newStatus === 'BREACHED') {
      const insightType: InsightType =
        newStatus === 'BREACHED' ? 'MICRO_GOAL_BREACHED' : 'MICRO_GOAL_AT_RISK'
      const dedupeKey = `${insightType}:${goal.id}:${currentMonthKey}`
      const message =
        newStatus === 'BREACHED'
          ? `A meta "${goal.name}" foi ultrapassada. Gasto: R$ ${currentAmount.toFixed(2)} / limite R$ ${limitAmount.toFixed(2)}.`
          : `A meta "${goal.name}" está em risco — o ritmo atual supera o esperado para este período.`
      const suggestedAction = 'Reduza os gastos nesta categoria até o fim do período para retomar o controle.'

      microGoalCandidates.push({
        type: insightType,
        severity: newStatus === 'BREACHED' ? 'CRITICAL' : 'WARNING',
        title: newStatus === 'BREACHED' ? `Meta ultrapassada: ${goal.name}` : `Meta em risco: ${goal.name}`,
        message,
        explanation: `Limite: R$ ${limitAmount.toFixed(2)} · Ritmo esperado: R$ ${expectedPace.toFixed(2)} · Atual: R$ ${currentAmount.toFixed(2)}.`,
        suggestedAction,
        cta: { label: 'Ver insights', route: '/insights' },
        dedupeKey,
        context: { goalId: goal.id, currentAmount, limitAmount, expectedPace, suggestedAction },
        validTo: endDate,
      })
    }

    microGoalOuts.push({
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      scopeType: goal.scopeType,
      scopeRefId: goal.scopeRefId,
      limitAmount,
      startDate: goal.startDate.toISOString(),
      endDate: goal.endDate.toISOString(),
      status: newStatus,
      currentAmount,
      expectedPace,
      createdAt: goal.createdAt.toISOString(),
    })
  }

  // Flush status updates
  await Promise.all(microGoalStatusUpdates)

  // ── Upsert all candidates to DB ────────────────────────────────────────────
  const allCandidates = [...candidates, ...microGoalCandidates]
  const activeCandidateKeys = new Set(allCandidates.map((c) => c.dedupeKey))

  // Resolve previously ACTIVE insights whose condition no longer holds
  if (activeCandidateKeys.size > 0) {
    await prisma.insight.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
        dedupeKey: { notIn: Array.from(activeCandidateKeys) },
      },
      data: { status: 'RESOLVED' },
    })
  } else {
    await prisma.insight.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'RESOLVED' },
    })
  }

  // Fetch existing insights to respect DISMISSED/SNOOZED status
  const existingInsights = activeCandidateKeys.size > 0
    ? await prisma.insight.findMany({
        where: { userId, dedupeKey: { in: Array.from(activeCandidateKeys) } },
        select: { id: true, dedupeKey: true, status: true },
      })
    : []
  const existingByKey = new Map(existingInsights.map((ins) => [ins.dedupeKey, ins]))

  for (const c of allCandidates) {
    const ctxWithAction = { ...c.context, suggestedAction: c.suggestedAction }
    const existing = existingByKey.get(c.dedupeKey)

    if (!existing) {
      // New insight — create as ACTIVE
      await prisma.insight.create({
        data: {
          userId,
          type: c.type,
          severity: c.severity,
          status: 'ACTIVE',
          title: c.title,
          message: c.message,
          explanation: c.explanation ?? null,
          context: ctxWithAction,
          cta: c.cta as object,
          dedupeKey: c.dedupeKey,
          validFrom: now,
          validTo: c.validTo,
        },
      })
    } else if (existing.status === 'DISMISSED' || existing.status === 'SNOOZED') {
      // User acted on this insight — update content but preserve status
      await prisma.insight.update({
        where: { id: existing.id },
        data: {
          severity: c.severity,
          title: c.title,
          message: c.message,
          explanation: c.explanation ?? null,
          context: ctxWithAction,
          cta: c.cta as object,
          validTo: c.validTo,
        },
      })
    } else {
      // ACTIVE or RESOLVED — re-activate with fresh content
      await prisma.insight.update({
        where: { id: existing.id },
        data: {
          severity: c.severity,
          status: 'ACTIVE',
          title: c.title,
          message: c.message,
          explanation: c.explanation ?? null,
          context: ctxWithAction,
          cta: c.cta as object,
          validTo: c.validTo,
        },
      })
    }
  }

  // ── Read ACTIVE + SNOOZED insights from DB ────────────────────────────────
  const dbInsights = await prisma.insight.findMany({
    where: {
      userId,
      OR: [
        { status: 'ACTIVE' },
        { status: 'SNOOZED', snoozedUntil: { gt: now } },
      ],
    },
  })

  const insightOuts: InsightOut[] = dbInsights
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2))
    .map((ins) => {
      const ctx = (ins.context ?? {}) as Record<string, unknown>
      return {
        id: ins.id,
        type: ins.type,
        severity: ins.severity,
        status: ins.status,
        title: ins.title,
        message: ins.message,
        explanation: ins.explanation,
        suggestedAction: (ctx.suggestedAction as string | undefined) ?? '',
        cta: ins.cta as InsightCTA | null,
        dataContext: ctx,
        snoozedUntil: ins.snoozedUntil?.toISOString() ?? null,
        createdAt: ins.createdAt.toISOString(),
      }
    })

  // ── Alerts ────────────────────────────────────────────────────────────────
  const spendingMapAlert = new Map(
    spendingByCategory.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]),
  )
  const budgetExceeded = budgets.some(
    (b) => (spendingMapAlert.get(b.categoryId) ?? 0) > Number(b.amount),
  )

  const overdueLiabilities = liabilities.filter(
    (l) => l.dueDate && new Date(l.dueDate) < today && Number(l.currentBalance) > 0,
  ).length

  const futureIncome = futureRecurring
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0)
  const futureExpense = futureRecurring
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0)
  const negativeBalanceProjection = liquidBalance + futureIncome - futureExpense < 0

  const hasEnoughData =
    avg3mIncome > 0 || avg3mExpense > 0 || liquidBalance > 0 || totalLiabilities > 0

  const result: InsightsResponse = {
    insights: insightOuts,
    microGoals: microGoalOuts,
    alerts: { budgetExceeded, overdueLiabilities, negativeBalanceProjection },
    hasEnoughData,
    evaluatedAt: now.toISOString(),
  }

  engineCache.set(userId, { data: result, computedAt: Date.now() })
  return result
}
