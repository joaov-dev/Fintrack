import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { prisma } from '../services/prisma'

export interface AdminRequest extends Request {
  admin?: { id: string; username: string; role: string }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function adminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  const rawToken: string | undefined = req.cookies?.admin_session
  if (!rawToken) {
    return res.status(401).json({ error: 'Não autenticado' })
  }

  const tokenHash = hashToken(rawToken)
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { admin: { select: { id: true, username: true, role: true, isActive: true } } },
  })

  if (!session || session.expiresAt < new Date() || !session.admin.isActive) {
    res.clearCookie('admin_session', { path: '/admin' })
    return res.status(401).json({ error: 'Sessão expirada ou inválida' })
  }

  // Update lastUsedAt (fire-and-forget)
  prisma.adminSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  }).catch(console.error)

  req.admin = { id: session.admin.id, username: session.admin.username, role: session.admin.role }
  next()
}
