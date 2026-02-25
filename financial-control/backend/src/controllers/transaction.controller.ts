import { Response } from 'express'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { getOrCreateStatement, recalculateStatement } from '../services/cardStatementService'
import { getInstallmentDate } from '../services/billingCycleUtils'
import { suggestFromRules } from '../services/categorizationRules.service'

// ── Shared include for all transaction responses ───────────────────────────────

const TX_INCLUDE = {
  category: true,
  account: true,
  statement: true,
  tags: { select: { id: true, name: true } },
  attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
} as const

// ── Schemas ────────────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  categoryId: z.string().cuid(),
  accountId: z.string().cuid().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  recurrenceEnd: z.string().datetime().optional().nullable(),
  // Credit card fields
  paymentMethod: z.enum(['CASH', 'DEBIT', 'PIX', 'CREDIT_CARD', 'TRANSFER']).optional().nullable(),
  creditCardId: z.string().cuid().optional().nullable(),
  installments: z.number().int().min(1).max(48).optional().default(1),
})

const splitSchema = z.object({
  description: z.string().min(1),
  date: z.string().datetime(),
  type: z.enum(['INCOME', 'EXPENSE']),
  accountId: z.string().cuid().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'DEBIT', 'PIX', 'CREDIT_CARD', 'TRANSFER']).optional().nullable(),
  creditCardId: z.string().cuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  parts: z.array(z.object({
    categoryId: z.string().cuid(),
    amount: z.number().positive(),
    description: z.string().optional(),
  })).min(2, 'Rateio requer ao menos 2 partes'),
})

const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  dataUrl: z.string().min(1),  // base64 data URL
})

// ── Tag upsert helper ──────────────────────────────────────────────────────────

async function upsertTags(tagNames: string[], userId: string) {
  const results = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { userId_name: { userId, name: name.toLowerCase() } },
        create: { userId, name: name.toLowerCase() },
        update: {},
        select: { id: true },
      }),
    ),
  )
  return results.map((t) => ({ id: t.id }))
}

// ── Recurring generation ───────────────────────────────────────────────────────

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

// ── List ───────────────────────────────────────────────────────────────────────

export async function listTransactions(req: AuthRequest, res: Response) {
  const {
    month, year, type, categoryId, accountId, search, isRecurring, startDate, endDate,
    creditCardId, statementId, paymentMethod, includeCardPayments,
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
    const end   = new Date(Number(year), Number(month), 0, 23, 59, 59, 999)
    where.date = { gte: start, lte: end }
  } else if (startDate && endDate) {
    where.date = { gte: new Date(String(startDate)), lte: new Date(String(endDate)) }
  }

  if (type)        where.type        = type
  if (categoryId)  where.categoryId  = categoryId
  if (accountId)   where.accountId   = accountId
  if (creditCardId) where.creditCardId = creditCardId
  if (statementId) where.statementId = statementId
  if (paymentMethod) where.paymentMethod = paymentMethod
  if (includeCardPayments !== 'true') where.isCardPayment = { not: true }

  // Full-text search: description OR notes OR tag name
  if (search) {
    const s = String(search)
    where.OR = [
      { description: { contains: s, mode: 'insensitive' } },
      { notes:       { contains: s, mode: 'insensitive' } },
      { tags:        { some: { name: { contains: s, mode: 'insensitive' } } } },
    ]
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: TX_INCLUDE,
    orderBy: { date: 'desc' },
  })

  return res.json(transactions)
}

// ── Create ─────────────────────────────────────────────────────────────────────

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

  // Prepare tags connect-or-create
  const tagConnect = data.tags?.length
    ? { tags: { connect: await upsertTags(data.tags, userId) } }
    : {}

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
            ...(i === 1 ? tagConnect : {}),
          },
          include: TX_INCLUDE,
        })
        createdTxs.push(tx)
        await recalculateStatement(statementId, prisma)
      }

      return res.status(201).json(createdTxs[0])
    } else {
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
          ...tagConnect,
        },
        include: TX_INCLUDE,
      })
      await recalculateStatement(statementId, prisma)
      return res.status(201).json(transaction)
    }
  }

  // ── Regular transaction ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { installments: _inst, tags: _tags, ...restData } = data
  const transaction = await prisma.transaction.create({
    data: {
      ...restData,
      userId,
      date: new Date(data.date),
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      ...tagConnect,
    },
    include: TX_INCLUDE,
  })
  return res.status(201).json(transaction)
}

// ── Create Split Transaction (rateio) ──────────────────────────────────────────

export async function createSplitTransaction(req: AuthRequest, res: Response) {
  const data = splitSchema.parse(req.body)
  const userId = req.userId!

  if (data.accountId) {
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } })
    if (!account) return res.status(400).json({ error: 'Conta inválida' })
  }

  for (const part of data.parts) {
    const cat = await prisma.category.findFirst({ where: { id: part.categoryId, userId } })
    if (!cat) return res.status(400).json({ error: `Categoria inválida: ${part.categoryId}` })
  }

  const splitId = randomUUID()
  const txDate  = new Date(data.date)
  const created = []

  for (const part of data.parts) {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        categoryId:    part.categoryId,
        type:          data.type,
        amount:        part.amount,
        description:   part.description ?? data.description,
        date:          txDate,
        notes:         data.notes ?? null,
        accountId:     data.accountId ?? null,
        paymentMethod: data.paymentMethod ?? null,
        creditCardId:  data.creditCardId ?? null,
        splitId,
      },
      include: TX_INCLUDE,
    })
    created.push(tx)
  }

  return res.status(201).json(created)
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateTransaction(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = transactionSchema.partial().parse(req.body)

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: req.userId } })
    if (!category) return res.status(400).json({ error: 'Categoria inválida' })
  }

  // Prepare tag update (replace all tags if provided)
  const tagUpdate = data.tags !== undefined
    ? { tags: { set: await upsertTags(data.tags ?? [], req.userId!) } }
    : {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { installments: _inst2, tags: _tags2, ...updateData } = data
  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...updateData,
      date: data.date ? new Date(data.date) : undefined,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      ...tagUpdate,
    },
    include: TX_INCLUDE,
  })

  if (transaction.statementId && (data.amount !== undefined || data.date !== undefined)) {
    await recalculateStatement(transaction.statementId, prisma)
  }

  return res.json(updated)
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteTransaction(req: AuthRequest, res: Response) {
  const { id } = req.params
  const deleteAll = req.query.deleteAll === 'true'

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  // Delete all parts of a split group
  if (deleteAll && transaction.splitId) {
    await prisma.transaction.deleteMany({ where: { splitId: transaction.splitId, userId: req.userId } })
    return res.status(204).send()
  }

  if (transaction.isRecurring) {
    await prisma.transaction.deleteMany({ where: { parentId: id } })
  }

  await prisma.transaction.delete({ where: { id } })

  if (transaction.statementId) {
    await recalculateStatement(transaction.statementId, prisma)
  }

  return res.status(204).send()
}

// ── Suggest category from rules ────────────────────────────────────────────────

export async function suggestCategory(req: AuthRequest, res: Response) {
  const { description } = req.query
  if (!description) return res.json(null)

  const suggestion = await suggestFromRules(String(description), req.userId!, prisma)
  return res.json(suggestion)
}

// ── Attachments ────────────────────────────────────────────────────────────────

export async function addAttachment(req: AuthRequest, res: Response) {
  const { id } = req.params
  const { filename, mimeType, dataUrl } = attachmentSchema.parse(req.body)

  const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' })

  // Estimate size from base64 length
  const base64Data = dataUrl.split(',')[1] ?? dataUrl
  const size = Math.round(base64Data.length * 0.75)

  const attachment = await prisma.transactionAttachment.create({
    data: { transactionId: id, userId: req.userId!, filename, mimeType, size, dataUrl },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
  })
  return res.status(201).json(attachment)
}

export async function getAttachment(req: AuthRequest, res: Response) {
  const { id, aid } = req.params

  const attachment = await prisma.transactionAttachment.findFirst({
    where: { id: aid, transactionId: id, userId: req.userId },
  })
  if (!attachment) return res.status(404).json({ error: 'Anexo não encontrado' })

  return res.json(attachment)
}

export async function deleteAttachment(req: AuthRequest, res: Response) {
  const { id, aid } = req.params

  const attachment = await prisma.transactionAttachment.findFirst({
    where: { id: aid, transactionId: id, userId: req.userId },
  })
  if (!attachment) return res.status(404).json({ error: 'Anexo não encontrado' })

  await prisma.transactionAttachment.delete({ where: { id: aid } })
  return res.status(204).send()
}

// ── List tags (for autocomplete) ───────────────────────────────────────────────

export async function listTags(req: AuthRequest, res: Response) {
  const tags = await prisma.tag.findMany({
    where: { userId: req.userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return res.json(tags)
}
