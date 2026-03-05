/**
 * Structured logger with automatic PII redaction.
 *
 * Production  → JSON lines to stdout  (compatible with Datadog, CloudWatch, etc.)
 * Development → Human-readable coloured output
 *
 * PII/secrets listed in SENSITIVE_KEYS are replaced with "[REDACTED]" at any
 * nesting depth before any output is written.  Add keys as needed.
 *
 * Log level is controlled by the LOG_LEVEL environment variable:
 *   LOG_LEVEL=debug | info | warn | error   (default: info)
 */

// ── Sensitive field names (case-insensitive) ───────────────────────────────────

const SENSITIVE_KEYS = new Set([
  // Auth credentials
  'password', 'passwordhash', 'passwordconfirm', 'oldpassword', 'newpassword',
  // Tokens / keys
  'token', 'accesstoken', 'refreshtoken', 'mfatoken', 'apikey', 'jwt_secret',
  'stripe_secret_key', 'stripe_webhook_secret',
  // Encryption / MFA
  'secret', 'mfasecret', 'mfakey', 'encryptionkey', 'data_encryption_key',
  'mfa_encryption_key',
  // HTTP headers
  'authorization', 'cookie',
  // Sensitive data
  'dataurl',    // base64-encoded file attachments
  'cpf', 'cnpj', 'ssn', 'taxid',
])

// ── PII redaction ──────────────────────────────────────────────────────────────

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1)
  }
  return result
}

// ── Level config ───────────────────────────────────────────────────────────────

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const MIN_LEVEL: number = LEVEL_WEIGHT[
  ((process.env.LOG_LEVEL ?? 'info') as Level)
] ?? 1

// ── Write ──────────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production'

// Dev colour codes
const COLOURS: Record<Level, string> = {
  debug: '\x1b[37m', // grey
  info:  '\x1b[36m', // cyan
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
}
const RESET = '\x1b[0m'

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < MIN_LEVEL) return

  const ts = new Date().toISOString()
  const sanitized = meta ? (redact(meta) as Record<string, unknown>) : undefined

  if (IS_PROD) {
    const entry = sanitized
      ? { ts, level, message, ...sanitized }
      : { ts, level, message }
    process.stdout.write(JSON.stringify(entry) + '\n')
  } else {
    const colour = COLOURS[level]
    const label  = `${colour}${level.toUpperCase().padEnd(5)}${RESET}`
    const extra  = sanitized && Object.keys(sanitized).length > 0
      ? ' ' + JSON.stringify(sanitized, null, 0)
      : ''
    const line   = `${colour}[${ts}]${RESET} ${label} ${message}${extra}`
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => write('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => write('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
}
