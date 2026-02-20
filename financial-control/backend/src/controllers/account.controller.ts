import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { calcAccountBalance } from '../services/netWorthService'

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6366f1'),
  initialBalance: z.number().optional().default(0),
})

function toNumber(d: Decimal) {
  return Number(d)
}

export async function listAccounts(req: AuthRequest, res: Response) {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'asc' },
    include: { transactions: { select: { type: true, amount: true } } },
  })

  const result = accounts.map((acc) => {
    const balance = calcAccountBalance(
      toNumber(acc.initialBalance),
      acc.transactions.map((t) => ({ type: t.type, amount: toNumber(t.amount) })),
    )
    const { transactions: _, ...rest } = acc
    return { ...rest, balance }
  })

  return res.json(result)
}

export async function createAccount(req: AuthRequest, res: Response) {
  const data = accountSchema.parse(req.body)
  const account = await prisma.account.create({
    data: { ...data, userId: req.userId! },
  })
  return res.status(201).json({ ...account, balance: toNumber(account.initialBalance) })
}

export async function updateAccount(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = accountSchema.partial().parse(req.body)

  const account = await prisma.account.findFirst({ where: { id, userId: req.userId } })
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' })

  const updated = await prisma.account.update({ where: { id }, data })
  return res.json(updated)
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  const { id } = req.params

  const account = await prisma.account.findFirst({ where: { id, userId: req.userId } })
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' })

  const txCount = await prisma.transaction.count({ where: { accountId: id } })
  if (txCount > 0) {
    return res.status(400).json({
      error: 'Não é possível excluir uma conta com transações. Remova as transações primeiro.',
    })
  }

  await prisma.account.delete({ where: { id } })
  return res.status(204).send()
}
