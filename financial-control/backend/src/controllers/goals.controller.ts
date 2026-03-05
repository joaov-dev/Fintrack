import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { listGoals, createGoal, updateGoal, deleteGoal } from '../services/goalsService'
import { audit } from '../lib/audit'

// ── Schemas ───────────────────────────────────────────────────────────────────

const createGoalSchema = z.object({
  name:            z.string().min(1).max(100).trim(),
  targetAmount:    z.number().positive('targetAmount deve ser positivo'),
  targetDate:      z.string().datetime().optional().nullable(),
  linkedAccountId: z.string().cuid().optional().nullable(),
  notes:           z.string().max(500).trim().optional().nullable(),
})

const updateGoalSchema = createGoalSchema.partial()

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function listGoalsHandler(req: AuthRequest, res: Response) {
  const goals = await listGoals(req.userId!, prisma)
  return res.json(goals)
}

export async function createGoalHandler(req: AuthRequest, res: Response) {
  const data = createGoalSchema.parse(req.body)
  const goal = await createGoal(req.userId!, data, prisma)
  return res.status(201).json(goal)
}

export async function updateGoalHandler(req: AuthRequest, res: Response) {
  const { id } = req.params
  const data = updateGoalSchema.parse(req.body)
  try {
    const goal = await updateGoal(req.userId!, id, data, prisma)
    return res.json(goal)
  } catch {
    return res.status(404).json({ error: 'Goal not found' })
  }
}

export async function deleteGoalHandler(req: AuthRequest, res: Response) {
  const { id } = req.params
  try {
    await deleteGoal(req.userId!, id, prisma)
    audit('GOAL_DELETE', req.userId!, req, { goalId: id })
    return res.status(204).send()
  } catch {
    return res.status(404).json({ error: 'Goal not found' })
  }
}
