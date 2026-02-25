import { Link } from 'react-router-dom'
import { AlertTriangle, TrendingDown, Clock, BarChart2, ArrowRight } from 'lucide-react'
import { InsightsAlerts, InsightsResponse } from '@/types'
import { InsightCard } from '@/components/insights/InsightCard'
import { cn } from '@/lib/utils'

// ─── Alert chips ──────────────────────────────────────────────────────────────

const ALERT_CONFIG = {
  budget: {
    icon: AlertTriangle,
    label: 'Orçamento excedido',
    className: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  },
  overdue: {
    icon: Clock,
    label: (count: number) => `${count} passivo${count > 1 ? 's' : ''} vencido${count > 1 ? 's' : ''}`,
    className: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  },
  projection: {
    icon: TrendingDown,
    label: 'Saldo negativo previsto',
    className: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  },
}

export function AlertChip({ type, count }: { type: keyof typeof ALERT_CONFIG; count?: number }) {
  const cfg = ALERT_CONFIG[type]
  const Icon = cfg.icon
  const label = type === 'overdue' && count != null
    ? ALERT_CONFIG.overdue.label(count)
    : (cfg.label as string)

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium', cfg.className)}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hasActiveAlerts(alerts: InsightsAlerts): boolean {
  return alerts.budgetExceeded || alerts.overdueLiabilities > 0 || alerts.negativeBalanceProjection
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface InsightsPanelProps {
  data: InsightsResponse
  onDismiss: (id: string) => Promise<void>
  onSnooze: (id: string, days?: number) => Promise<void>
}

export function InsightsPanel({ data, onDismiss, onSnooze }: InsightsPanelProps) {
  if (!data.hasEnoughData) {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-500">
        <BarChart2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
        <p className="text-sm">
          Adicione seu histórico de transações e saldo para gerar insights diários e atualizados.
        </p>
      </div>
    )
  }

  const showAlerts = hasActiveAlerts(data.alerts)
  const top3 = data.insights.slice(0, 3)
  const total = data.insights.length

  if (!showAlerts && top3.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Alert chips */}
      {showAlerts && (
        <div className="flex flex-wrap gap-2">
          {data.alerts.budgetExceeded && <AlertChip type="budget" />}
          {data.alerts.overdueLiabilities > 0 && (
            <AlertChip type="overdue" count={data.alerts.overdueLiabilities} />
          )}
          {data.alerts.negativeBalanceProjection && <AlertChip type="projection" />}
        </div>
      )}

      {/* Top 3 insight cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {top3.map((insight, i) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* "Ver todos" link */}
      {total > 0 && (
        <Link
          to="/insights"
          className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline pt-0.5"
        >
          Ver todos os insights ({total})
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}
