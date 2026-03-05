import { prisma } from '../services/prisma'

// ── Resource type registry ─────────────────────────────────────────────────────

/**
 * Maps a semantic resource name to the corresponding Prisma delegate.
 * Add new entries here as the schema grows — every route that exposes a /:id
 * param should have a corresponding entry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODEL_MAP: Record<string, { findFirst: (args: any) => Promise<unknown> }> = {
  account:            prisma.account,
  category:           prisma.category,
  transaction:        prisma.transaction,
  goal:               prisma.goal,
  budget:             prisma.budget,
  liability:          prisma.liability,
  creditCard:         prisma.creditCard,
  cardStatement:      prisma.cardStatement,
  microGoal:          prisma.microGoal,
  categorizationRule: prisma.categorizationRule,
  investmentPosition: prisma.investmentPosition,
  attachment:         prisma.transactionAttachment,
}

export type ResourceType = keyof typeof MODEL_MAP

// ── assertOwns ─────────────────────────────────────────────────────────────────

/**
 * Verifies that the record identified by `id` exists **and** belongs to `userId`.
 *
 * - Returns the record on success.
 * - Throws a typed error on failure (caught by `ownedResource` middleware or
 *   the global error handler).
 *
 * Always returns HTTP 404 — never 403 — so the caller cannot infer whether the
 * resource exists but belongs to someone else (prevents user enumeration).
 *
 * Usage inside a controller (when you want both the ownership check and
 * the record in one query):
 *
 *   const tx = await assertOwns('transaction', req.params.id, req.userId!)
 *   // tx is guaranteed non-null and owned by this user
 */
export async function assertOwns(
  resource: ResourceType,
  id: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const model = MODEL_MAP[resource]
  if (!model) throw new Error(`Unknown resource type: "${resource}"`)

  const record = await model.findFirst({ where: { id, userId } })

  if (!record) {
    const err = new Error(`${resource} not found`) as Error & { status: number; code: string }
    err.status = 404
    err.code   = 'NOT_FOUND_OR_FORBIDDEN'
    throw err
  }

  return record as Record<string, unknown>
}
