import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { audit } from '../lib/audit'

const liabilitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['LOAN', 'FINANCING', 'CREDIT_CARD', 'OTHER']),
  currentBalance: z.number().nonnegative(),
  installments: z.number().int().positive().optional().nullable(),
  interestRate: z.number().nonnegative().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function listLiabilities(req: AuthRequest, res: Response) {
  const liabilities = await prisma.liability.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'asc' },
  })
  return res.json(liabilities)
}

export async function createLiability(req: AuthRequest, res: Response) {
  const data = liabilitySchema.parse(req.body)
  const liability = await prisma.liability.create({
    data: {
      userId: req.userId!,
      name: data.name,
      type: data.type,
      currentBalance: data.currentBalance,
      installments: data.installments ?? null,
      interestRate: data.interestRate ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes ?? null,
    },
  })
  return res.status(201).json(liability)
}

export async function updateLiability(req: AuthRequest, res: Response) {
  const { id } = req.params
  const liability = await prisma.liability.findFirst({ where: { id, userId: req.userId } })
  if (!liability) return res.status(404).json({ error: 'Passivo não encontrado' })

  const data = liabilitySchema.parse(req.body)
  const updated = await prisma.liability.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      currentBalance: data.currentBalance,
      installments: data.installments ?? null,
      interestRate: data.interestRate ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes ?? null,
    },
  })
  return res.json(updated)
}

export async function deleteLiability(req: AuthRequest, res: Response) {
  const { id } = req.params
  const liability = await prisma.liability.findFirst({ where: { id, userId: req.userId } })
  if (!liability) return res.status(404).json({ error: 'Passivo não encontrado' })

  await prisma.liability.delete({ where: { id } })
  audit('LIABILITY_DELETE', req.userId!, req, { liabilityId: id, name: liability.name })
  return res.status(204).send()
}

const paySchema = z.object({
  installmentsPaid: z.number().int().positive().optional().nullable(),
  grossAmount: z.number().positive(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable(),
  discountValue: z.number().nonnegative().optional().nullable(),
  accountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  paidAt: z.string().datetime(),
})

export async function payLiability(req: AuthRequest, res: Response) {
  const { id } = req.params
  const userId = req.userId!

  const liability = await prisma.liability.findFirst({ where: { id, userId } })
  if (!liability) return res.status(404).json({ error: 'Passivo não encontrado' })

  const data = paySchema.parse(req.body)

  const grossAmount = data.grossAmount
  let discountAmount = 0
  if (data.discountType && data.discountValue && data.discountValue > 0) {
    discountAmount = data.discountType === 'PERCENTAGE'
      ? grossAmount * (data.discountValue / 100)
      : data.discountValue
  }
  const paidAmount = grossAmount - discountAmount

  if (paidAmount <= 0) {
    return res.status(400).json({ error: 'Valor a pagar deve ser positivo' })
  }
  if (grossAmount > Number(liability.currentBalance)) {
    return res.status(400).json({ error: 'Valor maior que o saldo atual do passivo' })
  }

  // Create expense transaction if account + category provided
  let transactionId: string | null = null
  if (data.accountId && data.categoryId) {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        categoryId: data.categoryId,
        accountId: data.accountId,
        type: 'EXPENSE',
        amount: paidAmount,
        description: `Pagamento: ${liability.name}`,
        date: new Date(data.paidAt),
        isRecurring: false,
      },
    })
    transactionId = tx.id
  }

  const [payment, updatedLiability] = await prisma.$transaction([
    prisma.liabilityPayment.create({
      data: {
        userId,
        liabilityId: id,
        installmentsPaid: data.installmentsPaid ?? null,
        grossAmount,
        discountType: data.discountType ?? null,
        discountValue: data.discountValue ?? null,
        discountAmount,
        paidAmount,
        accountId: data.accountId ?? null,
        categoryId: data.categoryId ?? null,
        transactionId,
        notes: data.notes ?? null,
        paidAt: new Date(data.paidAt),
      },
    }),
    prisma.liability.update({
      where: { id },
      data: { currentBalance: { decrement: grossAmount } },
    }),
  ])

  return res.status(201).json({ payment, liability: updatedLiability })
}

export async function listLiabilityPayments(req: AuthRequest, res: Response) {
  const { id } = req.params
  const userId = req.userId!

  const liability = await prisma.liability.findFirst({ where: { id, userId } })
  if (!liability) return res.status(404).json({ error: 'Passivo não encontrado' })

  const payments = await prisma.liabilityPayment.findMany({
    where: { liabilityId: id, userId },
    orderBy: { paidAt: 'desc' },
  })
  return res.json(payments)
}
