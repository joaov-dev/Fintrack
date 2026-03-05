import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { invalidateInsightCache } from '../services/insightEngine'
import { audit } from '../lib/audit'

// ── Schemas ───────────────────────────────────────────────────────────────────

const createMicroGoalSchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  scopeType:   z.enum(['CATEGORY', 'TOTAL_SPEND']),
  scopeRefId:  z.string().cuid().optional().nullable(),
  limitAmount: z.number().positive('limitAmount deve ser positivo'),
  startDate:   z.string().datetime(),
  endDate:     z.string().datetime(),
}).refine(
  (d) => d.scopeType !== 'CATEGORY' || !!d.scopeRefId,
  { message: 'scopeRefId (categoryId) obrigatório para escopo CATEGORY', path: ['scopeRefId'] },
)

const updateMicroGoalSchema = z.object({
  name:        z.string().min(1).max(100).trim().optional(),
  limitAmount: z.number().positive().optional(),
  endDate:     z.string().datetime().optional(),
  status:      z.enum(['ON_TRACK', 'AT_RISK', 'EXCEEDED']).optional(),
})

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function listMicroGoals(req: AuthRequest, res: Response) {
  const goals = await prisma.microGoal.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return res.json(goals)
}

export async function createMicroGoal(req: AuthRequest, res: Response) {
  const data = createMicroGoalSchema.parse(req.body)

  const goal = await prisma.microGoal.create({
    data: {
      userId:      req.userId!,
      name:        data.name,
      scopeType:   data.scopeType,
      scopeRefId:  data.scopeType === 'CATEGORY' ? data.scopeRefId! : null,
      limitAmount: data.limitAmount,
      startDate:   new Date(data.startDate),
      endDate:     new Date(data.endDate),
      status:      'ON_TRACK',
    },
  })

  invalidateInsightCache(req.userId!)
  return res.status(201).json(goal)
}

export async function updateMicroGoal(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = updateMicroGoalSchema.parse(req.body)

  const goal = await prisma.microGoal.findFirst({ where: { id, userId: req.userId! } })
  if (!goal) return res.status(404).json({ error: 'MicroGoal not found' })

  const updated = await prisma.microGoal.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        data.name }),
      ...(data.limitAmount !== undefined && { limitAmount: data.limitAmount }),
      ...(data.endDate     !== undefined && { endDate:     new Date(data.endDate) }),
      ...(data.status      !== undefined && { status:      data.status }),
    },
  })

  invalidateInsightCache(req.userId!)
  return res.json(updated)
}

export async function deleteMicroGoal(req: AuthRequest, res: Response) {
  const { id } = req.params

  const goal = await prisma.microGoal.findFirst({ where: { id, userId: req.userId! } })
  if (!goal) return res.status(404).json({ error: 'MicroGoal not found' })

  await prisma.microGoal.delete({ where: { id } })
  audit('MICRO_GOAL_DELETE', req.userId!, req, { microGoalId: id, name: goal.name })

  // Resolve any insights tied to this goal
  await prisma.insight.updateMany({
    where: {
      userId:    req.userId!,
      dedupeKey: { contains: goal.id },
      status:    { in: ['ACTIVE', 'SNOOZED'] },
    },
    data: { status: 'RESOLVED' },
  })

  invalidateInsightCache(req.userId!)
  return res.json({ success: true })
}
