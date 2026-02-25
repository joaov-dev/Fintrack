import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingDown, TrendingUp, Zap, Clock, AlertTriangle, Shield, CreditCard,
  Target, Building2, PauseCircle, ExternalLink, BellOff, X, ChevronRight, RotateCcw,
} from 'lucide-react'
import { Insight, InsightType, InsightSeverity } from '@/types'
import { InsightDrawer } from './InsightDrawer'

// ─── Icon & color helpers ────────────────────────────────────────────────────

const TYPE_ICONS: Record<InsightType, React.ElementType> = {
  NEGATIVE_CASHFLOW:    TrendingDown,
  HIGH_FIXED_COSTS:     Building2,
  STAGNANT_NET_WORTH:   PauseCircle,
  LOW_EMERGENCY_RESERVE: Shield,
  HIGH_CREDIT_DEPENDENCY: CreditCard,
  HIGH_CC_UTILIZATION:  CreditCard,
  OUTLIER_SPEND:        TrendingUp,
  CATEGORY_SPIKE:       Zap,
  DUE_PAYMENT:          Clock,
  BUDGET_AT_RISK:       AlertTriangle,
  MICRO_GOAL_AT_RISK:   Target,
  MICRO_GOAL_BREACHED:  Target,
  NEW_SUBSCRIPTION:     CreditCard,
}

const SEVERITY_STYLES: Record<InsightSeverity, { badge: string; icon: string; border: string }> = {
  CRITICAL: {
    badge:  'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
    icon:   'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
  WARNING: {
    badge:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    icon:   'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  INFO: {
    badge:  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    icon:   'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
  },
}

const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  CRITICAL: 'Crítico',
  WARNING:  'Atenção',
  INFO:     'Info',
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

// ─── Component ───────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: Insight
  onDismiss: (id: string) => Promise<void>
  onSnooze: (id: string, days?: number) => Promise<void>
  onReactivate?: (id: string) => Promise<void>
  hideDismiss?: boolean
  style?: React.CSSProperties
}

export function InsightCard({ insight, onDismiss, onSnooze, onReactivate, hideDismiss, style }: InsightCardProps) {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState<'dismiss' | 'snooze' | null>(null)

  const styles = SEVERITY_STYLES[insight.severity]
  const Icon = TYPE_ICONS[insight.type] ?? AlertTriangle
  const isSnoozed = insight.status === 'SNOOZED'
  const snoozeTitle = isSnoozed && insight.snoozedUntil
    ? `Silenciado até ${new Date(insight.snoozedUntil).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    : 'Silenciar por 7 dias'

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading('dismiss')
    try { await onDismiss(insight.id) } finally { setLoading(null) }
  }

  const handleSnooze = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading('snooze')
    try { await onSnooze(insight.id, 7) } finally { setLoading(null) }
  }

  const handleReactivate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading('dismiss')
    try { await onReactivate?.(insight.id) } finally { setLoading(null) }
  }

  const handleCta = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!insight.cta) return
    const { route, params } = insight.cta
    const query = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : ''
    navigate(route + query)
  }

  return (
    <>
      <div
        className={`group relative bg-card border rounded-xl p-4 cursor-pointer motion-safe:animate-fade-in transition-shadow hover:shadow-md ${styles.border}`}
        style={style}
        onClick={() => setDrawerOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setDrawerOpen(true)}
      >
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${styles.icon}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${styles.badge}`}>
                {SEVERITY_LABELS[insight.severity]}
              </span>
              {insight.createdAt && (
                <span className="text-[11px] text-muted-foreground">{relativeDate(insight.createdAt)}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">{insight.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.message}</p>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 mt-3 pl-12">
          {insight.cta && (
            <button
              onClick={handleCta}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {insight.cta.label}
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={isSnoozed ? undefined : handleSnooze}
              disabled={loading !== null || isSnoozed}
              title={snoozeTitle}
              className={`p-1 rounded transition-colors ${
                isSnoozed
                  ? 'text-amber-500 dark:text-amber-400 cursor-default'
                  : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted disabled:opacity-50'
              }`}
            >
              <BellOff className="w-3.5 h-3.5" />
            </button>
            {hideDismiss ? (
              <button
                onClick={handleReactivate}
                disabled={loading !== null}
                title="Restaurar como ativo"
                className="p-1 rounded text-muted-foreground/60 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                disabled={loading !== null}
                title="Dispensar"
                className="p-1 rounded text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <InsightDrawer
        insight={insight}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
        onReactivate={onReactivate}
        hideDismiss={hideDismiss}
      />
    </>
  )
}
