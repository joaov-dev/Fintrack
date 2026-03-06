import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../../services/prisma'
import { AdminRequest } from '../../middlewares/adminAuth.middleware'

const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const BCRYPT_ROUNDS = 12

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function logAdminAction(
  adminId: string,
  action: string,
  req: Request,
  opts: { targetType?: string; targetId?: string; details?: object } = {},
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      details: (opts.details ?? undefined) as any,
      ip: req.ip ?? null,
    },
  })
}

export async function adminLogin(req: Request, res: Response) {
  const { username, password } = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }).parse(req.body)

  const admin = await prisma.adminAccount.findUnique({ where: { username } })

  // Always compare (even if not found) to prevent timing-based user enumeration
  const dummyHash = '$2a$12$aaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const valid = admin
    ? await bcrypt.compare(password, admin.passwordHash)
    : (await bcrypt.compare(password, dummyHash), false)

  if (!admin || !valid || !admin.isActive) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS)

  await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      expiresAt,
    },
  })

  // Update lastLoginAt (fire-and-forget)
  prisma.adminAccount.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }).catch(console.error)

  await logAdminAction(admin.id, 'ADMIN_LOGIN', req)

  res.cookie('admin_session', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ADMIN_SESSION_TTL_MS,
    path: '/admin',
  })

  return res.json({ ok: true, admin: { id: admin.id, username: admin.username, role: admin.role } })
}

export async function adminLogout(req: AdminRequest, res: Response) {
  const rawToken: string | undefined = req.cookies?.admin_session
  if (rawToken) {
    const tokenHash = hashToken(rawToken)
    await prisma.adminSession.deleteMany({ where: { tokenHash } })
  }
  res.clearCookie('admin_session', { path: '/admin' })
  return res.sendStatus(204)
}

export async function adminMe(req: AdminRequest, res: Response) {
  return res.json({ admin: req.admin })
}

const changeCredentialsSchema = z.object({
  currentPassword: z.string().min(1),
  newUsername: z.string().min(3).optional(),
  newPassword: z.string().min(8).max(128).optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => d.newUsername || d.newPassword, {
  message: 'Informe newUsername ou newPassword',
}).refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
  message: 'newPassword e confirmPassword não conferem',
})

export async function adminChangeCredentials(req: AdminRequest, res: Response) {
  const data = changeCredentialsSchema.parse(req.body)

  const admin = await prisma.adminAccount.findUnique({ where: { id: req.admin!.id } })
  if (!admin) return res.status(404).json({ error: 'Admin não encontrado' })

  const valid = await bcrypt.compare(data.currentPassword, admin.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' })

  const updateData: { username?: string; passwordHash?: string } = {}
  if (data.newUsername) updateData.username = data.newUsername
  if (data.newPassword) updateData.passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS)

  await prisma.adminAccount.update({ where: { id: admin.id }, data: updateData })

  // Invalidate ALL admin sessions globally
  await prisma.adminSession.deleteMany({ where: { adminId: admin.id } })

  await logAdminAction(admin.id, 'ADMIN_CREDENTIALS_CHANGED', req)

  res.clearCookie('admin_session', { path: '/admin' })
  return res.json({ ok: true })
}
