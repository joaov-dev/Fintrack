import { PrismaClient } from '@prisma/client'

/** Returns the first Monday-Friday day from `d` onwards. */
function nextBusinessDay(d: Date): Date {
  const result = new Date(d)
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

/**
 * Ensures recurring transaction instances exist for the given month/year.
 * Idempotent — skips creation if an instance already exists for that period.
 *
 * Call this before any query that reads transactions for a specific month,
 * to guarantee recurring instances are materialized in the DB.
 */
export async function generateRecurringForMonth(
  userId: string,
  month: number,
  year: number,
  prisma: PrismaClient,
): Promise<void> {
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 0, 23, 59, 59, 999)

  const templates = await prisma.transaction.findMany({
    where: {
      userId,
      isRecurring: true,
      isPaused: false,
      date: { lt: start },
      OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: start } }],
    },
  })

  for (const tpl of templates) {
    if (!tpl.recurrenceType) continue

    // ── WEEKLY: one instance per matching weekday ─────────────────────────────
    if (tpl.recurrenceType === 'WEEKLY') {
      const targetDay = new Date(tpl.date).getDay()
      const d = new Date(year, month - 1, 1)
      while (d <= end) {
        if (d.getDay() === targetDay) {
          const dayStart = new Date(d)
          const dayEnd   = new Date(d.getTime() + 86399999)
          const exists = await prisma.transaction.findFirst({
            where: { parentId: tpl.id, date: { gte: dayStart, lte: dayEnd } },
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

    // ── Monthly, Yearly, Last Day, Business Days: one instance per month ──────
    const tplDate = new Date(tpl.date)
    let instanceDate: Date | null = null

    if (tpl.recurrenceType === 'MONTHLY') {
      const day = Math.min(tplDate.getDate(), new Date(year, month, 0).getDate())
      instanceDate = new Date(year, month - 1, day, 12)
    } else if (tpl.recurrenceType === 'YEARLY') {
      if (tplDate.getMonth() !== month - 1) continue
      instanceDate = new Date(year, month - 1, tplDate.getDate(), 12)
    } else if (tpl.recurrenceType === 'LAST_DAY') {
      const lastDay = new Date(year, month, 0).getDate()
      instanceDate = new Date(year, month - 1, lastDay, 12)
    } else if (tpl.recurrenceType === 'BUSINESS_DAYS') {
      instanceDate = nextBusinessDay(new Date(year, month - 1, 1, 12))
    }

    if (!instanceDate) continue

    const exists = await prisma.transaction.findFirst({
      where: { parentId: tpl.id, date: { gte: start, lte: end } },
    })
    if (exists) continue

    await prisma.transaction.create({
      data: {
        userId: tpl.userId, categoryId: tpl.categoryId, accountId: tpl.accountId,
        type: tpl.type, amount: tpl.amount, description: tpl.description,
        notes: tpl.notes, date: instanceDate, isRecurring: false, parentId: tpl.id,
      },
    })
  }
}
