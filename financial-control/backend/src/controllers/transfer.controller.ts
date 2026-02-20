import { Response } from 'express'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

const transferSchema = z.object({
  fromAccountId: z.string().cuid(),
  toAccountId: z.string().cuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().optional(),
})

export async function createTransfer(req: AuthRequest, res: Response) {
  const data = transferSchema.parse(req.body)

  if (data.fromAccountId === data.toAccountId) {
    return res.status(400).json({ error: 'Conta de origem e destino devem ser diferentes' })
  }

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.fromAccountId, userId: req.userId } }),
    prisma.account.findFirst({ where: { id: data.toAccountId, userId: req.userId } }),
  ])

  if (!fromAccount) return res.status(404).json({ error: 'Conta de origem não encontrada' })
  if (!toAccount) return res.status(404).json({ error: 'Conta de destino não encontrada' })

  let transferCategory = await prisma.category.findFirst({
    where: { userId: req.userId, name: 'Transferência' },
  })
  if (!transferCategory) {
    transferCategory = await prisma.category.create({
      data: {
        userId: req.userId!,
        name: 'Transferência',
        type: 'INCOME',
        color: '#a78bfa',
        icon: 'arrow-left-right',
        isDefault: true,
      },
    })
  }

  const transferId = randomUUID()
  const date = new Date(data.date)
  const amount = data.amount

  const [from, to] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: req.userId!,
        categoryId: transferCategory.id,
        accountId: data.fromAccountId,
        type: 'EXPENSE',
        amount,
        description: data.description || `Transferência → ${toAccount.name}`,
        date,
        transferId,
      },
      include: { category: true, account: true },
    }),
    prisma.transaction.create({
      data: {
        userId: req.userId!,
        categoryId: transferCategory.id,
        accountId: data.toAccountId,
        type: 'INCOME',
        amount,
        description: data.description || `Transferência ← ${fromAccount.name}`,
        date,
        transferId,
      },
      include: { category: true, account: true },
    }),
  ])

  return res.status(201).json({ from, to, transferId })
}

export async function deleteTransfer(req: AuthRequest, res: Response) {
  const { transferId } = req.params

  const txs = await prisma.transaction.findMany({
    where: { transferId, userId: req.userId },
  })

  if (txs.length === 0) {
    return res.status(404).json({ error: 'Transferência não encontrada' })
  }

  await prisma.transaction.deleteMany({ where: { transferId, userId: req.userId } })
  return res.status(204).send()
}
