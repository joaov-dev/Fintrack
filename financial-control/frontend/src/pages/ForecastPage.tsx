import { useState } from 'react'
import { Loader2, CalendarClock, TrendingUp, TrendingDown, Wallet, Info, ChevronDown } from 'lucide-react'
import { useMonthlyProjection } from '@/hooks/useMonthlyProjection'
import { CalendarDay, CalendarDayEvent, MonthlyProjection, ProjectionItem } from '@/types'
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
  const { incomeBreakdown, projectedIncome } = data

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
            <span>Total Projetado</span>
            <span className="text-emerald-600">{formatCurrency(projectedIncome)}</span>
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
  const { expenseBreakdown, projectedExpense, variableExpenses, dailyVariableAvg } = data
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
            <span>Total Projetado</span>
            <span className="text-rose-600">{formatCurrency(projectedExpense)}</span>
          </div>

          {variableExpenses > 0 && (
            <div className="rounded-lg bg-muted/60 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Despesas variáveis (informativo)
              </p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Gastos variáveis realizados</span>
                <span>{formatCurrency(variableExpenses)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Média de {formatCurrency(dailyVariableAvg)}/dia — não incluídos na projeção.
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

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  signed?: boolean
  onInfo?: () => void
}

function SummaryCard({ label, value, icon: Icon, colorClass, signed, onInfo }: SummaryCardProps) {
  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">{label}</p>
          <div className="flex items-center gap-1.5">
            {onInfo && (
              <button
                onClick={onInfo}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Ver detalhes"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass)}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        </div>
        <p className={cn(
          'text-2xl font-bold',
          signed && value < 0 ? 'text-rose-600' : signed && value >= 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-50',
        )}>
          {signed && value >= 0 ? '+' : ''}{formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Expense breakdown ────────────────────────────────────────────────────────

function ExpenseBreakdown({
  fixedExpenses, variableExpenses, dailyVariableAvg,
}: {
  fixedExpenses: number
  variableExpenses: number
  dailyVariableAvg: number
}) {
  const total = Math.max(fixedExpenses + variableExpenses, 1)
  const fixedPct = Math.round((fixedExpenses / total) * 100)
  const variablePct = Math.round((variableExpenses / total) * 100)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Despesas Fixas</p>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{fixedPct}%</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(fixedExpenses)}</p>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-slate-500 rounded-full transition-all duration-500" style={{ width: `${fixedPct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">Recorrentes + instâncias de recorrências</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Despesas Variáveis</p>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{variablePct}%</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(variableExpenses)}</p>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${variablePct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">Média diária: {formatCurrency(dailyVariableAvg)}/dia</p>
        </CardContent>
      </Card>
    </div>
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
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Fluxo Mensal</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {currentMonthLabel()} — visão geral de entradas e saídas do mês
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Saldo do Mês"
              value={data.expectedBalance}
              icon={Wallet}
              colorClass={data.expectedBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
              signed
            />
            <SummaryCard
              label="Receita do Mês"
              value={data.projectedIncome}
              icon={TrendingUp}
              colorClass="bg-emerald-100 text-emerald-600"
              onInfo={() => setIncomeModalOpen(true)}
            />
            <SummaryCard
              label="Despesa do Mês"
              value={data.projectedExpense}
              icon={TrendingDown}
              colorClass="bg-rose-100 text-rose-600"
              onInfo={() => setExpenseModalOpen(true)}
            />
          </div>

          {/* Expense breakdown */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">Composição das Despesas</h2>
            <ExpenseBreakdown
              fixedExpenses={data.fixedExpenses}
              variableExpenses={data.variableExpenses}
              dailyVariableAvg={data.dailyVariableAvg}
            />
          </div>

          {/* Calendar */}
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

          {/* Methodology */}
          <Card className="border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Como os valores são calculados
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Receita do mês</span> — todas as receitas realizadas (recorrentes + únicas) + receitas recorrentes futuras previstas</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Despesa do mês</span> — todas as despesas realizadas + recorrências futuras + parcelas de passivos + faturas de cartão</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Despesas variáveis</span> — média diária calculada com base nos gastos únicos realizados até hoje</li>
                <li><span className="font-medium text-slate-600 dark:text-slate-400">Transferências</span> não entram no cálculo</li>
              </ul>
            </CardContent>
          </Card>

          {/* Breakdown modals */}
          <IncomeBreakdownModal open={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} data={data} />
          <ExpenseBreakdownModal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} data={data} />
        </>
      ) : null}
    </div>
  )
}
