import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { calcAccountBalance } from '../services/netWorthService'
import { audit } from '../lib/audit'

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
    include: {
      transactions: { select: { type: true, amount: true } },
      investmentPositions: { select: { currentValue: true } },
    },
  })

  const result = accounts.map((acc) => {
    // Investment accounts: balance = market value of positions, not transaction ledger
    const balance = acc.type === 'INVESTMENT'
      ? acc.investmentPositions.reduce((s, p) => s + toNumber(p.currentValue), 0)
      : calcAccountBalance(
          toNumber(acc.initialBalance),
          acc.transactions.map((t) => ({ type: t.type, amount: toNumber(t.amount) })),
        )
    const { transactions: _, investmentPositions: __, ...rest } = acc
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

  const updateSchema = accountSchema.partial().extend({
    balance: z.number().optional(), // target balance → recalculates initialBalance
  })
  const { balance: targetBalance, ...data } = updateSchema.parse(req.body)

  const account = await prisma.account.findFirst({ where: { id, userId: req.userId } })
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' })

  // If a target balance was supplied, back-calculate the initialBalance needed
  if (targetBalance !== undefined) {
    const txs = await prisma.transaction.findMany({
      where: { accountId: id },
      select: { type: true, amount: true },
    })
    const txSum = txs.reduce(
      (s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
      0,
    )
    data.initialBalance = targetBalance - txSum
  }

  const updated = await prisma.account.update({ where: { id }, data })

  // Return with computed balance for immediate UI consistency
  const computedBalance = calcAccountBalance(
    toNumber(updated.initialBalance),
    (await prisma.transaction.findMany({
      where: { accountId: id },
      select: { type: true, amount: true },
    })).map((t) => ({ type: t.type, amount: toNumber(t.amount) })),
  )
  return res.json({ ...updated, balance: computedBalance })
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
  audit('ACCOUNT_DELETE', req.userId!, req, { accountId: id, name: account.name })
  return res.status(204).send()
}
