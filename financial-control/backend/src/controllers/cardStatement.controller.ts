import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import {
  listStatements,
  getStatementDetail,
  payStatement,
} from '../services/cardStatementService'

const paymentSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string().cuid(),
  date: z.string().datetime(),
  categoryId: z.string().cuid(),
})

export async function listStatementsHandler(req: AuthRequest, res: Response) {
  const { id: cardId } = req.params
  try {
    const statements = await listStatements(req.userId!, cardId, prisma)
    return res.json(statements)
  } catch {
    return res.status(404).json({ error: 'Cartão não encontrado' })
  }
}

export async function getStatementDetailHandler(req: AuthRequest, res: Response) {
  const { sid } = req.params
  try {
    const detail = await getStatementDetail(req.userId!, sid, prisma)
    return res.json(detail)
  } catch {
    return res.status(404).json({ error: 'Fatura não encontrada' })
  }
}

export async function payStatementHandler(req: AuthRequest, res: Response) {
  const { sid } = req.params
  const { amount, fromAccountId, date, categoryId } = paymentSchema.parse(req.body)

  try {
    const detail = await payStatement(
      req.userId!,
      sid,
      amount,
      fromAccountId,
      new Date(date),
      categoryId,
      prisma,
    )
    return res.json(detail)
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Fatura não encontrada' })
      if (err.message === 'INVALID_AMOUNT') return res.status(400).json({ error: 'Valor inválido' })
    }
    throw err
  }
}
