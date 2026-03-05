import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { suggestFromRules } from '../services/categorizationRules.service'
import { audit } from '../lib/audit'

const ruleSchema = z.object({
  name:       z.string().min(1).max(100),
  pattern:    z.string().min(1).max(200),
  matchType:  z.enum(['CONTAINS', 'STARTS_WITH', 'EQUALS']).default('CONTAINS'),
  categoryId: z.string().cuid(),
  accountId:  z.string().cuid().optional().nullable(),
  isActive:   z.boolean().optional().default(true),
  priority:   z.number().int().min(0).max(100).optional().default(0),
})

const RULE_INCLUDE = {
  category: { select: { id: true, name: true, color: true, type: true } },
  account:  { select: { id: true, name: true } },
} as const

export async function listRules(req: AuthRequest, res: Response) {
  const rules = await prisma.categorizationRule.findMany({
    where:   { userId: req.userId },
    include: RULE_INCLUDE,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
  return res.json(rules)
}

export async function createRule(req: AuthRequest, res: Response) {
  const data = ruleSchema.parse(req.body)
  const userId = req.userId!

  const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId } })
  if (!category) return res.status(400).json({ error: 'Categoria inválida' })

  if (data.accountId) {
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } })
    if (!account) return res.status(400).json({ error: 'Conta inválida' })
  }

  const rule = await prisma.categorizationRule.create({
    data: { ...data, userId },
    include: RULE_INCLUDE,
  })
  return res.status(201).json(rule)
}

export async function updateRule(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = ruleSchema.partial().parse(req.body)

  const rule = await prisma.categorizationRule.findFirst({ where: { id, userId: req.userId } })
  if (!rule) return res.status(404).json({ error: 'Regra não encontrada' })

  const updated = await prisma.categorizationRule.update({
    where: { id },
    data,
    include: RULE_INCLUDE,
  })
  return res.json(updated)
}

export async function deleteRule(req: AuthRequest, res: Response) {
  const { id } = req.params

  const rule = await prisma.categorizationRule.findFirst({ where: { id, userId: req.userId } })
  if (!rule) return res.status(404).json({ error: 'Regra não encontrada' })

  await prisma.categorizationRule.delete({ where: { id } })
  audit('RULE_DELETE', req.userId!, req, { ruleId: id, name: rule.name })
  return res.status(204).send()
}

export async function suggestRule(req: AuthRequest, res: Response) {
  const { description } = req.query
  if (!description) return res.json(null)

  const suggestion = await suggestFromRules(String(description), req.userId!, prisma)
  return res.json(suggestion)
}
