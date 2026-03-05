/**
 * Field-level AES-256-GCM encryption for sensitive database fields.
 *
 * Usage:
 *   import { encrypt, decrypt } from '../lib/encryption'
 *   const stored = encrypt(plaintext)   // store in DB
 *   const plain  = decrypt(stored)      // restore on read
 *
 * Ciphertext format: "enc:<iv_hex>:<tag_hex>:<data_hex>"
 *   - enc:  prefix distinguishes encrypted from legacy plaintext rows
 *   - iv:   12-byte random nonce (unique per call — never reused)
 *   - tag:  16-byte GCM authentication tag (detects tampering)
 *   - data: AES-256-GCM encrypted payload
 *
 * Backward-compat: decrypt() returns the input unchanged for any string
 * that does NOT start with "enc:" — so rows stored before encryption was
 * enabled continue to work transparently.
 *
 * Key management:
 *   Set DATA_ENCRYPTION_KEY to a 64-char hex string (32 bytes).
 *   Generate: openssl rand -hex 32
 *   In production this variable is REQUIRED — the server will refuse to start
 *   without it. In development a warning is logged and encryption is disabled.
 *
 * Key rotation:
 *   1. Add DATA_ENCRYPTION_KEY_OLD=<old key>
 *   2. Run a one-time migration script that re-encrypts all rows with the new key
 *   3. Remove DATA_ENCRYPTION_KEY_OLD
 */

import crypto from 'crypto'

// ── Key initialisation ─────────────────────────────────────────────────────────

function loadKey(envVar: string, label: string): Buffer | null {
  const hex = process.env[envVar]
  if (!hex) return null
  if (hex.length !== 64) {
    throw new Error(`[encryption] ${envVar} deve ter 64 caracteres hex (32 bytes). Gere com: openssl rand -hex 32`)
  }
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) throw new Error(`[encryption] ${envVar} inválida — buf length ${key.length}`)
  return key
}

const DATA_KEY = loadKey('DATA_ENCRYPTION_KEY', 'principal')
const OLD_KEY  = loadKey('DATA_ENCRYPTION_KEY_OLD', 'rotação')

if (process.env.NODE_ENV === 'production' && !DATA_KEY) {
  throw new Error(
    '[security] DATA_ENCRYPTION_KEY é obrigatória em produção. ' +
    'Gere com: openssl rand -hex 32  e defina no .env',
  )
}
if (!DATA_KEY) {
  console.warn(
    '[security] DATA_ENCRYPTION_KEY não configurada — ' +
    'criptografia de campos sensíveis DESATIVADA. Defina em .env para ativar.',
  )
}

// ── Core ───────────────────────────────────────────────────────────────────────

const PREFIX = 'enc:'

/**
 * Encrypts a UTF-8 string with AES-256-GCM.
 * Returns a prefixed hex string suitable for storage in a TEXT/VARCHAR column.
 * Returns the original plaintext unchanged when DATA_ENCRYPTION_KEY is not set.
 */
export function encrypt(plaintext: string): string {
  if (!DATA_KEY) return plaintext
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a previously encrypted field value.
 * Falls back to the old key (DATA_ENCRYPTION_KEY_OLD) for rows not yet re-encrypted
 * after a key rotation.
 * Returns the input unchanged for plaintext rows (no "enc:" prefix) — backward-compatible.
 * Throws if the ciphertext is tampered (GCM authentication failure).
 */
export function decrypt(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored // plaintext row or unencrypted field
  const rest = stored.slice(PREFIX.length)
  const parts = rest.split(':')
  if (parts.length !== 3) return stored // malformed — return as-is rather than crash

  const [ivHex, tagHex, encHex] = parts

  // Try current key first, then old key during rotation window
  for (const key of [DATA_KEY, OLD_KEY]) {
    if (!key) continue
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      return Buffer.concat([
        decipher.update(Buffer.from(encHex, 'hex')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      // Try next key
    }
  }
  throw new Error('[encryption] Falha ao descriptografar campo — possível adulteração ou chave incorreta')
}

/** True when a value is stored in encrypted form. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX)
}

/** True when field-level encryption is active (key is configured). */
export const encryptionEnabled = !!DATA_KEY
