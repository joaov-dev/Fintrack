import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../services/prisma'
import { createDefaultCategories } from '../services/defaultCategories'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

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

  const token = signToken(user.id)
  return res.status(201).json({ token, user })
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

  const token = signToken(user.id)
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  })
}

export async function me(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true },
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
    select: { id: true, name: true, email: true, avatar: true, createdAt: true },
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
