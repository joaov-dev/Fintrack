import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import { assertOwns, ResourceType } from '../lib/policy'

/**
 * Route-level ownership guard.
 *
 * Verifies that the resource identified by the URL parameter `paramName`
 * (default: `"id"`) belongs to the authenticated user **before** the
 * controller runs. If ownership cannot be confirmed the request is rejected
 * with 404 immediately — the controller is never called.
 *
 * The found record is injected as `req.ownedRecord` so controllers can reuse
 * it without an extra database round-trip.
 *
 * Usage in route files:
 *
 *   import { ownedResource } from '../middlewares/ownership.middleware'
 *
 *   router.delete('/:id', ownedResource('transaction'), deleteTransaction)
 *   router.get('/:cardId/statements', ownedResource('creditCard', 'cardId'), listStatements)
 *
 * Design decision: always returns 404, never 403 — an attacker cannot
 * distinguish "does not exist" from "belongs to someone else".
 */
export function ownedResource(resource: ResourceType, paramName = 'id') {
  return async (req: AuthRequest & { ownedRecord?: Record<string, unknown> }, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName]
      if (!id) return res.status(400).json({ error: `Parâmetro "${paramName}" ausente` })

      req.ownedRecord = await assertOwns(resource, id, req.userId!)
      next()
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string; message: string }
      return res.status(e.status ?? 500).json({
        error: e.code === 'NOT_FOUND_OR_FORBIDDEN' ? 'Não encontrado' : e.message,
        ...(e.code && { code: e.code }),
      })
    }
  }
}
