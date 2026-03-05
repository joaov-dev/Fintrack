/**
 * Parses `page` and `limit` from a request query object and returns
 * Prisma-compatible `{ skip, take }` values.
 *
 * Rules:
 *  - `limit` is clamped to [1, maxLimit]. Default = maxLimit.
 *  - `page`  is clamped to [1, ∞).       Default = 1.
 *
 * Usage:
 *   const { skip, take } = parsePagination(req.query)
 *   const rows = await prisma.foo.findMany({ where, skip, take })
 *   res.json({ data: rows, page, limit: take, hasMore: rows.length === take })
 */
export function parsePagination(
  query: Record<string, unknown>,
  maxLimit = 100,
): { skip: number; take: number; page: number } {
  const take = Math.min(maxLimit, Math.max(1, Number(query.limit) || maxLimit))
  const page = Math.max(1, Number(query.page) || 1)
  return { skip: (page - 1) * take, take, page }
}
