import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { logger } from '../lib/logger'

const isProd = process.env.NODE_ENV === 'production'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Attach a unique request ID to every error response for traceability
  const requestId = randomUUID()
  res.setHeader('X-Request-Id', requestId)

  // ── Zod validation errors → 400 with structured field details ────────────
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  // ── Prisma known errors → mapped to safe HTTP responses ──────────────────
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({ error: 'Recurso já existe' })
      case 'P2025': // Record not found
        return res.status(404).json({ error: 'Recurso não encontrado' })
      case 'P2003': // Foreign key constraint failed
        return res.status(400).json({ error: 'Referência inválida' })
      case 'P2014': // Relation violation
        return res.status(400).json({ error: 'Operação inválida' })
      default:
        logger.warn('Prisma unhandled error', { code: err.code, message: err.message })
        return res.status(400).json({ error: 'Operação inválida' })
    }
  }

  // ── Malformed JSON body ───────────────────────────────────────────────────
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' })
  }

  // ── Payload too large (express body-parser) ───────────────────────────────
  if ((err as NodeJS.ErrnoException).type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload muito grande' })
  }

  // ── Unhandled errors — never leak stack traces in production ─────────────
  logger.error('Unhandled server error', {
    requestId,
    method: req.method,
    path: req.path,
    message: err.message,
    ...(isProd ? {} : { stack: err.stack }),
  })

  return res.status(500).json({
    error: 'Erro interno do servidor',
    ...(isProd ? { requestId } : { requestId, detail: err.message }),
  })
}
