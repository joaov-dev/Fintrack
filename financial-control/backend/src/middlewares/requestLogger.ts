/**
 * requestLogger — HTTP access log middleware with correlation ID
 *
 * Responsibilities:
 *   1. Generate a unique requestId per request (UUID v4)
 *   2. Attach requestId to `req` so controllers/services can reference it
 *   3. Expose requestId via `X-Request-Id` response header (for tracing)
 *   4. Emit a structured log line after the response is sent, containing:
 *      method, path, statusCode, duration (ms), userId, ip, userAgent
 *
 * Log format (production — JSON line per request):
 *   {
 *     "ts": "2026-03-04T10:00:00.000Z",
 *     "level": "info",
 *     "message": "HTTP",
 *     "requestId": "uuid",
 *     "method": "POST",
 *     "path": "/api/v1/transactions",
 *     "status": 201,
 *     "ms": 42,
 *     "userId": "cuid...",
 *     "ip": "1.2.3.4",
 *     "ua": "Mozilla/..."
 *   }
 *
 * Correlation: requestId flows from here → error.middleware → audit events,
 * allowing all log lines for a single request to be joined in CloudWatch Insights.
 */

import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

// ── Type augmentation — makes req.requestId available everywhere ───────────────

declare global {
  namespace Express {
    interface Request {
      requestId: string
      startedAt: number
    }
  }
}

// ── Paths to suppress from access logs (health checks / liveness probes) ──────

const SILENT_PATHS = new Set(['/api/health', '/favicon.ico'])

// ── Middleware ─────────────────────────────────────────────────────────────────

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID()
  req.startedAt = Date.now()

  // Propagate to response header immediately (before any handler runs)
  res.setHeader('X-Request-Id', req.requestId)

  // Log after response is fully sent
  res.on('finish', () => {
    if (SILENT_PATHS.has(req.path)) return

    const ms     = Date.now() - req.startedAt
    const status = res.statusCode

    // Choose log level by status code
    const level: 'info' | 'warn' | 'error' =
      status >= 500 ? 'error' :
      status >= 400 ? 'warn'  : 'info'

    logger[level]('HTTP', {
      requestId: req.requestId,
      method:    req.method,
      path:      req.path,
      status,
      ms,
      userId:    (req as any).userId ?? undefined,
      ip:        req.ip,
      ua:        req.headers['user-agent'],
    })
  })

  next()
}
