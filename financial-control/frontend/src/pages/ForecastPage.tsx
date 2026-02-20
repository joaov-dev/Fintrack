import { Loader2, CalendarClock, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useMonthlyProjection } from '@/hooks/useMonthlyProjection'
import { CalendarDay, CalendarDayEvent } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  signed?: boolean
}

function SummaryCard({ label, value, icon: Icon, colorClass, signed }: SummaryCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">{label}</p>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className={cn(
          'text-2xl font-bold',
          signed && value < 0 ? 'text-rose-600' : signed && value >= 0 ? 'text-emerald-600' : 'text-slate-900',
        )}>
          {signed && value >= 0 ? '+' : ''}{formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Expense breakdown ────────────────────────────────────────────────────────

function ExpenseBreakdown({
  fixedExpenses,
  variableExpenses,
  projectedExpense,
  dailyVariableAvg,
}: {
  fixedExpenses: number
  variableExpenses: number
  projectedExpense: number
  dailyVariableAvg: number
}) {
  const total = projectedExpense > 0 ? projectedExpense : 1
  const fixedPct = Math.round((fixedExpenses / total) * 100)
  const variablePct = Math.round((variableExpenses / total) * 100)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Fixed */}
      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Despesas Fixas</p>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{fixedPct}%</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(fixedExpenses)}</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-500 rounded-full transition-all duration-500" style={{ width: `${fixedPct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">Recorrentes + instâncias de recorrências</p>
        </CardContent>
      </Card>

      {/* Variable */}
      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Despesas Variáveis</p>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{variablePct}%</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(variableExpenses)}</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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

  // Determine the weekday of the first day (0=Sun … 6=Sat)
  const firstDate = new Date(days[0].date + 'T12:00:00')
  const startOffset = firstDate.getDay()

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
        {/* Empty cells before first day */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white h-16" />
        ))}

        {days.map((day) => {
          const dayNum = new Date(day.date + 'T12:00:00').getDate()
          const hasEvents = day.events.length > 0

          return (
            <div
              key={day.date}
              className={cn(
                'relative flex flex-col items-center pt-2 pb-1 h-16 transition-colors',
                day.isToday   ? 'bg-primary/5' :
                day.isPast    ? 'bg-slate-50' : 'bg-white',
                hasEvents && !day.isPast && !day.isToday && 'bg-white',
              )}
              title={day.events.map((e) => `${e.isLiability ? '[Passivo]' : e.type === 'INCOME' ? '+' : '-'} ${e.label}: ${formatCurrency(e.amount)}`).join('\n')}
            >
              <span className={cn(
                'text-sm leading-none',
                day.isToday  ? 'font-bold text-primary bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full' :
                day.isPast   ? 'text-slate-400' : 'text-slate-700 font-medium',
              )}>
                {dayNum}
              </span>
              <EventDots events={day.events} />
            </div>
          )
        })}
      </div>

      {/* Legend */}
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Previsão do Mês</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {currentMonthLabel()} — projeção baseada no histórico e recorrências
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
              label="Saldo Esperado no Fim do Mês"
              value={data.expectedBalance}
              icon={Wallet}
              colorClass={data.expectedBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
              signed
            />
            <SummaryCard
              label="Receita Projetada"
              value={data.projectedIncome}
              icon={TrendingUp}
              colorClass="bg-emerald-100 text-emerald-600"
            />
            <SummaryCard
              label="Despesa Projetada"
              value={data.projectedExpense}
              icon={TrendingDown}
              colorClass="bg-rose-100 text-rose-600"
            />
          </div>

          {/* Expense breakdown */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3">Composição das Despesas</h2>
            <ExpenseBreakdown
              fixedExpenses={data.fixedExpenses}
              variableExpenses={data.variableExpenses}
              projectedExpense={data.projectedExpense}
              dailyVariableAvg={data.dailyVariableAvg}
            />
          </div>

          {/* Calendar */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                Calendário Financeiro — {currentMonthLabel()}
              </CardTitle>
              <p className="text-xs text-slate-400">
                {data.daysRemaining > 0
                  ? `${data.daysRemaining} dias restantes no mês`
                  : 'Último dia do mês'}
              </p>
            </CardHeader>
            <CardContent className="pb-5">
              <CalendarGrid days={data.calendarDays} />
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card className="border-slate-100 bg-slate-50">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Como a projeção é calculada
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li><span className="font-medium text-slate-600">Receita projetada</span> — receitas realizadas + receitas recorrentes futuras no mês</li>
                <li><span className="font-medium text-slate-600">Despesa fixa</span> — despesas recorrentes realizadas + recorrentes futuras no mês</li>
                <li><span className="font-medium text-slate-600">Despesa variável</span> — realizadas + (média diária × dias restantes)</li>
                <li><span className="font-medium text-slate-600">Transferências</span> não entram no cálculo</li>
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
