import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import {
  listCreditCards,
  createCreditCard,
  updateCreditCard,
  archiveCreditCard,
} from '../services/creditCardService'

const creditCardSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  creditLimit: z.number().positive(),
  statementClosingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export async function listCreditCardsHandler(req: AuthRequest, res: Response) {
  const cards = await listCreditCards(req.userId!, prisma)
  return res.json(cards)
}

export async function createCreditCardHandler(req: AuthRequest, res: Response) {
  const data = creditCardSchema.parse(req.body)
  const card = await createCreditCard(req.userId!, data, prisma)
  return res.status(201).json(card)
}

export async function updateCreditCardHandler(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = creditCardSchema.partial().parse(req.body)
  try {
    const card = await updateCreditCard(req.userId!, id, data, prisma)
    return res.json(card)
  } catch {
    return res.status(404).json({ error: 'Cartão não encontrado' })
  }
}

export async function archiveCreditCardHandler(req: AuthRequest, res: Response) {
  const { id } = req.params
  try {
    await archiveCreditCard(req.userId!, id, prisma)
    return res.status(204).send()
  } catch {
    return res.status(404).json({ error: 'Cartão não encontrado' })
  }
}
