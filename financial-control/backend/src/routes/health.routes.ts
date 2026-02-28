import { Router } from 'express'
import { prisma } from '../services/prisma'

export const healthRoutes = Router()

healthRoutes.get('/', (_req, res) => {
  return res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

healthRoutes.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'currentPlan'
      LIMIT 1
    `
    if (!cols.length) {
      return res.status(503).json({ status: 'not_ready', reason: 'billing_migration_missing' })
    }
    return res.json({ status: 'ready', timestamp: new Date().toISOString() })
  } catch {
    return res.status(503).json({ status: 'not_ready' })
  }
})
