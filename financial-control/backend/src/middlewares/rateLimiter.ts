import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { AuthRequest } from './auth.middleware'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Key for user-scoped limiters: userId if authenticated, otherwise IP. */
function userKey(req: AuthRequest): string {
  return (req as AuthRequest).userId ?? ipKeyGenerator(req)
}

// ── Limiters ──────────────────────────────────────────────────────────────────

/** Strict limiter for auth endpoints prone to brute-force (login, register). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** Standard IP-based limiter for all API endpoints — first line of defence. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Limite de requisições excedido.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Per-authenticated-user limiter — second layer applied after authenticate middleware.
 * Prevents a single compromised or scripted account from overwhelming the API
 * even when requests come from many IPs (e.g. distributed bot).
 */
export const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: userKey,
  message: { error: 'Limite de requisições por usuário excedido.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Strict limiter for compute-heavy endpoints (analytics, AI insights, import).
 * 10 requests / minute per user — prevents costly DB aggregations from being abused.
 */
export const heavyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: userKey,
  message: { error: 'Muitas requisições para este endpoint. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** Strict IP-based limiter for admin login — 5 attempts per 15 min per IP. */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login admin. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** General limiter for authenticated admin API endpoints — 200 req / 15 min per IP. */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Limite de requisições admin excedido.' },
  standardHeaders: true,
  legacyHeaders: false,
})
