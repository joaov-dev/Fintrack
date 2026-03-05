/**
 * Secrets — centralised secret access with AWS Secrets Manager support
 *
 * Strategy:
 *   • Production  → reads from AWS Secrets Manager (no secrets in env files)
 *   • Development → falls back to process.env (loaded from .env by dotenv)
 *
 * Usage:
 *   import { getSecret } from './lib/secrets'
 *   const dbUrl = await getSecret('DATABASE_URL')
 *
 * AWS Secrets Manager mapping (set via SECRET_ARN_<KEY> env vars):
 *   SECRET_ARN_DATABASE_URL      → ARN of the db-url secret
 *   SECRET_ARN_JWT_ACCESS_SECRET → ARN of the jwt-access-secret
 *   ... etc
 *
 * In-memory cache: secrets are fetched once and cached for CACHE_TTL_MS.
 * This prevents per-request Secrets Manager API calls (rate limit: 10,000 req/s).
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Keys known to the application. Extend as new secrets are added. */
export type SecretKey =
  | 'DATABASE_URL'
  | 'DATABASE_URL_TEST'
  | 'JWT_ACCESS_SECRET'
  | 'JWT_REFRESH_SECRET'
  | 'ENCRYPTION_KEY'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET'
  | 'COOKIE_SECRET'

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes — refresh before 30-day rotation

interface CacheEntry {
  value: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

// ── AWS client (lazy-initialised — not created in dev/test) ───────────────────

let _client: SecretsManagerClient | null = null

function getClient(): SecretsManagerClient {
  if (!_client) {
    _client = new SecretsManagerClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    })
  }
  return _client
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Retrieves a secret value.
 *
 * Resolution order:
 *   1. In-memory cache (if not expired)
 *   2. AWS Secrets Manager (if SECRET_ARN_<key> env var is set)
 *   3. process.env[key] (local development fallback)
 *
 * @throws if the secret is not found in any source
 */
export async function getSecret(key: SecretKey): Promise<string> {
  // 1. Cache hit
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  // 2. AWS Secrets Manager (production path)
  const arnEnvKey = `SECRET_ARN_${key}`
  const secretArn = process.env[arnEnvKey]

  if (secretArn) {
    const value = await fetchFromSecretsManager(secretArn, key)
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  }

  // 3. Environment variable fallback (local dev / test)
  const envValue = process.env[key]
  if (envValue) {
    // Cache env values too (avoids repeated lookups in hot paths)
    cache.set(key, { value: envValue, expiresAt: Date.now() + CACHE_TTL_MS })
    return envValue
  }

  throw new Error(
    `Secret "${key}" not found. ` +
    `Set ${arnEnvKey} (production) or ${key} (development) environment variable.`
  )
}

// ── AWS Secrets Manager fetch ─────────────────────────────────────────────────

async function fetchFromSecretsManager(arn: string, key: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: arn })
    const response = await getClient().send(command)

    const raw = response.SecretString
    if (!raw) {
      throw new Error(`Secret Manager returned empty value for ARN: ${arn}`)
    }

    // If the secret is a JSON object (e.g., Stripe keys), extract by key name
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        // Map SecretKey → JSON field name (camelCase convention)
        const fieldMap: Record<string, string> = {
          STRIPE_SECRET_KEY:      'secretKey',
          STRIPE_WEBHOOK_SECRET:  'webhookSecret',
        }
        const field = fieldMap[key]
        if (field && parsed[field]) {
          return String(parsed[field])
        }
      }
    } catch {
      // Not JSON — use raw string value directly
    }

    return raw
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch secret "${key}" from Secrets Manager: ${message}`)
  }
}

// ── Convenience: pre-load all secrets at startup ──────────────────────────────

/**
 * Pre-warms the cache by loading all known secrets at application startup.
 * Call this in app.ts before accepting requests.
 *
 * Fails fast if any required secret is missing — better to crash on boot
 * than to fail on the first request in production.
 */
export async function loadAllSecrets(): Promise<void> {
  const required: SecretKey[] = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
  ]

  const errors: string[] = []

  await Promise.all(
    required.map(async (key) => {
      try {
        await getSecret(key)
      } catch (err) {
        errors.push(String(err))
      }
    })
  )

  if (errors.length > 0) {
    throw new Error(
      `Application startup failed — missing required secrets:\n${errors.join('\n')}`
    )
  }
}

/** Clears the in-memory cache (used in tests to avoid stale values). */
export function clearSecretsCache(): void {
  cache.clear()
}
