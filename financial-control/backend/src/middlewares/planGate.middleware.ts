import { Response, NextFunction } from 'express'
import { FeatureKey } from '@prisma/client'
import { AuthRequest } from './auth.middleware'
import { checkFeatureAccess, checkUsageLimit, resolveEntitlements } from '../services/billing.service'

export function requireFeature(featureKey: FeatureKey) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const ok = await checkFeatureAccess(userId, featureKey)
      if (!ok) {
        const ent = await resolveEntitlements(userId)
        const isPlanRequired = ent.plan === 'FREE'
        return res.status(isPlanRequired ? 402 : 403).json({
          code: isPlanRequired ? 'PLAN_REQUIRED' : 'FEATURE_NOT_AVAILABLE',
          error: 'Recurso indisponível no plano atual',
          featureKey,
          plan: ent.plan,
        })
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

export function requireUsage(featureKey: FeatureKey, increment = 1) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const allowed = await checkUsageLimit(userId, featureKey, increment)
      if (!allowed) {
        const ent = await resolveEntitlements(userId)
        const gate = ent.features[featureKey]
        return res.status(429).json({
          code: 'PLAN_LIMIT_REACHED',
          error: 'Limite do plano atingido',
          featureKey,
          plan: ent.plan,
          limit: gate?.limitPerMonth ?? null,
          usage: gate?.usageThisMonth ?? null,
        })
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
