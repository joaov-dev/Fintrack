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

interface DuplicateCheckRow {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
}

// ── Duplicate detection ────────────────────────────────────────────────────────

export async function checkDuplicates(req: AuthRequest, res: Response) {
  const rows: DuplicateCheckRow[] = req.body.rows
  const userId = req.userId!

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.json({ duplicates: [] })
  }

  // Determine date range of the batch for an efficient single query
  const dates = rows
    .map((r) => new Date(r.date))
    .filter((d) => !isNaN(d.getTime()))

  if (dates.length === 0) return res.json({ duplicates: [] })

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  // Expand range by 1 day on each side to cover timezone edge cases
  minDate.setDate(minDate.getDate() - 1)
  maxDate.setDate(maxDate.getDate() + 1)

  const existing = await prisma.transaction.findMany({
    where: { userId, date: { gte: minDate, lte: maxDate } },
    select: { date: true, description: true, amount: true, type: true },
  })

  // Build a lookup key set: "YYYY-MM-DD|description_lower|amount|type"
  const existingKeys = new Set(
    existing.map((t) =>
      `${t.date.toISOString().slice(0, 10)}|${t.description.toLowerCase()}|${Number(t.amount)}|${t.type}`,
    ),
  )

  const duplicates: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const d = new Date(row.date)
    if (isNaN(d.getTime())) continue
    const key = `${d.toISOString().slice(0, 10)}|${row.description.toLowerCase()}|${Number(row.amount)}|${row.type}`
    if (existingKeys.has(key)) duplicates.push(i)
  }

  return res.json({ duplicates })
}

// ── Import ─────────────────────────────────────────────────────────────────────

export async function importTransactions(req: AuthRequest, res: Response) {
  const rows: ImportRow[] = req.body.rows
  const skipDuplicates: boolean = req.body.skipDuplicates === true
  const userId = req.userId!

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'Nenhuma linha para importar.' })
  }

  if (rows.length > 2000) {
    return res.status(400).json({ message: 'Máximo de 2000 linhas por importação.' })
  }

  // Batch-validate ownership
  const accountIds  = [...new Set(rows.map((r) => r.accountId).filter(Boolean))]
  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean))]

  const [ownedAccounts, ownedCategories] = await Promise.all([
    prisma.account.findMany({ where: { id: { in: accountIds }, userId }, select: { id: true } }),
    prisma.category.findMany({ where: { id: { in: categoryIds }, userId }, select: { id: true } }),
  ])

  const validAccountIds  = new Set(ownedAccounts.map((a) => a.id))
  const validCategoryIds = new Set(ownedCategories.map((c) => c.id))

  // Build duplicate key set if skipDuplicates is requested
  let existingKeys: Set<string> = new Set()
  if (skipDuplicates) {
    const dates = rows.map((r) => new Date(r.date)).filter((d) => !isNaN(d.getTime()))
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
      minDate.setDate(minDate.getDate() - 1)
      maxDate.setDate(maxDate.getDate() + 1)
      const existing = await prisma.transaction.findMany({
        where: { userId, date: { gte: minDate, lte: maxDate } },
        select: { date: true, description: true, amount: true, type: true },
      })
      existingKeys = new Set(
        existing.map((t) =>
          `${t.date.toISOString().slice(0, 10)}|${t.description.toLowerCase()}|${Number(t.amount)}|${t.type}`,
        ),
      )
    }
  }

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
  let skippedDuplicates = 0

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
    if (row.amount == null || Number(row.amount) <= 0) rowErrors.push('valor inválido')
    if (!['INCOME', 'EXPENSE'].includes(row.type)) rowErrors.push('tipo deve ser INCOME ou EXPENSE')
    if (!validAccountIds.has(row.accountId)) rowErrors.push('conta inválida ou sem permissão')
    if (!validCategoryIds.has(row.categoryId)) rowErrors.push('categoria inválida ou sem permissão')

    if (rowErrors.length > 0) {
      errors.push({ index: i, message: rowErrors.join('; ') })
      continue
    }

    // Skip duplicates if requested
    if (skipDuplicates) {
      const d = new Date(row.date)
      const key = `${d.toISOString().slice(0, 10)}|${row.description.toLowerCase()}|${Number(row.amount)}|${row.type}`
      if (existingKeys.has(key)) { skippedDuplicates++; continue }
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

  let imported = 0
  if (toInsert.length > 0) {
    const result = await prisma.transaction.createMany({ data: toInsert })
    imported = result.count
  }

  return res.json({
    imported,
    skipped: errors.length + skippedDuplicates,
    skippedDuplicates,
    errors,
  })
}
