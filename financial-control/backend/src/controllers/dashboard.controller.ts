import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { calcAccountBalance, calcNetWorth } from '../services/netWorthService'
import { getCreditCardSummary } from '../services/creditCardService'
import { generateRecurringForMonth } from '../services/recurringService'

function toNumber(d: Decimal) {
  return Number(d)
}

export async function getSummary(req: AuthRequest, res: Response) {
  const now = new Date()
  const month = Number(req.query.month) || now.getMonth() + 1
  const year = Number(req.query.year) || now.getFullYear()

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)

  // Materialize recurring instances for this month before any query
  await generateRecurringForMonth(req.userId!, month, year, prisma)

  // Monthly transactions (exclude transfers, card bill payments and skipped recurring instances)
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId, date: { gte: start, lte: end }, transferId: null, isCardPayment: { not: true }, isSkipped: { not: true } },
    include: { category: true },
  })

  let totalIncome = 0
  let totalExpense = 0
  const byCategory: Record<string, { name: string; color: string; amount: number }> = {}

  for (const t of transactions) {
    const amount = toNumber(t.amount)
    if (t.type === 'INCOME') {
      totalIncome += amount
    } else {
      totalExpense += amount
      const catId = t.categoryId
      if (!byCategory[catId]) {
        byCategory[catId] = { name: t.category.name, color: t.category.color, amount: 0 }
      }
      byCategory[catId].amount += amount
    }
  }

  // Last 6 months bar chart
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

    const mTx = await prisma.transaction.findMany({
      where: { userId: req.userId, date: { gte: mStart, lte: mEnd }, transferId: null, isCardPayment: { not: true }, isSkipped: { not: true } },
      select: { type: true, amount: true },
    })

    let inc = 0
    let exp = 0
    for (const t of mTx) {
      if (t.type === 'INCOME') inc += toNumber(t.amount)
      else exp += toNumber(t.amount)
    }

    monthlyData.push({
      month: mStart.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      income: inc,
      expense: exp,
    })
  }

  // Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId: req.userId },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
    take: 5,
  })

  // Accounts with real-time balances
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
    include: {
      transactions: { select: { type: true, amount: true } },
      investmentPositions: { select: { currentValue: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const accountsWithBalance = accounts.map((acc) => {
    // Investment accounts: balance = market value of positions
    const balance = acc.type === 'INVESTMENT'
      ? acc.investmentPositions.reduce((s, p) => s + toNumber(p.currentValue), 0)
      : calcAccountBalance(
          toNumber(acc.initialBalance),
          acc.transactions.map((t) => ({ type: t.type, amount: toNumber(t.amount) })),
        )
    const { transactions: _, investmentPositions: __, ...rest } = acc
    return { ...rest, balance }
  })

  const totalBalance = accountsWithBalance.reduce((s, a) => s + a.balance, 0)

  // Liabilities total
  const liabilities = await prisma.liability.findMany({
    where: { userId: req.userId },
    select: { currentBalance: true },
  })
  const totalLiabilities = liabilities.reduce((s, l) => s + toNumber(l.currentBalance), 0)

  // Budgets for the month with spent amounts
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId, month, year },
    include: { category: true },
  })

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (b) => {
      const agg = await prisma.transaction.aggregate({
        where: {
          userId: req.userId,
          categoryId: b.categoryId,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
          transferId: null,
          isCardPayment: { not: true },
          isSkipped: { not: true },
        },
        _sum: { amount: true },
      })
      const spent = agg._sum.amount ? toNumber(agg._sum.amount) : 0
      const amount = toNumber(b.amount)
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        amount,
        spent,
        remaining: amount - spent,
        percentage: amount > 0 ? Math.min((spent / amount) * 100, 999) : 0,
      }
    }),
  )

  const creditCards = await getCreditCardSummary(req.userId!, prisma)

  return res.json({
    summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
    byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
    monthlyData,
    recentTransactions,
    accounts: accountsWithBalance,
    totalBalance,
    totalLiabilities,
    netWorth: calcNetWorth(totalBalance, totalLiabilities),
    budgets: budgetsWithSpent,
    creditCards,
  })
}
