import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { getCurrentNetWorth, getNetWorthHistory } from '../services/netWorthService'
import { getFinancialHealth } from '../services/financialHealthService'
import { getMonthlyProjection } from '../services/monthlyProjectionService'

export async function getNetWorth(req: AuthRequest, res: Response) {
  const snapshot = await getCurrentNetWorth(req.userId!, prisma)
  return res.json(snapshot)
}

export async function getNetWorthHistoryHandler(req: AuthRequest, res: Response) {
  const months = Math.min(Math.max(Number(req.query.months) || 12, 1), 24)
  const history = await getNetWorthHistory(req.userId!, prisma, months)
  return res.json(history)
}

export async function getFinancialHealthHandler(req: AuthRequest, res: Response) {
  const data = await getFinancialHealth(req.userId!, prisma)
  return res.json(data)
}

export async function getMonthlyProjectionHandler(req: AuthRequest, res: Response) {
  const data = await getMonthlyProjection(req.userId!, prisma)
  return res.json(data)
}
