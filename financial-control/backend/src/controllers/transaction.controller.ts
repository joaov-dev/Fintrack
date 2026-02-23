import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { getOrCreateStatement, recalculateStatement } from '../services/cardStatementService'
import { getInstallmentDate } from '../services/billingCycleUtils'

const transactionSchema = z.object({
  categoryId: z.string().cuid(),
  accountId: z.string().cuid().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  recurrenceEnd: z.string().datetime().optional().nullable(),
  // Credit card fields
  paymentMethod: z.enum(['CASH', 'DEBIT', 'PIX', 'CREDIT_CARD', 'TRANSFER']).optional().nullable(),
  creditCardId: z.string().cuid().optional().nullable(),
  installments: z.number().int().min(1).max(48).optional().default(1),
})

/** Auto-generates recurring transaction instances for a given month if they don't exist yet */
async function generateRecurringForMonth(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)

  const templates = await prisma.transaction.findMany({
    where: {
      userId,
      isRecurring: true,
      date: { lt: start },
      OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: start } }],
    },
  })

  for (const tpl of templates) {
    if (!tpl.recurrenceType) continue

    if (tpl.recurrenceType === 'WEEKLY') {
      const targetDay = new Date(tpl.date).getDay()
      const d = new Date(year, month - 1, 1)
      while (d <= end) {
        if (d.getDay() === targetDay) {
          const exists = await prisma.transaction.findFirst({
            where: {
              parentId: tpl.id,
              date: { gte: new Date(d), lte: new Date(d.getTime() + 86399999) },
            },
          })
          if (!exists) {
            await prisma.transaction.create({
              data: {
                userId: tpl.userId, categoryId: tpl.categoryId, accountId: tpl.accountId,
                type: tpl.type, amount: tpl.amount, description: tpl.description,
                notes: tpl.notes, date: new Date(d), isRecurring: false, parentId: tpl.id,
              },
            })
          }
        }
        d.setDate(d.getDate() + 1)
      }
      continue
    }

    const tplDate = new Date(tpl.date)
    let instanceDate: Date | null = null

    if (tpl.recurrenceType === 'MONTHLY') {
      const day = Math.min(tplDate.getDate(), new Date(year, month, 0).getDate())
      instanceDate = new Date(year, month - 1, day, 12)
    } else if (tpl.recurrenceType === 'YEARLY' && tplDate.getMonth() === month - 1) {
      instanceDate = new Date(year, month - 1, tplDate.getDate(), 12)
    }

    if (!instanceDate) continue

    const exists = await prisma.transaction.findFirst({
      where: { parentId: tpl.id, date: { gte: start, lte: end } },
    })
    if (!exists) {
      await prisma.transaction.create({
        data: {
          userId: tpl.userId, categoryId: tpl.categoryId, accountId: tpl.accountId,
          type: tpl.type, amount: tpl.amount, description: tpl.description,
          notes: tpl.notes, date: instanceDate, isRecurring: false, parentId: tpl.id,
        },
      })
    }
  }
}

export async function listTransactions(req: AuthRequest, res: Response) {
  const {
    month, year, type, categoryId, accountId, search, isRecurring, startDate, endDate,
    creditCardId, statementId, paymentMethod,
    includeCardPayments,
  } = req.query

  if (month && year && !isRecurring) {
    await generateRecurringForMonth(req.userId!, Number(month), Number(year))
  }

  const where: Record<string, unknown> = { userId: req.userId }

  if (isRecurring === 'true') {
    where.isRecurring = true
    where.parentId = null
  } else if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    where.date = { gte: start, lte: end }
  } else if (startDate && endDate) {
    where.date = { gte: new Date(String(startDate)), lte: new Date(String(endDate)) }
  }

  if (type) where.type = type
  if (categoryId) where.categoryId = categoryId
  if (accountId) where.accountId = accountId
  if (search) where.description = { contains: String(search), mode: 'insensitive' }
  if (creditCardId) where.creditCardId = creditCardId
  if (statementId) where.statementId = statementId
  if (paymentMethod) where.paymentMethod = paymentMethod
  // By default, hide card payment transactions (they are liability reductions, not expenses)
  if (includeCardPayments !== 'true') where.isCardPayment = { not: true }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true, statement: true },
    orderBy: { date: 'desc' },
  })

  return res.json(transactions)
}

export async function createTransaction(req: AuthRequest, res: Response) {
  const data = transactionSchema.parse(req.body)
  const userId = req.userId!

  const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId } })
  if (!category) return res.status(400).json({ error: 'Categoria inválida' })

  if (data.accountId) {
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } })
    if (!account) return res.status(400).json({ error: 'Conta inválida' })
  }

  if (data.isRecurring && !data.recurrenceType) {
    return res.status(400).json({ error: 'Informe o tipo de recorrência' })
  }

  // ── Credit card purchase ────────────────────────────────────────────────
  if (data.paymentMethod === 'CREDIT_CARD') {
    if (!data.creditCardId) {
      return res.status(400).json({ error: 'Informe o cartão de crédito' })
    }
    const card = await prisma.creditCard.findFirst({ where: { id: data.creditCardId, userId } })
    if (!card) return res.status(400).json({ error: 'Cartão de crédito inválido' })

    const txDate = new Date(data.date)
    const installments = data.installments ?? 1

    if (installments > 1) {
      // ── Parcelamento ────────────────────────────────────────────────────
      const installmentAmount = parseFloat((data.amount / installments).toFixed(2))
      const remainder = parseFloat((data.amount - installmentAmount * installments).toFixed(2))

      const plan = await prisma.installmentPlan.create({
        data: {
          userId,
          creditCardId: data.creditCardId,
          description: data.description,
          totalAmount: data.amount,
          totalInstallments: installments,
          installmentAmount,
          startDate: txDate,
        },
      })

      const createdTxs = []
      for (let i = 1; i <= installments; i++) {
        const instDate = getInstallmentDate(txDate, i)
        const statementId = await getOrCreateStatement(data.creditCardId, userId, instDate, prisma)
        const amount = i === 1 ? installmentAmount + remainder : installmentAmount

        const tx = await prisma.transaction.create({
          data: {
            userId,
            categoryId: data.categoryId,
            type: 'EXPENSE',
            amount,
            description: `${data.description} (${i}/${installments})`,
            date: instDate,
            notes: data.notes ?? null,
            paymentMethod: 'CREDIT_CARD',
            creditCardId: data.creditCardId,
            statementId,
            installmentPlanId: plan.id,
            installmentNumber: i,
          },
          include: { category: true, account: true, statement: true },
        })
        createdTxs.push(tx)
        await recalculateStatement(statementId, prisma)
      }

      return res.status(201).json(createdTxs[0])
    } else {
      // ── Compra à vista no cartão ────────────────────────────────────────
      const statementId = await getOrCreateStatement(data.creditCardId, userId, txDate, prisma)
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          categoryId: data.categoryId,
          type: 'EXPENSE',
          amount: data.amount,
          description: data.description,
          date: txDate,
          notes: data.notes ?? null,
          paymentMethod: 'CREDIT_CARD',
          creditCardId: data.creditCardId,
          statementId,
        },
        include: { category: true, account: true, statement: true },
      })
      await recalculateStatement(statementId, prisma)
      return res.status(201).json(transaction)
    }
  }

  // ── Regular transaction ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { installments: _installments, ...restData } = data
  const transaction = await prisma.transaction.create({
    data: {
      ...restData,
      userId,
      date: new Date(data.date),
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
    },
    include: { category: true, account: true },
  })
  return res.status(201).json(transaction)
}

export async function updateTransaction(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = transactionSchema.partial().parse(req.body)

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: req.userId } })
    if (!category) return res.status(400).json({ error: 'Categoria inválida' })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { installments: _installments2, ...updateData } = data
  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...updateData,
      date: data.date ? new Date(data.date) : undefined,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
    },
    include: { category: true, account: true, statement: true },
  })

  // Recalculate affected statement if amount changed
  if (transaction.statementId && (data.amount !== undefined || data.date !== undefined)) {
    await recalculateStatement(transaction.statementId, prisma)
  }

  return res.json(updated)
}

export async function deleteTransaction(req: AuthRequest, res: Response) {
  const { id } = req.params

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  if (transaction.isRecurring) {
    await prisma.transaction.deleteMany({ where: { parentId: id } })
  }

  await prisma.transaction.delete({ where: { id } })

  // Recalculate statement if this was a CC transaction
  if (transaction.statementId) {
    await recalculateStatement(transaction.statementId, prisma)
  }

  return res.status(204).send()
}
