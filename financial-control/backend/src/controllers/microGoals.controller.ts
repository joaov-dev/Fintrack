import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { invalidateInsightCache } from '../services/insightEngine'

export async function listMicroGoals(req: AuthRequest, res: Response) {
  const goals = await prisma.microGoal.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(goals)
}

export async function createMicroGoal(req: AuthRequest, res: Response) {
  const { name, scopeType, scopeRefId, limitAmount, startDate, endDate } = req.body

  if (!name || !scopeType || !limitAmount || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required fields: name, scopeType, limitAmount, startDate, endDate' })
  }

  if (!['CATEGORY', 'TOTAL_SPEND'].includes(scopeType)) {
    return res.status(400).json({ error: 'scopeType must be CATEGORY or TOTAL_SPEND' })
  }

  if (scopeType === 'CATEGORY' && !scopeRefId) {
    return res.status(400).json({ error: 'scopeRefId (categoryId) required for CATEGORY scope' })
  }

  const goal = await prisma.microGoal.create({
    data: {
      userId: req.userId!,
      name,
      scopeType,
      scopeRefId: scopeType === 'CATEGORY' ? scopeRefId : null,
      limitAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'ON_TRACK',
    },
  })

  invalidateInsightCache(req.userId!)
  return res.status(201).json(goal)
}

export async function updateMicroGoal(req: AuthRequest, res: Response) {
  const { id } = req.params
  const { name, limitAmount, endDate, status } = req.body

  const goal = await prisma.microGoal.findFirst({ where: { id, userId: req.userId! } })
  if (!goal) return res.status(404).json({ error: 'MicroGoal not found' })

  const updated = await prisma.microGoal.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(limitAmount !== undefined && { limitAmount }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(status !== undefined && { status }),
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

  // Also resolve any insights tied to this goal
  await prisma.insight.updateMany({
    where: {
      userId: req.userId!,
      dedupeKey: { contains: goal.id },
      status: { in: ['ACTIVE', 'SNOOZED'] },
    },
    data: { status: 'RESOLVED' },
  })

  invalidateInsightCache(req.userId!)
  return res.json({ success: true })
}
