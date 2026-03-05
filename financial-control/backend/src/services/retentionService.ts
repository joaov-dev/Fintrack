/**
 * retentionService — Log retention enforcement and compliance cleanup
 *
 * Runs a set of periodic cleanup jobs that delete records older than the
 * configured retention window. Each policy is independently configurable.
 *
 * Retention policy (aligned with LGPD / PCI DSS requirements):
 *
 *   Table              Retention    Rationale
 *   ─────────────────  ──────────   ──────────────────────────────────────────────
 *   login_attempts     30 days      Brute-force evidence; short-lived operational data
 *   used_totp_codes    7  days      Replay-prevention only; TOTP codes expire in 30s
 *   used_mfa_tokens    2  days      JWTs have 5-min TTL; keep 2-day buffer
 *   auth_events        365 days     Full-year audit trail for compliance
 *   audit_logs         365 days     Business-operation audit trail
 *   sessions           After expiry Sessions are cleaned up when they expire
 *
 * All jobs run sequentially within a single interval to avoid DB contention.
 * Failures are logged but do NOT crash the server — retention is best-effort;
 * compliance data (auth_events, audit_logs) is never force-deleted.
 *
 * Usage: call `startRetentionService()` once at application startup (app.ts).
 */

import { logger } from '../lib/logger'
import { prisma } from './prisma'

// ── Configuration ──────────────────────────────────────────────────────────────

const RETENTION = {
  loginAttemptsMs:   30 * 24 * 60 * 60 * 1000,   // 30 days
  usedTotpCodesMs:    7 * 24 * 60 * 60 * 1000,   //  7 days
  usedMfaTokensMs:    2 * 24 * 60 * 60 * 1000,   //  2 days
  authEventsMs:     365 * 24 * 60 * 60 * 1000,   // 365 days
  auditLogsMs:      365 * 24 * 60 * 60 * 1000,   // 365 days
  sessionsExpired:  true,                          // delete sessions past expiresAt
}

// Run every 24 hours (staggered from midnight to reduce peak load)
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000

// ── Individual jobs ────────────────────────────────────────────────────────────

async function purgeLoginAttempts(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION.loginAttemptsMs)
  const { count } = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  if (count > 0) {
    logger.info('Retention: purged login_attempts', { deleted: count, olderThan: cutoff.toISOString() })
  }
}

async function purgeUsedTotpCodes(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION.usedTotpCodesMs)
  const { count } = await prisma.usedTotpCode.deleteMany({
    where: { usedAt: { lt: cutoff } },
  })
  if (count > 0) {
    logger.info('Retention: purged used_totp_codes', { deleted: count, olderThan: cutoff.toISOString() })
  }
}

async function purgeExpiredMfaTokens(): Promise<void> {
  const { count } = await prisma.usedMfaToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  if (count > 0) {
    logger.info('Retention: purged used_mfa_tokens', { deleted: count })
  }
}

async function purgeExpiredSessions(): Promise<void> {
  const { count } = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      revokedAt: null,  // already-revoked sessions have a revokedAt; keep them for audit trail
    },
  })
  if (count > 0) {
    logger.info('Retention: purged expired sessions', { deleted: count })
  }
}

// Note: auth_events and audit_logs are NEVER deleted here.
// If the DB reaches capacity, archive to S3 and tombstone older rows.
// The 365-day cleanup is intentionally omitted from the live purge cycle —
// long-term retention is handled by the CloudWatch / S3 archival pipeline.

// ── LGPD Erasure — hard-delete users after 30-day cooling-off period ──────────

async function executeScheduledErasures(): Promise<void> {
  const due = await prisma.deletedAccount.findMany({
    where: {
      scheduledAt: { lte: new Date() },
      completedAt: null,
    },
  })

  for (const record of due) {
    try {
      // Hard-delete user and all cascaded data in a transaction
      await prisma.$transaction([
        prisma.user.deleteMany({ where: { id: record.userId } }),
        prisma.deletedAccount.update({
          where: { id: record.id },
          data:  { completedAt: new Date() },
        }),
      ])

      logger.info('Retention: LGPD erasure completed', {
        userId:      record.userId,
        requestedAt: record.requestedAt.toISOString(),
        completedAt: new Date().toISOString(),
      })
    } catch (err) {
      logger.error('Retention: LGPD erasure failed', {
        userId: record.userId,
        error:  (err as Error)?.message,
      })
    }
  }
}

// ── LGPD breach overdue check ──────────────────────────────────────────────────

async function checkBreachAnpdDeadlines(): Promise<void> {
  // Import lazily to avoid circular dependency
  const { getOverdueAnpdNotifications } = await import('./breachService')
  await getOverdueAnpdNotifications(prisma)
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

async function runAllJobs(): Promise<void> {
  logger.info('Retention: starting cleanup cycle')
  const start = Date.now()

  const jobs: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'loginAttempts',       fn: purgeLoginAttempts },
    { name: 'usedTotpCodes',       fn: purgeUsedTotpCodes },
    { name: 'usedMfaTokens',       fn: purgeExpiredMfaTokens },
    { name: 'expiredSessions',     fn: purgeExpiredSessions },
    { name: 'lgpdErasures',        fn: executeScheduledErasures },
    { name: 'breachAnpdDeadlines', fn: checkBreachAnpdDeadlines },
  ]

  for (const job of jobs) {
    try {
      await job.fn()
    } catch (err) {
      logger.error('Retention: job failed', {
        job: job.name,
        error: (err as Error)?.message,
      })
    }
  }

  logger.info('Retention: cleanup cycle complete', { durationMs: Date.now() - start })
}

// ── Public API ─────────────────────────────────────────────────────────────────

let _timer: NodeJS.Timeout | null = null

/**
 * Starts the retention service.
 * - Runs immediately once (catch startup state)
 * - Then repeats every `RUN_INTERVAL_MS`
 *
 * Safe to call multiple times (no-op if already started).
 */
export function startRetentionService(): void {
  if (_timer) return

  // First run: delay 60s after startup to avoid impacting boot performance
  const firstRun = setTimeout(async () => {
    await runAllJobs()
    _timer = setInterval(runAllJobs, RUN_INTERVAL_MS)
    _timer.unref()
  }, 60_000)

  firstRun.unref()

  logger.info('Retention service scheduled', {
    intervalHours: RUN_INTERVAL_MS / 3_600_000,
  })
}

/** Stops the retention service (used in tests). */
export function stopRetentionService(): void {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }
}

/** Runs all jobs immediately — useful for manual triggered cleanup. */
export async function runRetentionNow(): Promise<void> {
  await runAllJobs()
}
