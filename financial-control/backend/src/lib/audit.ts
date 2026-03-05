import { Request } from 'express'
import { prisma } from '../services/prisma'
import { logger } from './logger'
import { alertDestructiveAction } from '../services/anomalyService'

// ── Audit action catalogue ─────────────────────────────────────────────────────

export type AuditAction =
  | 'TRANSACTION_CREATE' | 'TRANSACTION_UPDATE' | 'TRANSACTION_DELETE'
  | 'ACCOUNT_CREATE'     | 'ACCOUNT_UPDATE'     | 'ACCOUNT_DELETE'
  | 'CATEGORY_CREATE'    | 'CATEGORY_UPDATE'    | 'CATEGORY_DELETE'
  | 'GOAL_CREATE'        | 'GOAL_UPDATE'        | 'GOAL_DELETE'
  | 'BUDGET_CREATE'      | 'BUDGET_UPDATE'      | 'BUDGET_DELETE'
  | 'LIABILITY_CREATE'   | 'LIABILITY_UPDATE'   | 'LIABILITY_DELETE'
  | 'MICRO_GOAL_CREATE'  | 'MICRO_GOAL_UPDATE'  | 'MICRO_GOAL_DELETE'
  | 'RULE_CREATE'        | 'RULE_UPDATE'        | 'RULE_DELETE'
  | 'INVESTMENT_POSITION_CREATE' | 'INVESTMENT_POSITION_UPDATE' | 'INVESTMENT_POSITION_DELETE'
  | 'ATTACHMENT_CREATE'  | 'ATTACHMENT_DELETE'
  | 'PROFILE_UPDATE'     | 'PREFERENCES_UPDATE'
  | 'CLEAR_ACCOUNT_DATA' | 'SENSITIVE_READ'
  // Auth
  | 'REGISTER_OK' | 'LOGIN_OK'  | 'LOGIN_FAIL' | 'LOGIN_BLOCKED'
  | 'LOGOUT' | 'REFRESH_OK' | 'REFRESH_FAIL' | 'SESSION_REVOKE'
  | 'MFA_VERIFY_OK' | 'MFA_VERIFY_FAIL' | 'MFA_REPLAY_BLOCKED' | 'TOTP_REPLAY_BLOCKED'
  | 'MFA_ENABLE' | 'MFA_DISABLE' | 'PASSWORD_CHANGE' | 'ANOMALOUS_LOGIN'

const DESTRUCTIVE_ACTIONS = new Set<AuditAction>([
  'CLEAR_ACCOUNT_DATA', 'ACCOUNT_DELETE', 'TRANSACTION_DELETE',
])

const AUTH_ACTIONS = new Set<AuditAction>([
  'REGISTER_OK', 'LOGIN_OK', 'LOGIN_FAIL', 'LOGIN_BLOCKED', 'LOGOUT',
  'REFRESH_OK', 'REFRESH_FAIL', 'SESSION_REVOKE',
  'MFA_VERIFY_OK', 'MFA_VERIFY_FAIL', 'MFA_REPLAY_BLOCKED', 'TOTP_REPLAY_BLOCKED',
  'MFA_ENABLE', 'MFA_DISABLE', 'PASSWORD_CHANGE', 'ANOMALOUS_LOGIN',
])

function resourceFromAction(action: AuditAction): string {
  return action.split('_')[0].toLowerCase()
}

/**
 * Writes an audit event.
 *
 * Auth events      → auth_events  (append-only, immutable via DB trigger)
 * Business events  → audit_logs   (append-only, immutable via DB trigger)
 *
 * The 4th parameter is a plain metadata record (backward-compatible).
 * To supply structured fields, include reserved keys:
 *   _resourceId — the affected record ID
 *   _before     — state before mutation
 *   _after      — state after mutation
 * These reserved keys are extracted and stored in dedicated columns.
 *
 * Fire-and-forget — never throws or blocks the request.
 */
export function audit(
  action: AuditAction,
  userId: string,
  req: Request,
  metadata?: Record<string, unknown>,
): void {
  const ip        = req.ip ?? null
  const userAgent = req.headers['user-agent'] ?? null
  const requestId = (req as any).requestId as string | undefined

  if (DESTRUCTIVE_ACTIONS.has(action)) {
    alertDestructiveAction(userId, action, ip ?? 'unknown', requestId ?? 'unknown')
  }

  // Extract reserved structured fields from metadata (if provided)
  const resourceId = metadata?._resourceId as string | undefined
  const before     = metadata?._before     as Record<string, unknown> | undefined
  const after      = metadata?._after      as Record<string, unknown> | undefined
  // Remove reserved keys from what goes into the metadata JSON column
  const metaClean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(metadata ?? {})) {
    if (k !== '_resourceId' && k !== '_before' && k !== '_after') metaClean[k] = v
  }
  const metaValue = Object.keys(metaClean).length > 0 ? metaClean : undefined

  if (AUTH_ACTIONS.has(action)) {
    prisma.authEvent.create({
      data: { event: action, userId, ip, userAgent, metadata: (metaValue ?? undefined) as any },
    }).catch((err: unknown) =>
      logger.error('Audit write failed (auth_events)', { action, userId, requestId, error: (err as Error)?.message }),
    )
  } else {
    prisma.auditLog.create({
      data: {
        userId,
        action,
        resource:   resourceFromAction(action),
        resourceId: resourceId ?? null,
        requestId:  requestId ?? null,
        ip,
        userAgent,
        before:   (before   ?? undefined) as any,
        after:    (after    ?? undefined) as any,
        metadata: (metaValue ?? undefined) as any,
      },
    }).catch((err: unknown) =>
      logger.error('Audit write failed (audit_logs)', { action, userId, requestId, error: (err as Error)?.message }),
    )
  }
}

/**
 * Writes to auth_events with optional email context (for login/register flows
 * where userId may not exist yet).
 */
export function auditAuth(
  action: AuditAction,
  req: Request,
  opts?: { userId?: string; email?: string; metadata?: Record<string, unknown> },
): void {
  prisma.authEvent.create({
    data: {
      event:     action,
      userId:    opts?.userId ?? null,
      email:     opts?.email  ?? null,
      ip:        req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      metadata:  (opts?.metadata ?? undefined) as any,
    },
  }).catch((err: unknown) =>
    logger.error('Audit write failed (auditAuth)', {
      action, userId: opts?.userId, email: opts?.email, error: (err as Error)?.message,
    }),
  )
}
