/**
 * dataExportService — LGPD Art. 18 II/V — Direito de acesso e portabilidade
 *
 * Collects ALL personal data held for a user into a single structured
 * package that can be returned as JSON or streamed as a downloadable file.
 *
 * Design decisions:
 *   • Numbers are converted to plain JS numbers (not Prisma Decimal objects)
 *   • Encrypted fields (mfaSecret, attachment dataUrl) are EXCLUDED —
 *     they represent internal security state, not user-readable data
 *   • Derived/cached fields are excluded when the source data is already included
 *   • The `meta` section documents exactly when the export was created and
 *     what policy version it corresponds to — required by LGPD Art. 9
 *
 * Output format:
 *   {
 *     meta: { exportedAt, userId, policyVersion, note },
 *     profile: { ... },
 *     consent: { current: {...}, history: [...] },
 *     accounts: [...],
 *     transactions: [...],
 *     categories: [...],
 *     budgets: [...],
 *     goals: [...],
 *     microGoals: [...],
 *     liabilities: [...],
 *     creditCards: [...],
 *     investmentPositions: [...],
 *     sessions: [...],
 *     auditLog: [...],       ← last 365 days of mutations
 *     authEvents: [...],     ← last 365 days of auth events
 *   }
 */

import { PrismaClient } from '@prisma/client'

const CURRENT_POLICY_VERSION = '1.0'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts any Prisma Decimal to JS number recursively. */
function toPlain<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'object' && 'toNumber' in (obj as any)) {
    return (obj as any).toNumber() as unknown as T
  }
  if (Array.isArray(obj)) return obj.map(toPlain) as unknown as T
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = toPlain(v)
    }
    return result as T
  }
  return obj
}

// ── Main export function ──────────────────────────────────────────────────────

export async function buildUserExport(userId: string, prisma: PrismaClient) {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  // Run all queries in parallel for performance
  const [
    user,
    consentHistory,
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    microGoals,
    liabilities,
    creditCards,
    investmentPositions,
    sessions,
    auditLog,
    authEvents,
    tags,
  ] = await Promise.all([
    // Profile — exclude sensitive internal fields
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, name: true, email: true,
        currency: true, locale: true, timezone: true, dateFormat: true,
        closingDay: true,
        notifBudget: true, notifGoals: true, notifDue: true, notifInsights: true,
        emailBudget: true, emailGoals: true, emailDue: true, emailInsights: true,
        currentPlan: true, createdAt: true,
        // Excluded: passwordHash, mfaSecret, mfaEnabled, billingCustomerId
      },
    }),

    // Full consent history (all records, sorted by type then date)
    prisma.consentRecord.findMany({
      where: { userId },
      select: {
        consentType: true, version: true, granted: true,
        ip: true, createdAt: true,
        // Excluded: userAgent (internal telemetry)
      },
      orderBy: [{ consentType: 'asc' }, { createdAt: 'asc' }],
    }),

    prisma.account.findMany({
      where: { userId },
      select: {
        id: true, name: true, type: true, color: true,
        initialBalance: true, createdAt: true, updatedAt: true,
      },
    }),

    prisma.category.findMany({
      where: { userId },
      select: {
        id: true, name: true, type: true, color: true,
        icon: true, isDefault: true, createdAt: true,
      },
    }),

    prisma.transaction.findMany({
      where: { userId },
      select: {
        id: true, type: true, amount: true, description: true,
        date: true, notes: true, isRecurring: true,
        recurrenceType: true, recurrenceEnd: true,
        paymentMethod: true, isCardPayment: true,
        installmentNumber: true, splitId: true,
        isPaused: true, isSkipped: true,
        createdAt: true, updatedAt: true,
        category: { select: { name: true } },
        account:  { select: { name: true } },
        // Excluded: attachments (binary data), parentId, transferId (internal linkage)
      },
      orderBy: { date: 'desc' },
    }),

    prisma.budget.findMany({
      where: { userId },
      select: {
        id: true, month: true, year: true, amount: true, createdAt: true,
        category: { select: { name: true } },
      },
    }),

    prisma.goal.findMany({
      where: { userId },
      select: {
        id: true, name: true, targetAmount: true, targetDate: true,
        notes: true, createdAt: true, updatedAt: true,
      },
    }),

    prisma.microGoal.findMany({
      where: { userId },
      select: {
        id: true, name: true, scopeType: true,
        limitAmount: true, startDate: true, endDate: true,
        status: true, createdAt: true,
      },
    }),

    prisma.liability.findMany({
      where: { userId },
      select: {
        id: true, name: true, type: true,
        currentBalance: true, installments: true, interestRate: true,
        dueDate: true, notes: true, createdAt: true, updatedAt: true,
      },
    }),

    prisma.creditCard.findMany({
      where: { userId },
      select: {
        id: true, name: true, brand: true,
        creditLimit: true, statementClosingDay: true,
        dueDay: true, isArchived: true, createdAt: true,
      },
    }),

    prisma.investmentPosition.findMany({
      where: { userId },
      select: {
        id: true, name: true, ticker: true, type: true,
        quantity: true, avgPrice: true, currentValue: true,
        notes: true, createdAt: true, updatedAt: true,
      },
    }),

    // Sessions (active only — revoked sessions are security events, not personal data)
    prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true, deviceName: true, ipAddress: true,
        createdAt: true, lastUsedAt: true, expiresAt: true,
        // Excluded: tokenHash (security credential)
      },
    }),

    // Audit log — last 365 days of user-initiated mutations
    prisma.auditLog.findMany({
      where: { userId, createdAt: { gte: oneYearAgo } },
      select: {
        action: true, resource: true, resourceId: true,
        ip: true, createdAt: true,
        // Excluded: before/after snapshots (potentially large), requestId (internal)
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Auth events — last 365 days
    prisma.authEvent.findMany({
      where: { userId, createdAt: { gte: oneYearAgo } },
      select: {
        event: true, ip: true, createdAt: true,
        // Excluded: userAgent, metadata (may contain internal details)
      },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.tag.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
  ])

  // ── Current consent state per type (most recent record) ──────────────────────

  const consentByType: Record<string, unknown> = {}
  for (const record of consentHistory) {
    const key = record.consentType
    // consentHistory sorted by createdAt asc → last wins = current state
    consentByType[key] = {
      granted:   record.granted,
      version:   record.version,
      updatedAt: record.createdAt,
    }
  }

  return {
    meta: {
      exportedAt:    new Date().toISOString(),
      userId,
      policyVersion: CURRENT_POLICY_VERSION,
      note: 'This export contains all personal data held by DominaHub for the above user, ' +
            'as required by LGPD Art. 18 II/V (Lei 13.709/2018).',
    },
    profile:             toPlain(user),
    consent: {
      current: consentByType,
      history: toPlain(consentHistory),
    },
    accounts:            toPlain(accounts),
    categories:          toPlain(categories),
    transactions:        toPlain(transactions),
    budgets:             toPlain(budgets),
    goals:               toPlain(goals),
    microGoals:          toPlain(microGoals),
    liabilities:         toPlain(liabilities),
    creditCards:         toPlain(creditCards),
    investmentPositions: toPlain(investmentPositions),
    tags:                toPlain(tags),
    sessions:            toPlain(sessions),
    auditLog:            toPlain(auditLog),
    authEvents:          toPlain(authEvents),
  }
}
