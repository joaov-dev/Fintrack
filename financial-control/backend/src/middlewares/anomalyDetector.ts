/**
 * anomalyDetector — Express middleware that wires AnomalyService into the request lifecycle
 *
 * Applied globally in app.ts (before route handlers).
 * Calls are fire-and-forget: detection NEVER blocks or rejects requests —
 * that is handled by the WAF and rate limiters upstream.
 * Anomalies emit structured log lines consumed by CloudWatch Metric Filters.
 */

import { Request, Response, NextFunction } from 'express'
import {
  checkRequestVelocity,
  checkSessionIpShift,
  checkBulkDataAccess,
  checkErrorSpike,
} from '../services/anomalyService'
import { AuthRequest } from './auth.middleware'

// Endpoints considered "bulk data" if called frequently
const LIST_ENDPOINTS = new Set([
  '/transactions', '/accounts', '/categories', '/budgets',
  '/investment-positions', '/liabilities', '/goals',
  '/credit-cards', '/analytics', '/import',
])

export function anomalyDetector(req: Request, res: Response, next: NextFunction): void {
  const ip     = req.ip ?? 'unknown'
  const userId = (req as AuthRequest).userId

  // ── 1. Request velocity (scraping) ──────────────────────────────────────────
  checkRequestVelocity(ip, req.path, userId)

  // ── 2. Session IP shift (runs only for authenticated requests) ───────────────
  if (userId) {
    checkSessionIpShift(userId, ip, req.requestId)
  }

  // ── 3. Bulk data access ──────────────────────────────────────────────────────
  if (userId && req.method === 'GET') {
    const base = '/' + (req.path.split('/').filter(Boolean)[2] ?? '') // /api/v1/<resource>
    if (LIST_ENDPOINTS.has(base)) {
      checkBulkDataAccess(userId, req.path, req.requestId)
    }
  }

  // ── 4. 5xx error spike — checked after response ──────────────────────────────
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      checkErrorSpike(ip, res.statusCode, req.path)
    }
  })

  next()
}
