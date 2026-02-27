import { useState } from 'react'
import {
  Loader2, CalendarClock, TrendingUp, TrendingDown, Wallet, Info,
  ChevronDown, CheckCircle2, XCircle, ArrowRight, Building2,
} from 'lucide-react'
import { useMonthlyProjection } from '@/hooks/useMonthlyProjection'
import {
  CalendarDay, CalendarDayEvent, MonthlyProjection, ProjectionItem,
  ForecastScenario, AccountProjection,
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function currentMonthLabel(): string {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

// ─── Scenario config ──────────────────────────────────────────────────────────

type ScenarioId = 'optimistic' | 'base' | 'conservative'

const SCENARIO_STYLE: Record<ScenarioId, {
  activeBorder: string
  activeBg: string
  activeText: string
  badge: string
}> = {
  optimistic: {
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    activeText: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  base: {
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50 dark:bg-blue-950/30',
    activeText: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  conservative: {
    activeBorder: 'border-rose-400',
    activeBg: 'bg-rose-50 dark:bg-rose-950/30',
    activeText: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-700',
  },
}

// ─── Scenario selector ────────────────────────────────────────────────────────

function ScenarioSelector({
  scenarios,
  active,
  onChange,
}: {
  scenarios: ForecastScenario[]
  active: ScenarioId
  onChange: (id: ScenarioId) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {scenarios.map((s) => {
        const style = SCENARIO_STYLE[s.id]
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              'rounded-xl border-2 px-4 py-3 text-left transition-all duration-150',
              isActive
                ? `${style.activeBorder} ${style.activeBg}`
                : 'border-border bg-card hover:border-border/80',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-xs font-semibold uppercase tracking-wide', isActive ? style.activeText : 'text-muted-foreground')}>
                {s.name}
              </span>
              {isActive && <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', style.badge)}>ativo</span>}
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-2">{s.description}</p>
            <p className={cn(
              'text-lg font-bold',
              s.expectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}>
              {s.expectedBalance >= 0 ? '+' : ''}{formatCurrency(s.expectedBalance)}
            </p>
          </button>
        )
      })}
    </div>
  )
}

// ─── Premises panel ───────────────────────────────────────────────────────────

function PremisesPanel({ scenario }: { scenario: ForecastScenario }) {
  const [open, setOpen] = useState(false)
  const style = SCENARIO_STYLE[scenario.id]

  return (
    <div className={cn('rounded-xl border-2 overflow-hidden transition-colors', open ? style.activeBorder : 'border-border')}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Premissas — cenário {scenario.name}</span>
          <span className="text-xs text-muted-foreground">({scenario.premises.filter(p => p.included).length}/{scenario.premises.length} incluídas)</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenario.premises.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                {p.included
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                }
                <span className={cn('text-xs', p.included ? 'text-foreground' : 'text-muted-foreground line-through')}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Scenario summary cards ───────────────────────────────────────────────────

function ScenarioSummary({
  scenario,
  onIncomeInfo,
  onExpenseInfo,
}: {
  scenario: ForecastScenario
  onIncomeInfo: () => void
  onExpenseInfo: () => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Balance */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Saldo Projetado</p>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
              scenario.expectedBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            )}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={cn('text-2xl font-bold', scenario.expectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {scenario.expectedBalance >= 0 ? '+' : ''}{formatCurrency(scenario.expectedBalance)}
          </p>
        </CardContent>
      </Card>

      {/* Income */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Receita Projetada</p>
            <div className="flex items-center gap-1">
              <button
                onClick={onIncomeInfo}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {formatCurrency(scenario.projectedIncome)}
          </p>
        </CardContent>
      </Card>

      {/* Expense */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Despesa Projetada</p>
            <div className="flex items-center gap-1">
              <button
                onClick={onExpenseInfo}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {formatCurrency(scenario.projectedExpense)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Confirmed vs Estimated ───────────────────────────────────────────────────

function ConfirmedVsEstimated({ data }: { data: MonthlyProjection }) {
  const { incomeBreakdown, expenseBreakdown, confirmedIncome, confirmedExpense, estimatedVariableExpense, dailyVariableAvg, daysRemaining } = data
  const realizedIncome = incomeBreakdown.realizedItems.reduce((s, i) => s + i.amount, 0)
  const futureIncome = incomeBreakdown.recurringItems.reduce((s, i) => s + i.amount, 0)
  const liabilityTotal = expenseBreakdown.liabilityItems.reduce((s, i) => s + i.amount, 0)
  const ccTotal = expenseBreakdown.ccItems.reduce((s, i) => s + i.amount, 0)
  const fixedExpense = expenseBreakdown.fixedRealizedItems.reduce((s, i) => s + i.amount, 0)
  const futureExpense = expenseBreakdown.recurringItems.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Confirmado */}
      <Card className="border-emerald-200 dark:border-emerald-900/50">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Confirmado
          </CardTitle>
          <p className="text-xs text-muted-foreground">Valores já realizados ou com data prevista</p>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {/* Income confirmed */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receitas</p>
            {realizedIncome > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realizadas</span>
                <span className="font-medium text-emerald-600">{formatCurrency(realizedIncome)}</span>
              </div>
            )}
            {futureIncome > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recorrências futuras</span>
                <span className="font-medium text-emerald-600">{formatCurrency(futureIncome)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-1">
              <span>Total confirmado</span>
              <span className="text-emerald-600">{formatCurrency(confirmedIncome)}</span>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Expense confirmed */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Despesas</p>
            {fixedExpense > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fixas realizadas</span>
                <span className="font-medium text-rose-600">{formatCurrency(fixedExpense)}</span>
              </div>
            )}
            {futureExpense > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recorrências futuras</span>
                <span className="font-medium text-rose-600">{formatCurrency(futureExpense)}</span>
              </div>
            )}
            {liabilityTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcelas de passivos</span>
                <span className="font-medium text-rose-600">{formatCurrency(liabilityTotal)}</span>
              </div>
            )}
            {ccTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Faturas de cartão</span>
                <span className="font-medium text-rose-600">{formatCurrency(ccTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-1">
              <span>Total comprometido</span>
              <span className="text-rose-600">{formatCurrency(confirmedExpense)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimado */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4" />
            Estimado
          </CardTitle>
          <p className="text-xs text-muted-foreground">Projeção baseada no comportamento histórico</p>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Média diária de variáveis</span>
              <span className="font-medium">{formatCurrency(dailyVariableAvg)}/dia</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dias restantes no mês</span>
              <span className="font-medium">{daysRemaining} dias</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
              <span>Variáveis estimadas (100%)</span>
              <span className="text-amber-600">{formatCurrency(estimatedVariableExpense)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Faixas por cenário</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Otimista (0%)</span>
              <span className="font-medium text-emerald-600">{formatCurrency(0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Realista (100%)</span>
              <span className="font-medium text-blue-600">{formatCurrency(estimatedVariableExpense)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pessimista (130%)</span>
              <span className="font-medium text-rose-600">{formatCurrency(Math.round(estimatedVariableExpense * 1.3 * 100) / 100)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Per-account projections ──────────────────────────────────────────────────

function AccountProjectionCards({ projections }: { projections: AccountProjection[] }) {
  if (projections.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {projections.map((p) => {
        const delta = p.futureInflow - p.futureOutflow
        const hasActivity = p.futureInflow > 0 || p.futureOutflow > 0
        return (
          <Card key={p.accountId} className="overflow-hidden">
            <CardContent className="pt-4 pb-4">
              {/* Account header */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: p.accountColor }}
                />
                <span className="text-sm font-semibold truncate">{p.accountName}</span>
              </div>

              {/* Balances */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo atual</span>
                  <span className={cn('font-medium', p.currentBalance < 0 ? 'text-rose-600' : '')}>
                    {formatCurrency(p.currentBalance)}
                  </span>
                </div>

                {hasActivity && (
                  <>
                    {p.futureInflow > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entradas previstas</span>
                        <span className="font-medium text-emerald-600">+{formatCurrency(p.futureInflow)}</span>
                      </div>
                    )}
                    {p.futureOutflow > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Saídas previstas</span>
                        <span className="font-medium text-rose-600">-{formatCurrency(p.futureOutflow)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Projected balance */}
                <div className={cn(
                  'flex justify-between text-sm font-semibold border-t border-border pt-1.5 mt-1',
                )}>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ArrowRight className="w-3 h-3" />
                    <span>Projetado</span>
                  </div>
                  <span className={p.projectedBalance < 0 ? 'text-rose-600' : 'text-foreground'}>
                    {formatCurrency(p.projectedBalance)}
                    {hasActivity && delta !== 0 && (
                      <span className={cn('ml-1 text-xs font-normal', delta >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                        ({delta >= 0 ? '+' : ''}{formatCurrency(delta)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Accordion group ──────────────────────────────────────────────────────────

function AccordionGroup({
  title,
  items,
  color,
  defaultOpen = false,
}: {
  title: string
  items: ProjectionItem[]
  color: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  const total = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={cn('text-sm font-semibold', color)}>{formatCurrency(total)}</span>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/20 min-w-0">
              <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">{item.label}</span>
              <span className={cn('text-sm font-medium shrink-0', color)}>{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Breakdown modals ─────────────────────────────────────────────────────────

function IncomeBreakdownModal({
  open, onClose, data,
}: { open: boolean; onClose: () => void; data: MonthlyProjection }) {
  const { incomeBreakdown, confirmedIncome } = data

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receita do Mês — Detalhes</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <AccordionGroup
            title="Receitas já realizadas"
            items={incomeBreakdown.realizedItems}
            color="text-emerald-600"
            defaultOpen
          />
          <AccordionGroup
            title="Recorrências futuras no mês"
            items={incomeBreakdown.recurringItems}
            color="text-emerald-600"
          />

          <div className="flex justify-between font-semibold text-sm pt-2 px-1 border-t border-border">
            <span>Total Confirmado</span>
            <span className="text-emerald-600">{formatCurrency(confirmedIncome)}</span>
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            Receitas realizadas este mês + receitas recorrentes ainda previstas para o mês.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ExpenseBreakdownModal({
  open, onClose, data,
}: { open: boolean; onClose: () => void; data: MonthlyProjection }) {
  const { expenseBreakdown, confirmedExpense, estimatedVariableExpense, dailyVariableAvg, variableExpenses } = data
  const { fixedRealizedItems, recurringItems, liabilityItems, ccItems } = expenseBreakdown

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Despesa do Mês — Detalhes</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <AccordionGroup
            title="Recorrências já realizadas"
            items={fixedRealizedItems}
            color="text-rose-600"
            defaultOpen
          />
          <AccordionGroup
            title="Recorrências futuras no mês"
            items={recurringItems}
            color="text-rose-600"
          />
          <AccordionGroup
            title="Parcelas de passivos"
            items={liabilityItems}
            color="text-rose-600"
          />
          <AccordionGroup
            title="Faturas de cartão de crédito"
            items={ccItems}
            color="text-rose-600"
          />

          <div className="flex justify-between font-semibold text-sm pt-2 px-1 border-t border-border">
            <span>Total Comprometido</span>
            <span className="text-rose-600">{formatCurrency(confirmedExpense)}</span>
          </div>

          {variableExpenses > 0 && (
            <div className="rounded-lg bg-muted/60 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Despesas variáveis (informativo)
              </p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Realizados até hoje</span>
                <span>{formatCurrency(variableExpenses - estimatedVariableExpense)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Estimativa restante (100%)</span>
                <span>{formatCurrency(estimatedVariableExpense)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Média de {formatCurrency(dailyVariableAvg)}/dia — incluídos no cenário Realista e Pessimista.
              </p>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground px-1">
            Recorrências fixas + parcelas mensais de passivos + faturas de cartão com vencimento neste mês.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function EventDots({ events }: { events: CalendarDayEvent[] }) {
  const hasIncome = events.some((e) => e.type === 'INCOME' && !e.isLiability)
  const hasExpense = events.some((e) => e.type === 'EXPENSE' && !e.isLiability)
  const hasLiability = events.some((e) => e.isLiability)
  if (!hasIncome && !hasExpense && !hasLiability) return null
  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {hasIncome    && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {hasExpense   && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
      {hasLiability && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
    </div>
  )
}

function CalendarGrid({ days }: { days: CalendarDay[] }) {
  if (days.length === 0) return null
  const firstDate = new Date(days[0].date + 'T12:00:00')
  const startOffset = firstDate.getDay()

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white dark:bg-slate-900 h-16" />
        ))}
        {days.map((day) => {
          const dayNum = new Date(day.date + 'T12:00:00').getDate()
          const hasEvents = day.events.length > 0
          return (
            <div
              key={day.date}
              className={cn(
                'relative flex flex-col items-center pt-2 pb-1 h-16 transition-colors',
                day.isToday ? 'bg-primary/5' :
                day.isPast  ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900',
                hasEvents && !day.isPast && !day.isToday && 'bg-white dark:bg-slate-900',
              )}
              title={day.events.map((e) => `${e.isLiability ? '[Passivo]' : e.type === 'INCOME' ? '+' : '-'} ${e.label}: ${formatCurrency(e.amount)}`).join('\n')}
            >
              <span className={cn(
                'text-sm leading-none',
                day.isToday ? 'font-bold text-primary bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full' :
                day.isPast  ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium',
              )}>
                {dayNum}
              </span>
              <EventDots events={day.events} />
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Receita</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Despesa</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Passivo</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const { data, isLoading } = useMonthlyProjection()
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('base')
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  const scenario = data?.scenarios.find((s) => s.id === activeScenario)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Fluxo Mensal</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {currentMonthLabel()} — projeções por cenário e por conta
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data && scenario ? (
        <>
          {/* ── Scenario selector ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cenários</h2>
            <ScenarioSelector
              scenarios={data.scenarios}
              active={activeScenario}
              onChange={setActiveScenario}
            />
          </div>

          {/* ── Selected scenario summary ── */}
          <ScenarioSummary
            scenario={scenario}
            onIncomeInfo={() => setIncomeModalOpen(true)}
            onExpenseInfo={() => setExpenseModalOpen(true)}
          />

          {/* ── Premises panel ── */}
          <PremisesPanel scenario={scenario} />

          {/* ── Confirmed vs Estimated ── */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">Base de Cálculo</h2>
            <ConfirmedVsEstimated data={data} />
          </div>

          {/* ── Per-account projection ── */}
          {data.accountProjections.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Projeção por Conta
              </h2>
              <AccountProjectionCards projections={data.accountProjections} />
            </div>
          )}

          {/* ── Financial calendar ── */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                Calendário Financeiro — {currentMonthLabel()}
              </CardTitle>
              <p className="text-xs text-slate-400">
                {data.daysRemaining > 0 ? `${data.daysRemaining} dias restantes no mês` : 'Último dia do mês'}
              </p>
            </CardHeader>
            <CardContent className="pb-5">
              <CalendarGrid days={data.calendarDays} />
            </CardContent>
          </Card>

          {/* ── Methodology ── */}
          <Card className="border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Como os cenários são calculados
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Otimista</span> — receita confirmada (realizada + recorrências futuras) e somente despesas comprometidas (sem variáveis)</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Realista</span> — receita confirmada + despesas comprometidas + 100% da estimativa de variáveis (média diária × dias restantes)</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Pessimista</span> — somente receita já realizada + despesas comprometidas + 130% da estimativa de variáveis</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Projeção por conta</span> — saldo atual + entradas/saídas recorrentes previstas (exceto cartões de crédito e contas de investimento)</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Transferências</span> não entram no cálculo</li>
              </ul>
            </CardContent>
          </Card>

          {/* ── Modals ── */}
          <IncomeBreakdownModal open={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} data={data} />
          <ExpenseBreakdownModal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} data={data} />
        </>
      ) : null}
    </div>
  )
}
