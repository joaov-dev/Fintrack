/**
 * Unit tests — encryption.ts
 *
 * These tests run with DATA_ENCRYPTION_KEY set so encryption is active.
 * The startup warning about production is suppressed by explicitly setting NODE_ENV.
 */

// Set the key before importing the module so loadKey() picks it up
const TEST_KEY = 'a'.repeat(64) // 64-char hex = 32 bytes
process.env.DATA_ENCRYPTION_KEY = TEST_KEY
process.env.NODE_ENV = 'test'

import { encrypt, decrypt, isEncrypted, encryptionEnabled } from '../../lib/encryption'

describe('encryption', () => {
  // ── encryptionEnabled ──────────────────────────────────────────────────────

  it('encryptionEnabled is true when key is set', () => {
    expect(encryptionEnabled).toBe(true)
  })

  // ── encrypt ───────────────────────────────────────────────────────────────

  it('encrypt() returns a string prefixed with "enc:"', () => {
    const result = encrypt('hello world')
    expect(result).toMatch(/^enc:/)
  })

  it('encrypt() returns 4 colon-separated segments (enc:iv:tag:data)', () => {
    const parts = encrypt('hello').split(':')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('enc')
  })

  it('encrypt() produces different ciphertexts for the same plaintext (random IV)', () => {
    const c1 = encrypt('same input')
    const c2 = encrypt('same input')
    expect(c1).not.toBe(c2)
  })

  it('encrypt() handles empty string', () => {
    const result = encrypt('')
    expect(result).toMatch(/^enc:/)
    expect(decrypt(result)).toBe('')
  })

  it('encrypt() handles unicode / multi-byte characters', () => {
    const plain = 'Olá, João! 🎉'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  // ── decrypt ───────────────────────────────────────────────────────────────

  it('decrypt(encrypt(x)) === x (round-trip)', () => {
    const plain = 'my-secret-data-url'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('decrypt() returns plaintext unchanged when string lacks "enc:" prefix (backward compat)', () => {
    const plain = 'legacy-plaintext'
    expect(decrypt(plain)).toBe(plain)
  })

  it('decrypt() returns input unchanged for malformed enc: string (wrong segment count)', () => {
    const malformed = 'enc:onlyone'
    expect(decrypt(malformed)).toBe(malformed)
  })

  it('decrypt() throws on tampered ciphertext (authentication failure)', () => {
    const ct = encrypt('original')
    // Corrupt the data segment (last hex chars)
    const tampered = ct.slice(0, -4) + '0000'
    expect(() => decrypt(tampered)).toThrow()
  })

  // ── isEncrypted ───────────────────────────────────────────────────────────

  it('isEncrypted() returns true for encrypted strings', () => {
    expect(isEncrypted(encrypt('test'))).toBe(true)
  })

  it('isEncrypted() returns false for plaintext', () => {
    expect(isEncrypted('plaintext')).toBe(false)
  })

  it('isEncrypted() returns false for empty string', () => {
    expect(isEncrypted('')).toBe(false)
  })
})
