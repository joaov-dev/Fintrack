import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { AuthRequest } from '../middlewares/auth.middleware'
import { prisma } from '../services/prisma'
import { runInsightEngine, invalidateInsightCache, InsightsResponse, InsightOut } from '../services/insightEngine'

export async function getInsights(req: AuthRequest, res: Response) {
  const status = req.query.status as string | undefined

  // For ACTIVE (default): run the engine
  if (!status || status === 'ACTIVE') {
    const data = await runInsightEngine(req.userId!, prisma)
    return res.json(data)
  }

  // For SNOOZED / DISMISSED / RESOLVED: query DB directly without running engine
  const validStatuses = ['SNOOZED', 'DISMISSED', 'RESOLVED']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter' })
  }

  const now = new Date()
  const whereClause: Prisma.InsightWhereInput = { userId: req.userId!, status: status as Prisma.EnumInsightStatusFilter }
  if (status === 'SNOOZED') {
    whereClause.snoozedUntil = { gt: now }
  }

  const dbInsights = await prisma.insight.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
  })

  const insights: InsightOut[] = dbInsights.map((ins) => {
    const ctx = (ins.context ?? {}) as Record<string, unknown>
    return {
      id: ins.id,
      type: ins.type,
      severity: ins.severity,
      status: ins.status,
      title: ins.title,
      message: ins.message,
      explanation: ins.explanation,
      suggestedAction: (ctx.suggestedAction as string | undefined) ?? '',
      cta: ins.cta as InsightOut['cta'],
      dataContext: ctx,
      snoozedUntil: ins.snoozedUntil?.toISOString() ?? null,
      createdAt: ins.createdAt.toISOString(),
    }
  })

  const response: Partial<InsightsResponse> = {
    insights,
    microGoals: [],
    alerts: { budgetExceeded: false, overdueLiabilities: 0, negativeBalanceProjection: false },
    hasEnoughData: true,
    evaluatedAt: now.toISOString(),
  }

  return res.json(response)
}

export async function getInsightsSummary(req: AuthRequest, res: Response) {
  // Run engine to ensure data is fresh, then return top 3 + count
  const data = await runInsightEngine(req.userId!, prisma)
  return res.json({
    top3: data.insights.slice(0, 3),
    totalActive: data.insights.filter((i) => i.status === 'ACTIVE').length,
    alerts: data.alerts,
  })
}

export async function dismissInsight(req: AuthRequest, res: Response) {
  const { id } = req.params

  const insight = await prisma.insight.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!insight) return res.status(404).json({ error: 'Insight not found' })

  await prisma.insight.update({
    where: { id },
    data: { status: 'DISMISSED' },
  })

  invalidateInsightCache(req.userId!)
  return res.json({ success: true })
}

export async function reactivateInsight(req: AuthRequest, res: Response) {
  const { id } = req.params

  const insight = await prisma.insight.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!insight) return res.status(404).json({ error: 'Insight not found' })

  await prisma.insight.update({
    where: { id },
    data: { status: 'ACTIVE', snoozedUntil: null },
  })

  invalidateInsightCache(req.userId!)
  return res.json({ success: true })
}

export async function snoozeInsight(req: AuthRequest, res: Response) {
  const { id } = req.params
  const days = Number(req.body?.days) || 7

  if (days < 1 || days > 30) {
    return res.status(400).json({ error: 'days must be between 1 and 30' })
  }

  const insight = await prisma.insight.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!insight) return res.status(404).json({ error: 'Insight not found' })

  const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await prisma.insight.update({
    where: { id },
    data: { status: 'SNOOZED', snoozedUntil },
  })

  invalidateInsightCache(req.userId!)
  return res.json({ success: true, snoozedUntil: snoozedUntil.toISOString() })
}
