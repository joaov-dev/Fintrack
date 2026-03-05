/**
 * privacy.controller — LGPD/GDPR Data Subject Rights
 *
 * Endpoints (all under /api/v1/privacy):
 *
 *   GET    /consent           — current consent state (per type)
 *   PUT    /consent           — update optional consent (marketing, analytics)
 *   GET    /consent/history   — full immutable consent audit trail
 *   GET    /me                — structured view of all personal data (Art. 18 II)
 *   GET    /export            — downloadable JSON export (Art. 18 V — portability)
 *   DELETE /account           — erasure request (Art. 18 VI — right to be forgotten)
 *
 *   [Admin only]:
 *   GET    /breaches              — list all breach records
 *   POST   /breaches              — record a new breach
 *   GET    /breaches/:id          — get breach + ANPD deadline status
 *   PATCH  /breaches/:id          — update breach (containment, notifications)
 *   GET    /breaches/:id/report   — generate ANPD Formulário JSON
 *
 * Data minimization: endpoints return only the minimum data needed.
 * Erasure: soft-delete with 30-day cooling-off, hard-delete by retentionService.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { ConsentType } from '@prisma/client'
import { prisma } from '../services/prisma'
import { buildUserExport } from '../services/dataExportService'
import {
  createBreach, updateBreach, getBreach, listBreaches,
  buildAnpdReport, getOverdueAnpdNotifications,
} from '../services/breachService'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { AuthRequest } from '../middlewares/auth.middleware'

// ── Policy versions ───────────────────────────────────────────────────────────

const POLICY_VERSIONS = {
  TERMS_OF_SERVICE: '1.0',
  PRIVACY_POLICY:   '1.0',
  MARKETING_EMAIL:  '1.0',
  ANALYTICS:        '1.0',
} as const satisfies Record<ConsentType, string>

const MANDATORY_CONSENTS: ConsentType[] = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY']
const OPTIONAL_CONSENTS:  ConsentType[] = ['MARKETING_EMAIL', 'ANALYTICS']

const ERASURE_COOLING_OFF_DAYS = 30  // LGPD Art. 18 — reasonable time for processing

// ── GET /consent ──────────────────────────────────────────────────────────────

export async function getConsent(req: AuthRequest, res: Response) {
  const userId = req.userId!

  // Latest record per consent type = current state
  const history = await prisma.consentRecord.findMany({
    where:   { userId },
    select:  { consentType: true, version: true, granted: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const current: Record<string, unknown> = {}
  for (const r of history) {
    current[r.consentType] = {
      granted:   r.granted,
      version:   r.version,
      updatedAt: r.createdAt,
    }
  }

  return res.json({
    current,
    policyVersions: POLICY_VERSIONS,
    mandatoryTypes: MANDATORY_CONSENTS,
    optionalTypes:  OPTIONAL_CONSENTS,
  })
}

// ── PUT /consent ──────────────────────────────────────────────────────────────

const updateConsentSchema = z.object({
  consents: z.array(z.object({
    type:    z.enum(['MARKETING_EMAIL', 'ANALYTICS']),  // only optional types
    granted: z.boolean(),
  })).min(1),
})

export async function updateConsent(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const { consents } = updateConsentSchema.parse(req.body)

  const ip        = req.ip ?? null
  const userAgent = req.headers['user-agent'] ?? null

  // Write each consent as a new immutable record (append-only log)
  await prisma.consentRecord.createMany({
    data: consents.map(c => ({
      userId,
      consentType: c.type as ConsentType,
      version:     POLICY_VERSIONS[c.type as ConsentType],
      granted:     c.granted,
      ip,
      userAgent,
    })),
  })

  logger.info('Consent updated', {
    userId,
    changes: consents.map(c => ({ type: c.type, granted: c.granted })),
    requestId: req.requestId,
  })

  return res.json({ ok: true })
}

// ── GET /consent/history ──────────────────────────────────────────────────────

export async function getConsentHistory(req: AuthRequest, res: Response) {
  const userId = req.userId!

  const history = await prisma.consentRecord.findMany({
    where:   { userId },
    select:  {
      consentType: true, version: true, granted: true,
      ip: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json({ history })
}

// ── GET /me — structured access to all personal data ─────────────────────────

export async function getPersonalData(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const data   = await buildUserExport(userId, prisma)

  audit('SENSITIVE_READ', userId, req, { _resourceId: userId })

  return res.json(data)
}

// ── GET /export — downloadable JSON file ─────────────────────────────────────

export async function exportPersonalData(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const data   = await buildUserExport(userId, prisma)

  audit('SENSITIVE_READ', userId, req, { _resourceId: userId, reason: 'portability_export' })

  const filename = `dominahub-export-${userId}-${new Date().toISOString().slice(0,10)}.json`

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.json(data)
}

// ── DELETE /account — erasure request ────────────────────────────────────────

const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
  reason:       z.string().max(500).optional(),
})

export async function requestErasure(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const { confirmEmail, reason } = deleteAccountSchema.parse(req.body)

  const user = await prisma.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { email: true },
  })

  // Require explicit email confirmation to prevent accidental deletions
  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(400).json({
      error: 'Email de confirmação não corresponde ao email da conta',
    })
  }

  // Check if already pending
  const existing = await prisma.deletedAccount.findUnique({ where: { userId } })
  if (existing) {
    return res.status(409).json({
      error:       'Solicitação de exclusão já registrada',
      scheduledAt: existing.scheduledAt.toISOString(),
    })
  }

  const scheduledAt = new Date(Date.now() + ERASURE_COOLING_OFF_DAYS * 24 * 60 * 60 * 1000)

  // Record the erasure request (soft-delete tombstone)
  await prisma.deletedAccount.create({
    data: { userId, email: user.email, scheduledAt },
  })

  // Revoke all sessions immediately (user is effectively logged out)
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data:  { revokedAt: new Date() },
  })

  // Audit the erasure request
  audit('CLEAR_ACCOUNT_DATA', userId, req, {
    _resourceId: userId,
    reason:      reason ?? 'user_erasure_request',
    scheduledAt: scheduledAt.toISOString(),
  })

  logger.info('Erasure requested', {
    userId,
    scheduledAt: scheduledAt.toISOString(),
    reason,
    requestId: req.requestId,
  })

  return res.json({
    message:     `Solicitação registrada. Seus dados serão excluídos permanentemente em ${ERASURE_COOLING_OFF_DAYS} dias.`,
    scheduledAt: scheduledAt.toISOString(),
    cancelBefore: scheduledAt.toISOString(),
    note:         'Você pode cancelar esta solicitação contactando suporte@dominahub.com.br antes da data agendada.',
  })
}

// ── DELETE /account/cancel — cancel pending erasure ──────────────────────────

export async function cancelErasure(req: AuthRequest, res: Response) {
  const userId = req.userId!

  const record = await prisma.deletedAccount.findUnique({ where: { userId } })
  if (!record) {
    return res.status(404).json({ error: 'Nenhuma solicitação de exclusão pendente' })
  }
  if (record.completedAt) {
    return res.status(410).json({ error: 'A exclusão já foi concluída e não pode ser revertida' })
  }

  await prisma.deletedAccount.delete({ where: { userId } })

  logger.info('Erasure cancelled', { userId, requestId: req.requestId })

  return res.json({ message: 'Solicitação de exclusão cancelada com sucesso.' })
}

// ── Admin: Breach Management ──────────────────────────────────────────────────

const createBreachSchema = z.object({
  title:         z.string().min(5).max(200),
  description:   z.string().min(10),
  severity:      z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedCount: z.number().int().positive().optional(),
  dataTypes:     z.array(z.string()).min(1),
  detectedAt:    z.string().datetime(),
  notes:         z.string().max(2000).optional(),
})

const updateBreachSchema = z.object({
  status:          z.enum(['DETECTED','INVESTIGATING','CONTAINED','NOTIFIED_ANPD','NOTIFIED_USERS','CLOSED']).optional(),
  containedAt:     z.string().datetime().optional(),
  anpdNotifiedAt:  z.string().datetime().optional(),
  usersNotifiedAt: z.string().datetime().optional(),
  affectedCount:   z.number().int().positive().optional(),
  notes:           z.string().max(2000).optional(),
})

export async function listBreachesHandler(req: Request, res: Response) {
  const breaches = await listBreaches(prisma)
  return res.json({ breaches })
}

export async function createBreachHandler(req: AuthRequest, res: Response) {
  const input = createBreachSchema.parse(req.body)
  const breach = await createBreach({
    ...input,
    detectedAt: new Date(input.detectedAt),
    createdBy:  req.userId!,
  }, prisma)
  return res.status(201).json({ breach })
}

export async function getBreachHandler(req: Request, res: Response) {
  const breach = await getBreach(req.params.id, prisma)
  return res.json({ breach })
}

export async function updateBreachHandler(req: Request, res: Response) {
  const input = updateBreachSchema.parse(req.body)
  const breach = await updateBreach(req.params.id, {
    ...input,
    containedAt:     input.containedAt     ? new Date(input.containedAt)     : undefined,
    anpdNotifiedAt:  input.anpdNotifiedAt  ? new Date(input.anpdNotifiedAt)  : undefined,
    usersNotifiedAt: input.usersNotifiedAt ? new Date(input.usersNotifiedAt) : undefined,
  }, prisma)
  return res.json({ breach })
}

export async function getBreachReportHandler(req: Request, res: Response) {
  const breach = await getBreach(req.params.id, prisma)
  const report = buildAnpdReport(breach)
  return res.json({ report })
}

export async function checkOverdueAnpdHandler(_req: Request, res: Response) {
  const overdue = await getOverdueAnpdNotifications(prisma)
  return res.json({
    count:   overdue.length,
    breaches: overdue.map(b => ({
      id: b.id, title: b.title, severity: b.severity,
      detectedAt: b.detectedAt.toISOString(),
    })),
  })
}
