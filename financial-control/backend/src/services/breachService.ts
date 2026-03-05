/**
 * breachService — LGPD Art. 48 Breach Management
 *
 * LGPD Art. 48 requires the controller to notify:
 *   a) The ANPD (Autoridade Nacional de Proteção de Dados)
 *   b) Affected data subjects
 * within a "reasonable time" — ANPD guidelines specify 72 hours for high-risk
 * incidents (Resolução CD/ANPD nº 2/2022).
 *
 * This service:
 *   • Creates / updates breach records in the database
 *   • Computes the ANPD 72-hour notification deadline
 *   • Emits structured log lines for CloudWatch alerting
 *   • Generates the ANPD notification report (Formulário ANPD) as JSON
 *   • Tracks notification status (ANPD + affected users)
 *
 * Breach lifecycle:
 *   DETECTED → INVESTIGATING → CONTAINED → NOTIFIED_ANPD → NOTIFIED_USERS → CLOSED
 */

import { PrismaClient, BreachSeverity, BreachStatus } from '@prisma/client'
import { logger } from '../lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateBreachInput {
  title:         string
  description:   string
  severity:      BreachSeverity
  affectedCount?: number
  dataTypes:     string[]  // e.g. ['email', 'financial_data', 'ip_address']
  detectedAt:    Date
  createdBy:     string    // admin userId
  notes?:        string
}

export interface UpdateBreachInput {
  status?:          BreachStatus
  containedAt?:     Date
  anpdNotifiedAt?:  Date
  usersNotifiedAt?: Date
  affectedCount?:   number
  notes?:           string
}

// ── ANPD deadline computation ─────────────────────────────────────────────────

const ANPD_DEADLINE_HOURS: Record<BreachSeverity, number> = {
  CRITICAL: 72,   // Resolução CD/ANPD nº 2/2022 — mandatory 72h for high-risk
  HIGH:     72,
  MEDIUM:   72,   // Notify to be safe; regulation may not strictly require it
  LOW:      0,    // Low severity: internal tracking only, no notification required
}

export function anpdDeadline(detectedAt: Date, severity: BreachSeverity): Date | null {
  const hours = ANPD_DEADLINE_HOURS[severity]
  if (hours === 0) return null
  return new Date(detectedAt.getTime() + hours * 60 * 60 * 1000)
}

export function anpdDeadlineStatus(detectedAt: Date, severity: BreachSeverity, anpdNotifiedAt: Date | null) {
  const deadline = anpdDeadline(detectedAt, severity)
  if (!deadline) return { required: false }

  const now       = Date.now()
  const remaining = deadline.getTime() - now
  const breached  = remaining < 0

  return {
    required:        true,
    deadline:        deadline.toISOString(),
    notified:        anpdNotifiedAt !== null,
    remainingMs:     breached ? 0 : remaining,
    remainingHours:  breached ? 0 : Math.ceil(remaining / 3_600_000),
    overdue:         !anpdNotifiedAt && breached,
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createBreach(
  input: CreateBreachInput,
  prisma: PrismaClient,
) {
  const breach = await prisma.breachRecord.create({
    data: {
      title:         input.title,
      description:   input.description,
      severity:      input.severity,
      affectedCount: input.affectedCount ?? null,
      dataTypes:     input.dataTypes,
      detectedAt:    input.detectedAt,
      status:        'DETECTED',
      createdBy:     input.createdBy,
      notes:         input.notes ?? null,
    },
  })

  // Alert immediately via structured log → CloudWatch Metric Filter
  logger.warn('BREACH_DETECTED', {
    breachId:     breach.id,
    title:        breach.title,
    severity:     breach.severity,
    affectedCount: breach.affectedCount,
    dataTypes:    breach.dataTypes,
    detectedAt:   breach.detectedAt.toISOString(),
    anpdDeadline: anpdDeadline(breach.detectedAt, breach.severity)?.toISOString(),
  })

  return enrichBreach(breach)
}

export async function updateBreach(
  id: string,
  input: UpdateBreachInput,
  prisma: PrismaClient,
) {
  const breach = await prisma.breachRecord.update({
    where: { id },
    data:  {
      status:          input.status          ?? undefined,
      containedAt:     input.containedAt     ?? undefined,
      anpdNotifiedAt:  input.anpdNotifiedAt  ?? undefined,
      usersNotifiedAt: input.usersNotifiedAt ?? undefined,
      affectedCount:   input.affectedCount   ?? undefined,
      notes:           input.notes           ?? undefined,
    },
  })

  if (input.anpdNotifiedAt) {
    logger.info('BREACH_ANPD_NOTIFIED', {
      breachId:      breach.id,
      notifiedAt:    input.anpdNotifiedAt.toISOString(),
      hoursSinceDetection: Math.round(
        (input.anpdNotifiedAt.getTime() - breach.detectedAt.getTime()) / 3_600_000
      ),
    })
  }

  return enrichBreach(breach)
}

export async function getBreach(id: string, prisma: PrismaClient) {
  const breach = await prisma.breachRecord.findUniqueOrThrow({ where: { id } })
  return enrichBreach(breach)
}

export async function listBreaches(prisma: PrismaClient) {
  const breaches = await prisma.breachRecord.findMany({
    orderBy: { detectedAt: 'desc' },
  })
  return breaches.map(enrichBreach)
}

// ── Enrich with computed fields ────────────────────────────────────────────────

function enrichBreach(breach: {
  id: string; title: string; description: string; severity: BreachSeverity
  affectedCount: number | null; dataTypes: string[]; detectedAt: Date
  containedAt: Date | null; anpdNotifiedAt: Date | null
  usersNotifiedAt: Date | null; status: BreachStatus
  notes: string | null; createdBy: string; createdAt: Date; updatedAt: Date
}) {
  return {
    ...breach,
    anpdStatus: anpdDeadlineStatus(breach.detectedAt, breach.severity, breach.anpdNotifiedAt),
  }
}

// ── ANPD Notification Report ──────────────────────────────────────────────────

/**
 * Generates a JSON report in the format required by the ANPD Formulário de
 * Comunicação de Incidente de Segurança (Resolução CD/ANPD nº 2/2022).
 *
 * This output is intended to be filled in on: https://www.gov.br/anpd/
 * or submitted via the ANPD's official API if/when available.
 */
export function buildAnpdReport(breach: Awaited<ReturnType<typeof getBreach>>) {
  return {
    // Seção 1 — Identificação do Controlador
    controller: {
      name:      'DominaHub Tecnologia Ltda',  // replace with real CNPJ/name
      cnpj:      'XX.XXX.XXX/XXXX-XX',
      dpoName:   'Nome do DPO',
      dpoEmail:  'dpo@dominahub.com.br',
      dpoPhone:  '+55 (XX) XXXX-XXXX',
    },

    // Seção 2 — Dados do Incidente
    incident: {
      id:             breach.id,
      title:          breach.title,
      description:    breach.description,
      severity:       breach.severity,
      detectedAt:     breach.detectedAt.toISOString(),
      containedAt:    breach.containedAt?.toISOString() ?? 'Não confirmado',
      reportedAt:     new Date().toISOString(),
    },

    // Seção 3 — Dados Afetados
    affectedData: {
      estimatedTitulares: breach.affectedCount ?? 'Não determinado',
      tiposDados:         breach.dataTypes,
      dadosSensiveis:     breach.dataTypes.some(t =>
        ['cpf', 'cnpj', 'health_data', 'financial_data', 'biometric'].includes(t)
      ),
    },

    // Seção 4 — Medidas Adotadas
    measures: {
      containmentActions: 'Ver campo notas',
      notificationStatus: {
        anpdNotified:    breach.anpdNotifiedAt !== null,
        anpdNotifiedAt:  breach.anpdNotifiedAt?.toISOString() ?? null,
        usersNotified:   breach.usersNotifiedAt !== null,
        usersNotifiedAt: breach.usersNotifiedAt?.toISOString() ?? null,
      },
    },

    // Seção 5 — Informações Adicionais
    notes: breach.notes ?? '',

    _generatedAt: new Date().toISOString(),
    _policyRef:   'LGPD Art. 48 + Resolução CD/ANPD nº 2/2022',
  }
}

// ── Overdue check (for monitoring / alerting) ─────────────────────────────────

/**
 * Returns all breaches where ANPD notification is required but overdue.
 * Called by retentionService or a scheduled check.
 */
export async function getOverdueAnpdNotifications(prisma: PrismaClient) {
  const pending = await prisma.breachRecord.findMany({
    where: {
      anpdNotifiedAt: null,
      status:        { notIn: ['CLOSED'] },
      severity:      { in: ['CRITICAL', 'HIGH', 'MEDIUM'] },
    },
  })

  const overdue = pending.filter(b => {
    const deadline = anpdDeadline(b.detectedAt, b.severity)
    return deadline && Date.now() > deadline.getTime()
  })

  if (overdue.length > 0) {
    logger.warn('BREACH_ANPD_OVERDUE', {
      count:    overdue.length,
      breaches: overdue.map(b => ({
        id:          b.id,
        title:       b.title,
        severity:    b.severity,
        detectedAt:  b.detectedAt.toISOString(),
        hoursOverdue: Math.ceil((Date.now() - b.detectedAt.getTime() - 72 * 3_600_000) / 3_600_000),
      })),
    })
  }

  return overdue
}
