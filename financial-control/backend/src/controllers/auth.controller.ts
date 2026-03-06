import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { generateSecret as otpGenerateSecret, verifySync as otpVerifySync, generateURI as otpGenerateURI } from 'otplib'
import { z } from 'zod'
import { prisma } from '../services/prisma'
import { createDefaultCategories } from '../services/defaultCategories'

// ── Constants ──────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL   = '15m'
const MFA_TOKEN_TTL      = '5m'
const REFRESH_TOKEN_TTL  = 30 * 24 * 60 * 60 * 1000 // 30 days in ms
const BCRYPT_ROUNDS      = parseInt(process.env.BCRYPT_ROUNDS ?? '12')
const LOGIN_WINDOW_MS    = 15 * 60 * 1000             // 15-min sliding window
const MAX_LOGIN_FAILURES = 5                           // lock after 5 failures

// ── MFA Secret Encryption (AES-256-GCM) ───────────────────────────────────────
//
// Generate key: openssl rand -hex 32
// Store in MFA_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
//
// If the key is absent (e.g. local dev without .env configured), secrets are
// stored as plaintext — a warning is logged at startup. This keeps the app
// functional without breaking existing local setups.

const MFA_RAW_KEY = process.env.MFA_ENCRYPTION_KEY
const MFA_KEY     = MFA_RAW_KEY ? Buffer.from(MFA_RAW_KEY, 'hex') : null

if (!MFA_KEY) {
  console.warn('[auth] MFA_ENCRYPTION_KEY not set — MFA secrets stored as plaintext. Set it in production.')
}

/** Encrypts a TOTP secret with AES-256-GCM. Returns "iv:tag:ciphertext" hex. */
function encryptMfaSecret(plaintext: string): string {
  if (!MFA_KEY) return plaintext
  const iv       = crypto.randomBytes(12)
  const cipher   = crypto.createCipheriv('aes-256-gcm', MFA_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag      = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a TOTP secret. Handles both:
 *   - encrypted "iv:tag:ciphertext" format (new)
 *   - legacy plaintext (secrets stored before encryption was added)
 */
function decryptMfaSecret(stored: string): string {
  const parts = stored.split(':')
  if (!MFA_KEY || parts.length !== 3) return stored  // legacy plaintext — pass through
  const [ivHex, tagHex, encHex] = parts
  const decipher = crypto.createDecipheriv('aes-256-gcm', MFA_KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

// ── Schemas ────────────────────────────────────────────────────────────────────

/**
 * Password policy (NIST SP 800-63B compliant):
 *   - 8–128 characters
 *   - at least one uppercase letter
 *   - at least one digit
 *   - at least one symbol
 */
const passwordSchema = z.string()
  .min(8,   'Senha deve ter ao menos 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .refine((p) => /[A-Z]/.test(p),       'Deve conter ao menos uma letra maiúscula')
  .refine((p) => /[0-9]/.test(p),       'Deve conter ao menos um número')
  .refine((p) => /[^A-Za-z0-9]/.test(p),'Deve conter ao menos um símbolo (!@#$...)')

const registerSchema = z.object({
  name:     z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email:    z.string().email('Email inválido'),
  password: passwordSchema,
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

// ── Auth Event Logging ─────────────────────────────────────────────────────────

type AuthEventType =
  | 'REGISTER_OK'
  | 'LOGIN_OK'
  | 'LOGIN_FAIL'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'REFRESH_OK'
  | 'REFRESH_FAIL'
  | 'SESSION_REVOKE'
  | 'MFA_VERIFY_OK'
  | 'MFA_VERIFY_FAIL'
  | 'MFA_REPLAY_BLOCKED'
  | 'TOTP_REPLAY_BLOCKED'
  | 'MFA_ENABLE'
  | 'MFA_DISABLE'
  | 'PASSWORD_CHANGE'
  | 'ANOMALOUS_LOGIN'
  | 'CLEAR_ACCOUNT_DATA'

/** Fire-and-forget — never blocks the request on a logging failure. */
function logAuthEvent(
  event: AuthEventType,
  req: Request,
  opts: { userId?: string; email?: string; metadata?: Record<string, unknown> } = {},
) {
  prisma.authEvent.create({
    data: {
      event,
      userId:    opts.userId    ?? null,
      email:     opts.email     ?? null,
      ip:        req.ip         ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      metadata:  (opts.metadata ?? undefined) as any,
    },
  }).catch(console.error)
}

// ── Account Lockout (per email, sliding 15-min window) ────────────────────────

async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  await prisma.loginAttempt.create({
    data: { email: email.toLowerCase(), ip, success },
  })
}

async function isAccountLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS)
  const failures = await prisma.loginAttempt.count({
    where: { email: email.toLowerCase(), success: false, createdAt: { gte: since } },
  })
  return failures >= MAX_LOGIN_FAILURES
}

// ── Anomalous Login Detection ─────────────────────────────────────────────────

/**
 * Compares the current IP against the last 30 days of sessions for this user.
 * If it's a brand-new IP, logs an ANOMALOUS_LOGIN event.
 * (Extend here to send an email alert when a mail service is available.)
 */
async function detectAnomalousLogin(userId: string, req: Request) {
  const ip = req.ip ?? null
  if (!ip) return

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentSessions = await prisma.session.findMany({
    where:  { userId, createdAt: { gte: since } },
    select: { ipAddress: true },
  })

  if (recentSessions.length === 0) return  // first login ever — not anomalous

  const knownIps = new Set(recentSessions.map((s) => s.ipAddress))
  if (!knownIps.has(ip)) {
    logAuthEvent('ANOMALOUS_LOGIN', req, { userId, metadata: { newIp: ip } })
    // TODO: send "New device login" email via your mail service
  }
}

// ── haveibeenpwned check (NIST recommendation) ─────────────────────────────────

/**
 * Uses the k-Anonymity model of the HIBP API — only the first 5 chars of the
 * SHA-1 hash are sent over the network. Non-blocking: if the API is unreachable
 * the check is skipped and registration proceeds normally.
 */
async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const hash   = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const res  = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal:  AbortSignal.timeout(3000), // 3 s max
    })
    if (!res.ok) return false

    const text = await res.text()
    return text.split('\r\n').some((line) => line.startsWith(suffix))
  } catch {
    // API unreachable — fail open (never block registration for infra issues)
    return false
  }
}

// ── MFA Token Anti-Replay ──────────────────────────────────────────────────────

async function assertMfaTokenNotReplayed(jti: string, exp: number): Promise<void> {
  const used = await prisma.usedMfaToken.findUnique({ where: { jti } })
  if (used) throw Object.assign(new Error('MFA_TOKEN_REPLAY'), { code: 'MFA_REPLAY' })

  await prisma.usedMfaToken.create({ data: { jti, expiresAt: new Date(exp * 1000) } })

  // Lazy cleanup: purge expired entries in background
  prisma.usedMfaToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(console.error)
}

// ── TOTP Anti-Replay ───────────────────────────────────────────────────────────

async function assertTotpNotReplayed(userId: string, code: string): Promise<void> {
  const used = await prisma.usedTotpCode.findUnique({
    where: { userId_code: { userId, code } },
  })
  if (used) throw Object.assign(new Error('TOTP_REPLAY'), { code: 'TOTP_REPLAY' })

  await prisma.usedTotpCode.create({ data: { userId, code } })

  // Lazy cleanup: TOTP window is 30 s — codes older than 2 min are safe to purge
  const cutoff = new Date(Date.now() - 2 * 60 * 1000)
  prisma.usedTotpCode.deleteMany({ where: { usedAt: { lt: cutoff } } }).catch(console.error)
}

// ── Token helpers ──────────────────────────────────────────────────────────────

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
}

function signMfaToken(userId: string): string {
  const jti = crypto.randomUUID()   // unique ID for anti-replay tracking
  return jwt.sign({ userId, isMfaToken: true, jti }, process.env.JWT_SECRET!, { expiresIn: MFA_TOKEN_TTL })
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex') // 96-char opaque token
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function parseDeviceName(userAgent = ''): string {
  if (/mobile/i.test(userAgent))  return 'Mobile'
  if (/edg/i.test(userAgent))     return 'Edge'
  if (/chrome/i.test(userAgent))  return 'Chrome'
  if (/firefox/i.test(userAgent)) return 'Firefox'
  if (/safari/i.test(userAgent))  return 'Safari'
  return 'Navegador'
}

// ── Session helper ─────────────────────────────────────────────────────────────

async function createSession(res: Response, userId: string, req: Request) {
  const rawToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL)

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash:  hashToken(rawToken),
      deviceName: parseDeviceName(req.headers['user-agent']),
      ipAddress:  req.ip ?? req.socket.remoteAddress ?? null,
      userAgent:  req.headers['user-agent'] ?? null,
      expiresAt,
    },
  })

  res.cookie('refresh_token', rawToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   REFRESH_TOKEN_TTL,
    path:     '/api/auth',
  })

  return session
}

// ── Shared select for all user-returning endpoints ─────────────────────────────

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  createdAt: true,
  mfaEnabled: true,
  // Financial preferences
  currency: true,
  locale: true,
  timezone: true,
  dateFormat: true,
  closingDay: true,
  // Notification preferences
  notifBudget: true,
  notifGoals: true,
  notifDue: true,
  notifInsights: true,
  emailBudget: true,
  emailGoals: true,
  emailDue: true,
  emailInsights: true,
  // Subscription
  currentPlan: true,
  subscriptionStatus: true,
  subscriptionEndsAt: true,
  trialEndsAt: true,
  graceUntil: true,
} as const

// ── Preferences schema ─────────────────────────────────────────────────────────

const preferencesSchema = z.object({
  currency:     z.enum(['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'ARS']).optional(),
  locale:       z.enum(['pt-BR', 'en-US', 'de-DE', 'es-ES']).optional(),
  timezone:     z.string().min(1).max(100).optional(),
  dateFormat:   z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  closingDay:   z.number().int().min(1).max(31).optional(),
  notifBudget:  z.boolean().optional(),
  notifGoals:   z.boolean().optional(),
  notifDue:     z.boolean().optional(),
  notifInsights:z.boolean().optional(),
  emailBudget:  z.boolean().optional(),
  emailGoals:   z.boolean().optional(),
  emailDue:     z.boolean().optional(),
  emailInsights:z.boolean().optional(),
})

// ── Auth endpoints ─────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const { name, email, password } = registerSchema.parse(req.body)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'Email já cadastrado' })
  }

  // Reject passwords found in known data breaches (non-blocking on API failure)
  const pwned = await isPwnedPassword(password)
  if (pwned) {
    return res.status(400).json({
      error: 'Esta senha aparece em vazamentos de dados conhecidos. Escolha uma senha diferente.',
    })
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: USER_SELECT,
  })

  await createDefaultCategories(user.id)

  const session = await createSession(res, user.id, req)
  const accessToken = signToken(user.id)
  logAuthEvent('REGISTER_OK', req, { userId: user.id, email })
  return res.status(201).json({ accessToken, sessionId: session.id, user })
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)
  const ip = req.ip ?? null

  // 1. Account lockout check — checked before any DB user lookup to prevent
  //    timing-based user enumeration via the lockout gate.
  if (await isAccountLocked(email)) {
    logAuthEvent('LOGIN_BLOCKED', req, { email })
    return res.status(429).json({
      error: 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em 15 minutos.',
    })
  }

  // 2. User lookup + password check — always use same generic error message to
  //    prevent user enumeration (never confirm whether the email exists).
  const user = await prisma.user.findUnique({ where: { email } })
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false

  if (!user || !valid) {
    await recordLoginAttempt(email, ip, false)
    logAuthEvent('LOGIN_FAIL', req, { email })
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  // 3. Suspended account check — same generic message to avoid info leak
  if (user.status === 'SUSPENDED') {
    logAuthEvent('LOGIN_FAIL', req, { userId: user.id, email, metadata: { reason: 'suspended' } })
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  await recordLoginAttempt(email, ip, true)

  // Update lastLoginAt (fire-and-forget — never block the login on a logging failure)
  prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(console.error)

  logAuthEvent('LOGIN_OK', req, { userId: user.id, email })

  // 4. MFA gate — create short-lived intermediate token instead of a full session
  if (user.mfaEnabled) {
    const mfaToken = signMfaToken(user.id)
    return res.json({ requiresMfa: true, mfaToken })
  }

  // 4. Anomalous login detection (new IP alert — fire and forget)
  detectAnomalousLogin(user.id, req).catch(console.error)

  const session = await createSession(res, user.id, req)
  const accessToken = signToken(user.id)
  return res.json({
    accessToken,
    sessionId: session.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      currentPlan: user.currentPlan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndsAt: user.subscriptionEndsAt,
      trialEndsAt: user.trialEndsAt,
      graceUntil: user.graceUntil,
    },
  })
}

export async function refresh(req: Request, res: Response) {
  const rawToken: string | undefined = req.cookies?.refresh_token
  if (!rawToken) {
    return res.status(401).json({ error: 'Refresh token ausente' })
  }

  const tokenHash = hashToken(rawToken)
  const session   = await prisma.session.findUnique({ where: { tokenHash } })

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    res.clearCookie('refresh_token', { path: '/api/auth' })
    logAuthEvent('REFRESH_FAIL', req)
    return res.status(401).json({ error: 'Sessão expirada ou inválida' })
  }

  // Rotate: delete old session, create new one — any concurrent request using
  // the old token will get 401, closing the token-theft replay window.
  await prisma.session.delete({ where: { id: session.id } })
  await createSession(res, session.userId, req)

  const accessToken = signToken(session.userId)
  logAuthEvent('REFRESH_OK', req, { userId: session.userId })
  return res.json({ accessToken })
}

export async function logout(req: Request, res: Response) {
  const rawToken: string | undefined = req.cookies?.refresh_token
  if (rawToken) {
    const tokenHash = hashToken(rawToken)
    await prisma.session.deleteMany({ where: { tokenHash } })
  }
  res.clearCookie('refresh_token', { path: '/api/auth' })
  logAuthEvent('LOGOUT', req)
  return res.json({ message: 'Logout realizado com sucesso' })
}

export async function listSessions(req: Request & { userId?: string }, res: Response) {
  const rawToken    = req.cookies?.refresh_token as string | undefined
  const currentHash = rawToken ? hashToken(rawToken) : null

  const sessions = await prisma.session.findMany({
    where: {
      userId:    req.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastUsedAt: 'desc' },
    select:  { id: true, deviceName: true, ipAddress: true, createdAt: true, lastUsedAt: true, tokenHash: true },
  })

  return res.json(
    sessions.map((s) => ({
      id:         s.id,
      deviceName: s.deviceName,
      ipAddress:  s.ipAddress,
      createdAt:  s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent:  s.tokenHash === currentHash,
    })),
  )
}

export async function revokeSession(req: Request & { userId?: string }, res: Response) {
  const { id } = req.params

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ error: 'Sessão não encontrada' })
  }

  await prisma.session.delete({ where: { id } })
  logAuthEvent('SESSION_REVOKE', req, { userId: req.userId, metadata: { revokedSessionId: id } })
  return res.json({ message: 'Sessão revogada' })
}

// ── MFA endpoints ──────────────────────────────────────────────────────────────

export async function verifyMfa(req: Request, res: Response) {
  const { mfaToken, code } = req.body
  if (!mfaToken || !code) {
    return res.status(400).json({ error: 'mfaToken e code são obrigatórios' })
  }

  // 1. Verify JWT signature and claims
  let payload: { userId: string; isMfaToken?: boolean; jti?: string; exp?: number }
  try {
    payload = jwt.verify(mfaToken, process.env.JWT_SECRET!) as typeof payload
  } catch {
    logAuthEvent('MFA_VERIFY_FAIL', req, { metadata: { reason: 'invalid_jwt' } })
    return res.status(401).json({ error: 'Token MFA inválido ou expirado' })
  }

  if (!payload.isMfaToken || !payload.jti) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  // 2. Anti-replay: ensure this mfaToken JWT was not already used
  try {
    await assertMfaTokenNotReplayed(payload.jti, payload.exp!)
  } catch {
    logAuthEvent('MFA_REPLAY_BLOCKED', req, { userId: payload.userId })
    return res.status(401).json({ error: 'Token MFA já utilizado' })
  }

  // 3. Load user and decrypt TOTP secret
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ error: 'MFA não configurado' })
  }

  const secret = decryptMfaSecret(user.mfaSecret)

  // 4. Anti-replay: ensure this specific TOTP code was not already used
  try {
    await assertTotpNotReplayed(user.id, String(code))
  } catch {
    logAuthEvent('TOTP_REPLAY_BLOCKED', req, { userId: user.id })
    return res.status(401).json({ error: 'Código já utilizado. Aguarde o próximo código.' })
  }

  // 5. Verify TOTP value
  const result = otpVerifySync({ token: String(code), secret })
  if (!result.valid) {
    logAuthEvent('MFA_VERIFY_FAIL', req, { userId: user.id, metadata: { reason: 'wrong_code' } })
    return res.status(401).json({ error: 'Código inválido' })
  }

  // 6. Anomalous login detection
  detectAnomalousLogin(user.id, req).catch(console.error)

  const session     = await createSession(res, user.id, req)
  const accessToken = signToken(user.id)
  logAuthEvent('MFA_VERIFY_OK', req, { userId: user.id })
  return res.json({
    accessToken,
    sessionId: session.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      currentPlan: user.currentPlan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndsAt: user.subscriptionEndsAt,
      trialEndsAt: user.trialEndsAt,
      graceUntil: user.graceUntil,
    },
  })
}

export async function setupMfa(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const secret = otpGenerateSecret()
  // Store encrypted — decryptMfaSecret handles legacy plaintext if key is unavailable
  await prisma.user.update({ where: { id: req.userId }, data: { mfaSecret: encryptMfaSecret(secret) } })

  const otpauthUrl = otpGenerateURI({ issuer: 'DominaHub', label: user.email, secret })
  return res.json({ otpauthUrl, secret })
}

export async function enableMfa(req: Request & { userId?: string }, res: Response) {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Código TOTP obrigatório' })

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user || !user.mfaSecret) {
    return res.status(400).json({ error: 'Execute /auth/mfa/setup primeiro' })
  }

  const secret = decryptMfaSecret(user.mfaSecret)

  // Anti-replay before accepting the enable code
  try {
    await assertTotpNotReplayed(user.id, String(code))
  } catch {
    return res.status(401).json({ error: 'Código já utilizado. Aguarde o próximo código.' })
  }

  const result = otpVerifySync({ token: String(code), secret })
  if (!result.valid) return res.status(401).json({ error: 'Código inválido' })

  await prisma.user.update({ where: { id: req.userId }, data: { mfaEnabled: true } })
  logAuthEvent('MFA_ENABLE', req, { userId: req.userId })
  return res.json({ message: 'MFA ativado com sucesso' })
}

export async function disableMfa(req: Request & { userId?: string }, res: Response) {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Código TOTP obrigatório' })

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(400).json({ error: 'MFA não está ativado' })
  }

  const secret = decryptMfaSecret(user.mfaSecret)

  try {
    await assertTotpNotReplayed(user.id, String(code))
  } catch {
    return res.status(401).json({ error: 'Código já utilizado. Aguarde o próximo código.' })
  }

  const result = otpVerifySync({ token: String(code), secret })
  if (!result.valid) return res.status(401).json({ error: 'Código inválido' })

  await prisma.user.update({ where: { id: req.userId }, data: { mfaEnabled: false, mfaSecret: null } })
  logAuthEvent('MFA_DISABLE', req, { userId: req.userId })
  return res.json({ message: 'MFA desativado' })
}

// ── Profile endpoints ──────────────────────────────────────────────────────────

export async function me(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({
    where:  { id: req.userId },
    select: USER_SELECT,
  })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  return res.json(user)
}

export async function updateProfile(req: Request & { userId?: string }, res: Response) {
  const { name, avatar } = req.body
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nome deve ter ao menos 2 caracteres' })
  }
  const updated = await prisma.user.update({
    where:  { id: req.userId },
    data: {
      name: name.trim(),
      ...(avatar !== undefined && { avatar: avatar ?? null }),
    },
    select: USER_SELECT,
  })
  return res.json(updated)
}

export async function updatePreferences(req: Request & { userId?: string }, res: Response) {
  const data = preferencesSchema.parse(req.body)
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Nenhuma preferência enviada' })
  }
  const updated = await prisma.user.update({
    where:  { id: req.userId },
    data,
    select: USER_SELECT,
  })
  return res.json(updated)
}

export async function changePassword(req: Request & { userId?: string }, res: Response) {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' })
  }

  // Apply same complexity policy as registration
  const parsed = passwordSchema.safeParse(newPassword)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' })

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } })
  logAuthEvent('PASSWORD_CHANGE', req, { userId: req.userId })
  return res.json({ message: 'Senha alterada com sucesso' })
}

export async function clearAccountData(req: Request & { userId?: string }, res: Response) {
  const userId = req.userId!

  await prisma.$transaction([
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.liability.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.investmentPosition.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.category.deleteMany({ where: { userId } }),
  ])

  await createDefaultCategories(userId)
  logAuthEvent('CLEAR_ACCOUNT_DATA', req, { userId })
  return res.json({ message: 'Dados limpos com sucesso' })
}
