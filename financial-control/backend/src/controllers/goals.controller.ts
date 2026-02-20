import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { listGoals, createGoal, updateGoal, deleteGoal } from '../services/goalsService'

export async function listGoalsHandler(req: AuthRequest, res: Response) {
  const goals = await listGoals(req.userId!, prisma)
  return res.json(goals)
}

export async function createGoalHandler(req: AuthRequest, res: Response) {
  const { name, targetAmount, targetDate, linkedAccountId, notes } = req.body
  if (!name || targetAmount == null) {
    return res.status(400).json({ error: 'name and targetAmount are required' })
  }
  const goal = await createGoal(req.userId!, { name, targetAmount, targetDate, linkedAccountId, notes }, prisma)
  return res.status(201).json(goal)
}

export async function updateGoalHandler(req: AuthRequest, res: Response) {
  const { id } = req.params
  try {
    const goal = await updateGoal(req.userId!, id, req.body, prisma)
    return res.json(goal)
  } catch {
    return res.status(404).json({ error: 'Goal not found' })
  }
}

export async function deleteGoalHandler(req: AuthRequest, res: Response) {
  const { id } = req.params
  try {
    await deleteGoal(req.userId!, id, prisma)
    return res.status(204).send()
  } catch {
    return res.status(404).json({ error: 'Goal not found' })
  }
}
