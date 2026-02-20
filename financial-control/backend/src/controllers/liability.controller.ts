import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

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
  return res.status(204).send()
}
