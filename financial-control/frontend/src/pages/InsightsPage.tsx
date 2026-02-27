import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lightbulb, Loader2, BellOff, History, Plus, Zap, ArrowRight,
  CalendarClock, TrendingDown, TrendingUp, Target, Wallet, Bell,
  AlertTriangle, CheckCircle2, ChevronRight,
} from 'lucide-react'
import { useInsights } from '@/hooks/useInsights'
import { useMicroGoals } from '@/hooks/useMicroGoals'
import { useCategories } from '@/hooks/useCategories'
import { InsightCard } from '@/components/insights/InsightCard'
import { MicroGoalCard } from '@/components/insights/MicroGoalCard'
import { MicroGoalModal } from '@/components/insights/MicroGoalModal'
import { AlertChip } from '@/components/dashboard/InsightsPanel'
import { Button } from '@/components/ui/button'
import { Insight, InsightType, InsightCTA, MicroGoal, InsightSeverity } from '@/types'
import { cn } from '@/lib/utils'

// ─── Tab type ────────────────────────────────────────────────────────────────

type Tab = 'ACTIVE' | 'SNOOZED' | 'DISMISSED'

// ─── Severity filter ──────────────────────────────────────────────────────────

const SEVERITY_FILTERS: { label: string; value: InsightSeverity | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Crítico', value: 'CRITICAL' },
  { label: 'Atenção', value: 'WARNING' },
]

// ─── Next-actions config ──────────────────────────────────────────────────────

/** Lower = higher priority in the Próximas Ações panel */
const ACTION_PRIORITY: Partial<Record<InsightType, number>> = {
  DUE_PAYMENT:           0,
  MICRO_GOAL_BREACHED:   1,
  HIGH_CC_UTILIZATION:   2,
  BUDGET_AT_RISK:        3,
  MICRO_GOAL_AT_RISK:    4,
  OUTLIER_SPEND:         5,
  CATEGORY_SPIKE:        6,
  LOW_EMERGENCY_RESERVE: 7,
  HIGH_CREDIT_DEPENDENCY:8,
  NEGATIVE_CASHFLOW:     9,
  HIGH_FIXED_COSTS:      10,
  NEW_SUBSCRIPTION:      11,
  STAGNANT_NET_WORTH:    12,
}

type ActionCfg = { icon: React.ComponentType<{ className?: string }>; verb: string }
const ACTION_CONFIG: Partial<Record<InsightType, ActionCfg>> = {
  DUE_PAYMENT:            { icon: CalendarClock, verb: 'Pagar' },
  BUDGET_AT_RISK:         { icon: TrendingDown,  verb: 'Reduzir gastos' },
  MICRO_GOAL_BREACHED:    { icon: Target,        verb: 'Meta ultrapassada' },
  MICRO_GOAL_AT_RISK:     { icon: Target,        verb: 'Meta em risco' },
  HIGH_CC_UTILIZATION:    { icon: AlertTriangle, verb: 'Pagar fatura' },
  OUTLIER_SPEND:          { icon: TrendingUp,    verb: 'Gasto elevado' },
  CATEGORY_SPIKE:         { icon: TrendingUp,    verb: 'Pico detectado' },
  LOW_EMERGENCY_RESERVE:  { icon: Wallet,        verb: 'Poupar' },
  HIGH_CREDIT_DEPENDENCY: { icon: Wallet,        verb: 'Reduzir dívidas' },
  NEGATIVE_CASHFLOW:      { icon: TrendingDown,  verb: 'Cashflow negativo' },
  HIGH_FIXED_COSTS:       { icon: TrendingDown,  verb: 'Custos altos' },
  NEW_SUBSCRIPTION:       { icon: Bell,          verb: 'Nova assinatura' },
  STAGNANT_NET_WORTH:     { icon: Lightbulb,     verb: 'Patrimônio' },
}

const SEVERITY_ACCENT: Record<InsightSeverity, { border: string; badge: string; icon: string }> = {
  CRITICAL: { border: 'border-l-rose-500',  badge: 'bg-rose-100 text-rose-700',  icon: 'text-rose-600' },
  WARNING:  { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-600' },
  INFO:     { border: 'border-l-blue-400',  badge: 'bg-blue-100 text-blue-700',   icon: 'text-blue-600' },
}

// ─── Build CTA URL ────────────────────────────────────────────────────────────

function buildCtaPath(cta: InsightCTA): string {
  if (!cta.params || Object.keys(cta.params).length === 0) return cta.route
  return `${cta.route}?${new URLSearchParams(cta.params).toString()}`
}

// ─── Next Action Card ─────────────────────────────────────────────────────────

function NextActionCard({ insight, onNavigate }: { insight: Insight; onNavigate: (path: string) => void }) {
  const cfg = ACTION_CONFIG[insight.type] ?? { icon: Lightbulb, verb: 'Ver' }
  const accent = SEVERITY_ACCENT[insight.severity]
  const Icon = cfg.icon

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card flex flex-col border-l-4 overflow-hidden',
      accent.border,
    )}>
      <div className="px-4 pt-4 pb-3 flex-1 space-y-2">
        {/* Type label */}
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', accent.icon)}>
          {cfg.verb}
        </span>

        {/* Icon + title */}
        <div className="flex items-start gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', accent.badge.replace('text-', 'text-').split(' ')[0] + ' ' + 'bg-opacity-50')}>
            <Icon className={cn('w-4 h-4', accent.icon)} />
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{insight.title}</p>
        </div>

        {/* Message */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{insight.message}</p>
      </div>

      {/* CTA */}
      {insight.cta && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onNavigate(buildCtaPath(insight.cta!))}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
              insight.severity === 'CRITICAL'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : insight.severity === 'WARNING'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white',
            )}
          >
            {insight.cta.label}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Próximas Ações Panel ─────────────────────────────────────────────────────

function NextActionsPanel({
  insights,
  onNavigate,
  onViewAll,
}: {
  insights: Insight[]
  onNavigate: (path: string) => void
  onViewAll: () => void
}) {
  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
            <Zap className="w-3 h-3 text-primary" />
          </div>
          Próximas Ações
        </h2>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ver todos
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className={cn(
        'grid gap-3',
        insights.length === 1 ? 'grid-cols-1 max-w-xs' :
        insights.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
        'grid-cols-1 sm:grid-cols-3',
      )}>
        {insights.map((insight) => (
          <NextActionCard key={insight.id} insight={insight} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

// ─── Micro-goals summary bar ──────────────────────────────────────────────────

function MicroGoalsSummary({ microGoals }: { microGoals: MicroGoal[] }) {
  if (microGoals.length === 0) return null
  const onTrack  = microGoals.filter((g) => g.status === 'ON_TRACK').length
  const atRisk   = microGoals.filter((g) => g.status === 'AT_RISK').length
  const breached = microGoals.filter((g) => g.status === 'BREACHED').length

  return (
    <div className="flex items-center gap-4 text-xs">
      {onTrack > 0 && (
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="w-3 h-3" />
          {onTrack} em dia
        </span>
      )}
      {atRisk > 0 && (
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          {atRisk} em risco
        </span>
      )}
      {breached > 0 && (
        <span className="flex items-center gap-1 text-rose-600">
          <Target className="w-3 h-3" />
          {breached} ultrapassada{breached > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Lightbulb className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('ACTIVE')
  const [severityFilter, setSeverityFilter] = useState<InsightSeverity | 'ALL'>('ALL')
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<MicroGoal | null>(null)

  const activeInsights   = useInsights('ACTIVE')
  const snoozedInsights  = useInsights('SNOOZED')
  const dismissedInsights = useInsights('DISMISSED')

  const { microGoals, isLoading: goalsLoading, create, update, remove } = useMicroGoals()
  const { categories } = useCategories()

  const currentHook = activeTab === 'ACTIVE'
    ? activeInsights
    : activeTab === 'SNOOZED'
      ? snoozedInsights
      : dismissedInsights

  const { data, isLoading } = currentHook

  const dismiss = async (id: string) => {
    await currentHook.dismiss(id)
    dismissedInsights.refetch()
  }

  const snooze = async (id: string, days?: number) => {
    await currentHook.snooze(id, days)
    activeInsights.refetch()
    snoozedInsights.refetch()
  }

  const reactivate = async (id: string) => {
    await currentHook.reactivate(id)
    activeInsights.refetch()
  }

  const filteredInsights = (data?.insights ?? []).filter(
    (ins) => severityFilter === 'ALL' || ins.severity === severityFilter,
  )

  const alerts = activeInsights.data?.alerts

  // Top-3 most actionable ACTIVE insights (have a CTA, sorted by priority)
  const nextActions = useMemo(() => {
    const active = (activeInsights.data?.insights ?? []).filter(
      (i) => i.status === 'ACTIVE' && i.cta,
    )
    return [...active]
      .sort((a, b) => (ACTION_PRIORITY[a.type] ?? 99) - (ACTION_PRIORITY[b.type] ?? 99))
      .slice(0, 3)
  }, [activeInsights.data])

  const hasActiveInsights = activeInsights.data?.insights.some((i) => i.status === 'ACTIVE') ?? false

  const mostCriticalAlert: React.ReactNode = (() => {
    if (!alerts || !hasActiveInsights) return null
    if (alerts.negativeBalanceProjection) return <AlertChip type="projection" />
    if (alerts.overdueLiabilities > 0) return <AlertChip type="overdue" count={alerts.overdueLiabilities} />
    if (alerts.budgetExceeded) return <AlertChip type="budget" />
    return null
  })()

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const handleSaveGoal = async (payload: Parameters<typeof create>[0]) => {
    if (editingGoal) {
      await update(editingGoal.id, {
        name: payload.name,
        limitAmount: payload.limitAmount,
        endDate: payload.endDate,
      })
    } else {
      await create(payload)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Excluir esta micro-meta?')) await remove(id)
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    {
      id: 'ACTIVE',
      label: 'Ativos',
      icon: Lightbulb,
      count: (activeInsights.data?.insights ?? []).filter((i) => i.status === 'ACTIVE').length || undefined,
    },
    { id: 'SNOOZED',   label: 'Silenciados', icon: BellOff },
    { id: 'DISMISSED', label: 'Histórico',   icon: History },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Insights</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Análises automáticas da sua saúde financeira, atualizadas em tempo real.
        </p>
      </div>

      {/* Alert chip */}
      {activeTab === 'ACTIVE' && mostCriticalAlert && (
        <div className="flex flex-wrap gap-2">{mostCriticalAlert}</div>
      )}

      {/* ── Próximas Ações ── */}
      {activeTab === 'ACTIVE' && nextActions.length > 0 && (
        <NextActionsPanel
          insights={nextActions}
          onNavigate={(path) => navigate(path)}
          onViewAll={() => setSeverityFilter('ALL')}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count !== undefined && count > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Severity filter (Ativos only) */}
          {activeTab === 'ACTIVE' && (data?.insights.length ?? 0) > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {SEVERITY_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setSeverityFilter(value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    severityFilter === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30',
                  )}
                >
                  {label}
                  {value !== 'ALL' && (
                    <span className="ml-1 opacity-60">
                      ({(data?.insights ?? []).filter((i) => i.severity === value).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Insight list */}
          {filteredInsights.length === 0 ? (
            <EmptyState
              message={
                activeTab === 'ACTIVE'
                  ? 'Nenhum insight ativo no momento. Suas finanças parecem estar em ordem!'
                  : activeTab === 'SNOOZED'
                    ? 'Nenhum insight silenciado.'
                    : 'Nenhum insight no histórico.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredInsights.map((insight, i) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={dismiss}
                  onSnooze={snooze}
                  onReactivate={reactivate}
                  hideDismiss={activeTab === 'DISMISSED'}
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          )}

          {/* ── Micro-metas section (Ativos tab only) ── */}
          {activeTab === 'ACTIVE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">Micro-metas</h2>
                  <MicroGoalsSummary microGoals={microGoals} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingGoal(null); setGoalModalOpen(true) }}
                  className="gap-1.5 text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova meta
                </Button>
              </div>

              {goalsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : microGoals.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <Target className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Defina metas de gasto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie limites para categorias específicas e acompanhe seu progresso ao longo do mês.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingGoal(null); setGoalModalOpen(true) }}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Criar primeira meta
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {microGoals.map((goal) => (
                    <MicroGoalCard
                      key={goal.id}
                      goal={goal}
                      categoryName={goal.scopeRefId ? categoryMap.get(goal.scopeRefId) : undefined}
                      onEdit={(g) => { setEditingGoal(g); setGoalModalOpen(true) }}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <MicroGoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onSave={handleSaveGoal}
        categories={categories}
        editGoal={editingGoal}
      />
    </div>
  )
}
