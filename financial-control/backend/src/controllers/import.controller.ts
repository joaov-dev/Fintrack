import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'

interface ImportRow {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  accountId: string
  categoryId: string
  notes?: string
}

export async function importTransactions(req: AuthRequest, res: Response) {
  const rows: ImportRow[] = req.body.rows
  const userId = req.userId!

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'Nenhuma linha para importar.' })
  }

  if (rows.length > 2000) {
    return res.status(400).json({ message: 'Máximo de 2000 linhas por importação.' })
  }

  // Collect unique IDs so we can batch-validate ownership in 2 queries
  const accountIds  = [...new Set(rows.map((r) => r.accountId).filter(Boolean))]
  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean))]

  const [ownedAccounts, ownedCategories] = await Promise.all([
    prisma.account.findMany({
      where: { id: { in: accountIds }, userId },
      select: { id: true },
    }),
    prisma.category.findMany({
      where: { id: { in: categoryIds }, userId },
      select: { id: true },
    }),
  ])

  const validAccountIds  = new Set(ownedAccounts.map((a) => a.id))
  const validCategoryIds = new Set(ownedCategories.map((c) => c.id))

  // ── Validate every row (pure, no DB) ──────────────────────────────────────

  type ValidRow = {
    userId: string
    date: Date
    description: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
    accountId: string
    categoryId: string
    notes: string | null
    isRecurring: boolean
  }

  const toInsert: ValidRow[] = []
  const errors: { index: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowErrors: string[] = []

    if (!row.date) {
      rowErrors.push('data ausente')
    } else {
      const d = new Date(row.date)
      if (isNaN(d.getTime())) rowErrors.push('data inválida')
    }

    if (!row.description?.trim()) rowErrors.push('descrição ausente')

    if (row.amount == null || Number(row.amount) <= 0) {
      rowErrors.push('valor inválido')
    }

    if (!['INCOME', 'EXPENSE'].includes(row.type)) {
      rowErrors.push('tipo deve ser INCOME ou EXPENSE')
    }

    if (!validAccountIds.has(row.accountId)) rowErrors.push('conta inválida ou sem permissão')
    if (!validCategoryIds.has(row.categoryId)) rowErrors.push('categoria inválida ou sem permissão')

    if (rowErrors.length > 0) {
      errors.push({ index: i, message: rowErrors.join('; ') })
      continue
    }

    toInsert.push({
      userId,
      date: new Date(row.date),
      description: row.description.trim(),
      amount: Number(row.amount),
      type: row.type,
      accountId: row.accountId,
      categoryId: row.categoryId,
      notes: row.notes?.trim() || null,
      isRecurring: false,
    })
  }

  // ── Bulk-insert valid rows in a single DB transaction ─────────────────────
  let imported = 0
  if (toInsert.length > 0) {
    const result = await prisma.transaction.createMany({ data: toInsert })
    imported = result.count
  }

  return res.json({ imported, skipped: errors.length, errors })
}
