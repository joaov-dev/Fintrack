import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { generateSecret as otpGenerateSecret, verifySync as otpVerifySync, generateURI as otpGenerateURI } from 'otplib'
import { z } from 'zod'
import { prisma } from '../services/prisma'
import { createDefaultCategories } from '../services/defaultCategories'

// ── Constants ──────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL    = '15m'
const MFA_TOKEN_TTL       = '5m'
const REFRESH_TOKEN_TTL   = 30 * 24 * 60 * 60 * 1000 // 30 days in ms

// ── Schemas ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ── Token helpers ──────────────────────────────────────────────────────────────

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_TTL })
}

function signMfaToken(userId: string): string {
  return jwt.sign({ userId, isMfaToken: true }, process.env.JWT_SECRET!, { expiresIn: MFA_TOKEN_TTL })
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

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  })

  await createDefaultCategories(user.id)

  const session = await createSession(res, user.id, req)
  const accessToken = signToken(user.id)
  return res.status(201).json({ accessToken, sessionId: session.id, user })
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  // If MFA is enabled, return an intermediate token — no session created yet
  if (user.mfaEnabled) {
    const mfaToken = signMfaToken(user.id)
    return res.json({ requiresMfa: true, mfaToken })
  }

  const session = await createSession(res, user.id, req)
  const accessToken = signToken(user.id)
  return res.json({
    accessToken,
    sessionId: session.id,
    user: { id: user.id, name: user.name, email: user.email, mfaEnabled: user.mfaEnabled },
  })
}

export async function refresh(req: Request, res: Response) {
  const rawToken: string | undefined = req.cookies?.refresh_token
  if (!rawToken) {
    return res.status(401).json({ error: 'Refresh token ausente' })
  }

  const tokenHash = hashToken(rawToken)
  const session = await prisma.session.findUnique({ where: { tokenHash } })

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    res.clearCookie('refresh_token', { path: '/api/auth' })
    return res.status(401).json({ error: 'Sessão expirada ou inválida' })
  }

  // Rotate: delete old session, create new one
  await prisma.session.delete({ where: { id: session.id } })
  await createSession(res, session.userId, req)

  const accessToken = signToken(session.userId)
  return res.json({ accessToken })
}

export async function logout(req: Request, res: Response) {
  const rawToken: string | undefined = req.cookies?.refresh_token
  if (rawToken) {
    const tokenHash = hashToken(rawToken)
    await prisma.session.deleteMany({ where: { tokenHash } })
  }
  res.clearCookie('refresh_token', { path: '/api/auth' })
  return res.json({ message: 'Logout realizado com sucesso' })
}

export async function listSessions(req: Request & { userId?: string }, res: Response) {
  const rawToken: string | undefined = req.cookies?.refresh_token
  const currentHash = rawToken ? hashToken(rawToken) : null

  const sessions = await prisma.session.findMany({
    where: {
      userId:    req.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, deviceName: true, ipAddress: true, createdAt: true, lastUsedAt: true, tokenHash: true },
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
  return res.json({ message: 'Sessão revogada' })
}

// ── MFA endpoints ──────────────────────────────────────────────────────────────

export async function verifyMfa(req: Request, res: Response) {
  const { mfaToken, code } = req.body
  if (!mfaToken || !code) {
    return res.status(400).json({ error: 'mfaToken e code são obrigatórios' })
  }

  let payload: { userId: string; isMfaToken?: boolean }
  try {
    payload = jwt.verify(mfaToken, process.env.JWT_SECRET!) as { userId: string; isMfaToken?: boolean }
  } catch {
    return res.status(401).json({ error: 'Token MFA inválido ou expirado' })
  }

  if (!payload.isMfaToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ error: 'MFA não configurado' })
  }

  const result = otpVerifySync({ token: String(code), secret: user.mfaSecret })
  if (!result.valid) {
    return res.status(401).json({ error: 'Código inválido' })
  }

  const session = await createSession(res, user.id, req)
  const accessToken = signToken(user.id)
  return res.json({
    accessToken,
    sessionId: session.id,
    user: { id: user.id, name: user.name, email: user.email, mfaEnabled: user.mfaEnabled },
  })
}

export async function setupMfa(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const secret = otpGenerateSecret()
  await prisma.user.update({ where: { id: req.userId }, data: { mfaSecret: secret } })

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

  const result = otpVerifySync({ token: String(code), secret: user.mfaSecret })
  if (!result.valid) return res.status(401).json({ error: 'Código inválido' })

  await prisma.user.update({ where: { id: req.userId }, data: { mfaEnabled: true } })
  return res.json({ message: 'MFA ativado com sucesso' })
}

export async function disableMfa(req: Request & { userId?: string }, res: Response) {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Código TOTP obrigatório' })

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(400).json({ error: 'MFA não está ativado' })
  }

  const result = otpVerifySync({ token: String(code), secret: user.mfaSecret })
  if (!result.valid) return res.status(401).json({ error: 'Código inválido' })

  await prisma.user.update({ where: { id: req.userId }, data: { mfaEnabled: false, mfaSecret: null } })
  return res.json({ message: 'MFA desativado' })
}

// ── Profile endpoints ──────────────────────────────────────────────────────────

export async function me(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
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
  // avatar is a base64 data URL string or null — accept as-is
  const updated = await prisma.user.update({
    where: { id: req.userId },
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
    where: { id: req.userId },
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
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' })

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } })
  return res.json({ message: 'Senha alterada com sucesso' })
}

export async function clearAccountData(req: Request & { userId?: string }, res: Response) {
  const userId = req.userId!

  // Delete in safe order (respecting FK constraints)
  await prisma.$transaction([
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.liability.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.investmentPosition.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.category.deleteMany({ where: { userId } }),
  ])

  // Re-seed default categories so the user can start fresh
  await createDefaultCategories(userId)

  return res.json({ message: 'Dados limpos com sucesso' })
}
