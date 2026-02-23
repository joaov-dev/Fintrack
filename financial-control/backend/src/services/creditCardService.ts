import { PrismaClient } from '@prisma/client'

export interface CreditCardCreateInput {
  name: string
  brand?: string | null
  creditLimit: number
  statementClosingDay: number
  dueDay: number
  color?: string
}

export interface CreditCardUpdateInput {
  name?: string
  brand?: string | null
  creditLimit?: number
  statementClosingDay?: number
  dueDay?: number
  color?: string
}

/** Compute openBalance, availableLimit and utilizationPercent for a card. */
function computeCardMetrics(
  creditLimit: number,
  statements: { totalSpent: unknown; totalPaid: unknown }[],
) {
  const openBalance = statements.reduce(
    (sum, s) => sum + (Number(s.totalSpent) - Number(s.totalPaid)),
    0,
  )
  const availableLimit = Math.max(0, creditLimit - openBalance)
  const utilizationPercent = creditLimit > 0 ? openBalance / creditLimit : 0
  return { openBalance, availableLimit, utilizationPercent }
}

export async function listCreditCards(userId: string, prisma: PrismaClient) {
  const cards = await prisma.creditCard.findMany({
    where: { userId, isArchived: false },
    include: {
      statements: {
        where: { status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
        select: { totalSpent: true, totalPaid: true, dueDate: true, status: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return cards.map((card) => {
    const { openBalance, availableLimit, utilizationPercent } = computeCardMetrics(
      Number(card.creditLimit),
      card.statements,
    )

    // Next due statement: earliest dueDate with openBalance > 0
    const nextDue = card.statements
      .filter((s) => Number(s.totalSpent) - Number(s.totalPaid) > 0)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null

    return {
      id: card.id,
      userId: card.userId,
      name: card.name,
      brand: card.brand,
      creditLimit: Number(card.creditLimit),
      statementClosingDay: card.statementClosingDay,
      dueDay: card.dueDay,
      color: card.color,
      isArchived: card.isArchived,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      openBalance,
      availableLimit,
      utilizationPercent,
      nextDueDate: nextDue?.dueDate ?? null,
    }
  })
}

export async function createCreditCard(
  userId: string,
  data: CreditCardCreateInput,
  prisma: PrismaClient,
) {
  const card = await prisma.creditCard.create({
    data: {
      userId,
      name: data.name,
      brand: data.brand ?? null,
      creditLimit: data.creditLimit,
      statementClosingDay: data.statementClosingDay,
      dueDay: data.dueDay,
      color: data.color ?? '#6366f1',
    },
  })
  return { ...card, creditLimit: Number(card.creditLimit), openBalance: 0, availableLimit: Number(card.creditLimit), utilizationPercent: 0 }
}

export async function updateCreditCard(
  userId: string,
  cardId: string,
  data: CreditCardUpdateInput,
  prisma: PrismaClient,
) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
  if (!card) throw new Error('NOT_FOUND')

  return prisma.creditCard.update({
    where: { id: cardId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
      ...(data.statementClosingDay !== undefined && { statementClosingDay: data.statementClosingDay }),
      ...(data.dueDay !== undefined && { dueDay: data.dueDay }),
      ...(data.color !== undefined && { color: data.color }),
    },
  })
}

export async function archiveCreditCard(
  userId: string,
  cardId: string,
  prisma: PrismaClient,
) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } })
  if (!card) throw new Error('NOT_FOUND')

  return prisma.creditCard.update({
    where: { id: cardId },
    data: { isArchived: true },
  })
}

/** Returns aggregate credit card data for Dashboard widget. */
export async function getCreditCardSummary(userId: string, prisma: PrismaClient) {
  const cards = await listCreditCards(userId, prisma)
  if (cards.length === 0) return null

  const totalOpenBalance = cards.reduce((s, c) => s + c.openBalance, 0)
  const totalCreditLimit = cards.reduce((s, c) => s + c.creditLimit, 0)
  const totalAvailableLimit = cards.reduce((s, c) => s + c.availableLimit, 0)

  // Find the nearest upcoming due date with open balance
  const nextDue = cards
    .filter((c) => c.nextDueDate && c.openBalance > 0)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())[0]

  return {
    totalOpenBalance,
    totalCreditLimit,
    totalAvailableLimit,
    nextDueStatement: nextDue
      ? { cardName: nextDue.name, dueDate: nextDue.nextDueDate, openBalance: nextDue.openBalance }
      : null,
  }
}
