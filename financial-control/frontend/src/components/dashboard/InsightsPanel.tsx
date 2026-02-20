import { AlertTriangle, AlertCircle, TrendingDown, Clock, PiggyBank, BarChart2 } from 'lucide-react'
import { Insight, InsightsAlerts, InsightsResponse } from '@/types'
import { cn } from '@/lib/utils'

// ─── Alert chips ──────────────────────────────────────────────────────────────

const ALERT_CONFIG = {
  budget: {
    icon: AlertTriangle,
    label: 'Orçamento excedido',
    className: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  overdue: {
    icon: Clock,
    label: (count: number) => `${count} passivo${count > 1 ? 's' : ''} vencido${count > 1 ? 's' : ''}`,
    className: 'bg-rose-50 border-rose-200 text-rose-700',
  },
  projection: {
    icon: TrendingDown,
    label: 'Saldo negativo previsto',
    className: 'bg-rose-50 border-rose-200 text-rose-700',
  },
}

function AlertChip({ type, count }: { type: keyof typeof ALERT_CONFIG; count?: number }) {
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

// ─── Individual insight card ───────────────────────────────────────────────────

const INSIGHT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'negative-cashflow':      TrendingDown,
  'high-fixed-costs':       AlertTriangle,
  'stagnant-net-worth':     PiggyBank,
  'low-emergency-reserve':  PiggyBank,
  'high-credit-dependency': AlertCircle,
}

const SEVERITY_STYLE = {
  CRITICAL: {
    border: 'border-l-rose-500',
    bg: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    icon: 'text-rose-500',
    label: 'Crítico',
  },
  WARNING: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-500',
    label: 'Atenção',
  },
  INFO: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-500',
    label: 'Info',
  },
}

function InsightCard({ insight }: { insight: Insight }) {
  const style = SEVERITY_STYLE[insight.severity]
  const Icon = INSIGHT_ICON[insight.id] ?? AlertCircle

  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border-l-4', style.border, style.bg)}>
      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', style.icon)} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', style.badge)}>
            {style.label}
          </span>
        </div>
        <p className="text-xs text-slate-600">{insight.message}</p>
        <p className="text-xs text-slate-500 italic">→ {insight.suggestedAction}</p>
      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function hasActiveAlerts(alerts: InsightsAlerts): boolean {
  return alerts.budgetExceeded || alerts.overdueLiabilities > 0 || alerts.negativeBalanceProjection
}

interface InsightsPanelProps {
  data: InsightsResponse
}

export function InsightsPanel({ data }: InsightsPanelProps) {
  // No financial data yet — prompt the user to add their history
  if (!data.hasEnoughData) {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        <BarChart2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
        <p className="text-sm">
          Adicione seu histórico de transações e saldo para gerar insights diários e atualizados.
        </p>
      </div>
    )
  }

  const showAlerts   = hasActiveAlerts(data.alerts)
  const showInsights = data.insights.length > 0

  if (!showAlerts && !showInsights) return null

  return (
    <div className="space-y-3">
      {/* Compact alert chips row */}
      {showAlerts && (
        <div className="flex flex-wrap gap-2">
          {data.alerts.budgetExceeded && <AlertChip type="budget" />}
          {data.alerts.overdueLiabilities > 0 && (
            <AlertChip type="overdue" count={data.alerts.overdueLiabilities} />
          )}
          {data.alerts.negativeBalanceProjection && <AlertChip type="projection" />}
        </div>
      )}

      {/* Insight cards */}
      {showInsights && (
        <div className="space-y-2">
          {data.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}

// Named export so FinancialHealthPage can reuse the chip without coupling
export { AlertChip, hasActiveAlerts }
