import { useState } from 'react'
import { Lightbulb, Loader2, BellOff, History, Plus } from 'lucide-react'
import { useInsights } from '@/hooks/useInsights'
import { useMicroGoals } from '@/hooks/useMicroGoals'
import { useCategories } from '@/hooks/useCategories'
import { InsightCard } from '@/components/insights/InsightCard'
import { MicroGoalCard } from '@/components/insights/MicroGoalCard'
import { MicroGoalModal } from '@/components/insights/MicroGoalModal'
import { AlertChip } from '@/components/dashboard/InsightsPanel'
import { Button } from '@/components/ui/button'
import { MicroGoal, InsightSeverity } from '@/types'

// ─── Tab type ────────────────────────────────────────────────────────────────

type Tab = 'ACTIVE' | 'SNOOZED' | 'DISMISSED'

// ─── Severity filter ──────────────────────────────────────────────────────────

const SEVERITY_FILTERS: { label: string; value: InsightSeverity | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Crítico', value: 'CRITICAL' },
  { label: 'Atenção', value: 'WARNING' },
]

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
  const [activeTab, setActiveTab] = useState<Tab>('ACTIVE')
  const [severityFilter, setSeverityFilter] = useState<InsightSeverity | 'ALL'>('ALL')
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<MicroGoal | null>(null)

  // Fetch insights for each tab separately
  const activeInsights = useInsights('ACTIVE')
  const snoozedInsights = useInsights('SNOOZED')
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

  // Alert chip: show only the most critical, and only when there are truly ACTIVE (not snoozed) insights
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
    if (confirm('Excluir esta micro-meta?')) {
      await remove(id)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'ACTIVE', label: 'Ativos', icon: Lightbulb },
    { id: 'SNOOZED', label: 'Silenciados', icon: BellOff },
    { id: 'DISMISSED', label: 'Histórico', icon: History },
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

      {/* Alert chip — only in Ativos tab, only the most critical, only when there are active insights */}
      {activeTab === 'ACTIVE' && mostCriticalAlert && (
        <div className="flex flex-wrap gap-2">{mostCriticalAlert}</div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
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
          {activeTab === 'ACTIVE' && filteredInsights.length + (data?.insights.length ?? 0) > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {SEVERITY_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setSeverityFilter(value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    severityFilter === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                  }`}
                >
                  {label}
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

          {/* Micro-metas section (Ativos tab only) */}
          {activeTab === 'ACTIVE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">Micro-metas</h2>
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
                <div className="border border-dashed border-border rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Crie micro-metas para acompanhar limites de gastos em categorias específicas.
                  </p>
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
