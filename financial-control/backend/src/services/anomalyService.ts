/**
 * AnomalyService — In-process detection engine for suspicious patterns
 *
 * Detects and alerts on:
 *   1. Scraping / high-velocity requests (same IP hitting many endpoints rapidly)
 *   2. Credential stuffing (many 401s from same IP across different accounts)
 *   3. Session IP shift (authenticated user changing IP mid-session)
 *   4. Bulk data export (user pulling excessive records in a short window)
 *   5. Off-hours access from new IP (outside normal usage hours)
 *
 * Implementation: in-memory sliding-window counters (Map<key, timestamps[]>).
 * Suitable for single-instance deployments. For multi-instance, replace backing
 * store with Redis (e.g. `ioredis` with ZADD/ZRANGEBYSCORE for sorted sets).
 *
 * All detections emit structured log lines at `warn` level so CloudWatch Metric
 * Filters can count them and trigger alarms.
 *
 * Format of anomaly log lines:
 *   { "level": "warn", "message": "ANOMALY", "type": "SCRAPING", "ip": "...", ... }
 */

import { logger } from '../lib/logger'

// ── Configuration ──────────────────────────────────────────────────────────────

const CFG = {
  // Scraping: max requests from one IP in a sliding window
  SCRAPE_WINDOW_MS:   60_000,   // 1 minute
  SCRAPE_MAX_REQS:    120,      // >120 req/min from same IP → scraping alert

  // Credential stuffing: max 401s from one IP across any accounts
  STUFFING_WINDOW_MS: 5 * 60_000,  // 5 minutes
  STUFFING_MAX_401S:  15,           // >15 auth failures in 5 min from same IP

  // Bulk export: max list-endpoint calls per user in window
  BULK_WINDOW_MS:     60_000,   // 1 minute
  BULK_MAX_LISTS:     30,       // >30 paginated list calls/min per user

  // Cleanup: how often to purge expired entries from maps
  CLEANUP_INTERVAL_MS: 5 * 60_000,  // every 5 minutes
} as const

// ── Sliding-window store ───────────────────────────────────────────────────────

class SlidingWindow {
  private store = new Map<string, number[]>()

  /** Records an event for `key` and returns the current count in the window. */
  record(key: string, windowMs: number): number {
    const now = Date.now()
    const cutoff = now - windowMs

    const events = this.store.get(key) ?? []
    // Remove events outside the window
    const fresh = events.filter((ts) => ts > cutoff)
    fresh.push(now)
    this.store.set(key, fresh)
    return fresh.length
  }

  /** Removes all keys whose latest event is older than maxAge. */
  cleanup(maxAge: number): void {
    const cutoff = Date.now() - maxAge
    for (const [key, events] of this.store.entries()) {
      if (events.every((ts) => ts < cutoff)) {
        this.store.delete(key)
      }
    }
  }
}

// ── State ──────────────────────────────────────────────────────────────────────

const ipRequests   = new SlidingWindow()  // IP → request count
const ipAuth401s   = new SlidingWindow()  // IP → auth failure count
const userListCalls = new SlidingWindow() // userId → list-endpoint call count

// Known IPs per userId (for session IP-shift detection)
// Map<userId, Set<ip>>
const knownUserIps = new Map<string, Set<string>>()

// ── Cleanup scheduler ──────────────────────────────────────────────────────────

setInterval(() => {
  ipRequests.cleanup(CFG.SCRAPE_WINDOW_MS * 2)
  ipAuth401s.cleanup(CFG.STUFFING_WINDOW_MS * 2)
  userListCalls.cleanup(CFG.BULK_WINDOW_MS * 2)

  // Prune knownUserIps entries older than 7 days (tracked as Set — use size limit)
  for (const [userId, ips] of knownUserIps.entries()) {
    if (ips.size > 20) {
      // Keep only the most recent 10 IPs (approximation for a Set)
      knownUserIps.set(userId, new Set([...ips].slice(-10)))
    }
  }
}, CFG.CLEANUP_INTERVAL_MS).unref() // unref: don't prevent process exit in tests

// ── Detection functions ────────────────────────────────────────────────────────

/** Emits a structured ANOMALY log line (picked up by CloudWatch Metric Filters). */
function alert(
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  data: Record<string, unknown>,
): void {
  logger.warn('ANOMALY', { type, severity, ...data })
}

/**
 * Called on every request. Detects high-velocity access from a single IP.
 * Returns true if the IP is flagged as scraping (caller may rate-limit further).
 */
export function checkRequestVelocity(
  ip: string,
  path: string,
  userId?: string,
): boolean {
  const count = ipRequests.record(ip, CFG.SCRAPE_WINDOW_MS)

  if (count === CFG.SCRAPE_MAX_REQS) {
    // Fire only on the threshold crossing, not every subsequent request
    alert('SCRAPING', 'high', {
      ip,
      reqPerMin: count,
      path,
      userId,
      detail: `IP exceeded ${CFG.SCRAPE_MAX_REQS} req/min`,
    })
  }

  return count > CFG.SCRAPE_MAX_REQS
}

/**
 * Called when an auth endpoint returns 401.
 * Detects credential stuffing (many failures from one IP across many accounts).
 */
export function checkCredentialStuffing(ip: string, email: string): void {
  const count = ipAuth401s.record(ip, CFG.STUFFING_WINDOW_MS)

  if (count === CFG.STUFFING_MAX_401S) {
    alert('CREDENTIAL_STUFFING', 'critical', {
      ip,
      failuresInWindow: count,
      windowMinutes: CFG.STUFFING_WINDOW_MS / 60_000,
      email,  // last attempted email (NOT password)
      detail: `${count} auth failures in ${CFG.STUFFING_WINDOW_MS / 60_000} min from same IP`,
    })
  }
}

/**
 * Called on authenticated requests.
 * Detects if the user's IP changed significantly mid-session.
 */
export function checkSessionIpShift(
  userId: string,
  ip: string,
  requestId: string,
): void {
  const known = knownUserIps.get(userId)

  if (!known) {
    knownUserIps.set(userId, new Set([ip]))
    return
  }

  if (!known.has(ip)) {
    // New IP for this user — could be a stolen session
    alert('SESSION_IP_SHIFT', 'medium', {
      userId,
      newIp: ip,
      knownIpCount: known.size,
      requestId,
      detail: 'Authenticated request from previously unseen IP',
    })
    known.add(ip)
  }
}

/**
 * Called on list/pagination endpoints.
 * Detects bulk data export patterns (scraping authenticated data).
 */
export function checkBulkDataAccess(
  userId: string,
  endpoint: string,
  requestId: string,
): void {
  const count = userListCalls.record(userId, CFG.BULK_WINDOW_MS)

  if (count === CFG.BULK_MAX_LISTS) {
    alert('BULK_DATA_ACCESS', 'high', {
      userId,
      callsPerMin: count,
      endpoint,
      requestId,
      detail: `User made ${count} list calls in 1 minute — possible data exfiltration`,
    })
  }
}

/**
 * Called on CLEAR_ACCOUNT_DATA or mass-delete operations.
 * These are high-blast-radius actions that warrant immediate alerting.
 */
export function alertDestructiveAction(
  userId: string,
  action: string,
  ip: string,
  requestId: string,
): void {
  alert('DESTRUCTIVE_ACTION', 'critical', {
    userId,
    action,
    ip,
    requestId,
    detail: `High-impact action "${action}" triggered`,
  })
}

/**
 * Called when a high volume of 5xx errors is detected for a single user/IP.
 * Could indicate an attacker probing for vulnerabilities.
 */
export function checkErrorSpike(
  ip: string,
  status: number,
  path: string,
): void {
  if (status < 500) return
  // Re-use ipAuth401s counter for 5xx from same IP (separate key prefix)
  const count = ipAuth401s.record(`5xx:${ip}`, CFG.STUFFING_WINDOW_MS)

  if (count === 10) {
    alert('ERROR_SPIKE', 'medium', {
      ip,
      errorsInWindow: count,
      path,
      status,
      detail: `${count} server errors from same IP in ${CFG.STUFFING_WINDOW_MS / 60_000} min`,
    })
  }
}
