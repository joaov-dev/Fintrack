import { PrismaClient } from '@prisma/client'
import { getBillingCycle } from './billingCycleUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameCycle(periodStart: Date, periodEnd: Date, existingStart: Date, existingEnd: Date) {
  return (
    periodStart.getTime() === existingStart.getTime() &&
    periodEnd.getTime() === existingEnd.getTime()
  )
}

// ─── Core service functions ────────────────────────────────────────────────────

/**
 * Finds or creates the CardStatement for the billing cycle that contains
 * the given transactionDate. Returns the statement id.
 */
export async function getOrCreateStatement(
  cardId: string,
  userId: string,
  transactionDate: Date,
  prisma: PrismaClient,
): Promise<string> {
  const card = await prisma.creditCard.findUnique({ where: { id: cardId } })
  if (!card) throw new Error('CARD_NOT_FOUND')

  const cycle = getBillingCycle(card.statementClosingDay, card.dueDay, transactionDate)

  // Look for existing statement that matches this cycle
  const existing = await prisma.cardStatement.findFirst({
    where: {
      cardId,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
    },
  })

  if (existing) return existing.id

  const created = await prisma.cardStatement.create({
    data: {
      userId,
      cardId,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      closingDate: cycle.closingDate,
      dueDate: cycle.dueDate,
      status: 'OPEN',
    },
  })

  return created.id
}

/**
 * Recalculates totalSpent/totalPaid for a statement from its transactions
 * and updates the status accordingly.
 */
export async function recalculateStatement(statementId: string, prisma: PrismaClient) {
  const txs = await prisma.transaction.findMany({
    where: { statementId },
    select: { amount: true, isCardPayment: true },
  })

  const totalSpent = txs
    .filter((t) => !t.isCardPayment)
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalPaid = txs
    .filter((t) => t.isCardPayment)
    .reduce((s, t) => s + Number(t.amount), 0)

  const statement = await prisma.cardStatement.findUnique({ where: { id: statementId } })
  if (!statement) return

  let status = statement.status
  const now = new Date()

  if (totalPaid >= totalSpent && totalSpent > 0) {
    status = 'PAID'
  } else if (statement.dueDate < now && totalSpent - totalPaid > 0) {
    status = 'OVERDUE'
  } else if (statement.closingDate < now && status === 'OPEN') {
    status = 'CLOSED'
  } else if (status === 'PAID' && totalPaid < totalSpent) {
    // Partial reversal
    status = statement.dueDate < now ? 'OVERDUE' : statement.closingDate < now ? 'CLOSED' : 'OPEN'
  }

  await prisma.cardStatement.update({
    where: { id: statementId },
    data: { totalSpent, totalPaid, status },
  })
}

export async function listStatements(userId: string, cardId: string, prisma: PrismaClient) {
  // Verify ownership
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
  if (!card) throw new Error('NOT_FOUND')

  const statements = await prisma.cardStatement.findMany({
    where: { cardId, userId },
    orderBy: { periodStart: 'desc' },
  })

  // Auto-update status: OPEN→CLOSED when closing date passed; CLOSED/OPEN→OVERDUE when due date passed with balance
  const now = new Date()
  const autoUpdates = statements
    .filter((s) => s.status !== 'PAID')
    .flatMap((s) => {
      const openBal = Number(s.totalSpent) - Number(s.totalPaid)
      if (openBal > 0 && s.dueDate < now && s.status !== 'OVERDUE') {
        return [prisma.cardStatement.update({ where: { id: s.id }, data: { status: 'OVERDUE' } })]
      }
      if (s.status === 'OPEN' && s.closingDate < now) {
        return [prisma.cardStatement.update({ where: { id: s.id }, data: { status: 'CLOSED' } })]
      }
      return []
    })
  if (autoUpdates.length) await Promise.all(autoUpdates)

  return statements.map((s) => ({
    ...s,
    totalSpent: Number(s.totalSpent),
    totalPaid: Number(s.totalPaid),
    openBalance: Number(s.totalSpent) - Number(s.totalPaid),
  }))
}

export async function getStatementDetail(
  userId: string,
  statementId: string,
  prisma: PrismaClient,
) {
  const statement = await prisma.cardStatement.findFirst({
    where: { id: statementId, userId },
  })
  if (!statement) throw new Error('NOT_FOUND')

  const [purchases, payments] = await Promise.all([
    prisma.transaction.findMany({
      where: { statementId, isCardPayment: false },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { statementId, isCardPayment: true },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    }),
  ])

  return {
    ...statement,
    totalSpent: Number(statement.totalSpent),
    totalPaid: Number(statement.totalPaid),
    openBalance: Number(statement.totalSpent) - Number(statement.totalPaid),
    transactions: purchases.map((t) => ({ ...t, amount: Number(t.amount) })),
    payments: payments.map((t) => ({ ...t, amount: Number(t.amount) })),
  }
}

export async function payStatement(
  userId: string,
  statementId: string,
  amount: number,
  fromAccountId: string,
  date: Date,
  categoryId: string,
  prisma: PrismaClient,
) {
  const statement = await prisma.cardStatement.findFirst({
    where: { id: statementId, userId },
    include: { card: true },
  })
  if (!statement) throw new Error('NOT_FOUND')
  if (amount <= 0) throw new Error('INVALID_AMOUNT')

  // Create payment transaction
  await prisma.transaction.create({
    data: {
      userId,
      categoryId,
      accountId: fromAccountId,
      creditCardId: statement.cardId,
      statementId,
      type: 'EXPENSE',
      amount,
      description: `Pagamento de Fatura — ${statement.card.name}`,
      date,
      isCardPayment: true,
      paymentMethod: 'DEBIT',
    },
  })

  await recalculateStatement(statementId, prisma)

  return getStatementDetail(userId, statementId, prisma)
}
