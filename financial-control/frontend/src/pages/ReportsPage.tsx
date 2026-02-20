import { useState, useMemo } from 'react'
import { FileBarChart, Download, TrendingUp, TrendingDown, Wallet, Loader2, Scale, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactions } from '@/hooks/useTransactions'
import { useNetWorth } from '@/hooks/useNetWorth'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS, LIABILITY_TYPE_LABELS } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'

// ─── Preset periods ────────────────────────────────────────────────────────────

type PresetKey = '30d' | 'month' | '3m' | '6m' | 'year' | 'custom'

interface Period {
  startDate: string
  endDate: string
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildPeriod(preset: PresetKey, custom: { start: string; end: string }): Period {
  const now = new Date()
  const today = toISO(now)

  switch (preset) {
    case '30d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { startDate: toISO(start), endDate: today }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: toISO(start), endDate: toISO(end) }
    }
    case '3m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: toISO(start), endDate: toISO(end) }
    }
    case '6m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: toISO(start), endDate: toISO(end) }
    }
    case 'year': {
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: `${now.getFullYear()}-12-31`,
      }
    }
    case 'custom':
      return { startDate: custom.start, endDate: custom.end }
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '30d',   label: 'Últimos 30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: '3m',    label: '3 meses' },
  { key: '6m',    label: '6 meses' },
  { key: 'year',  label: 'Este ano' },
  { key: 'custom', label: 'Personalizado' },
]

// ─── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(rows: { date: string; description: string; type: string; category: string; account: string; amount: number }[]) {
  const header = 'Data,Descrição,Tipo,Categoria,Conta,Valor'
  const lines = rows.map((r) =>
    [r.date, `"${r.description}"`, r.type, `"${r.category}"`, `"${r.account}"`, r.amount.toFixed(2)].join(','),
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Month-label helper ────────────────────────────────────────────────────────

function shortMonthLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [preset, setPreset] = useState<PresetKey>('3m')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { snapshot, history, isLoading: isLoadingNetWorth } = useNetWorth(12)

  const period = useMemo(
    () => buildPeriod(preset, { start: customStart, end: customEnd }),
    [preset, customStart, customEnd],
  )

  const isValidPeriod = Boolean(period.startDate && period.endDate && period.startDate <= period.endDate)

  const { transactions, isLoading } = useTransactions(
    isValidPeriod
      ? { startDate: period.startDate + 'T00:00:00.000Z', endDate: period.endDate + 'T23:59:59.999Z' }
      : {},
  )

  // ── Separar transferências de movimentações regulares ────────────────────────
  const { regularTx, totalInvested } = useMemo(() => {
    const regularTx = transactions.filter((t) => !t.transferId)
    // EXPENSE transfers = dinheiro saindo para investimentos (cada aporte gera 1 EXPENSE + 1 INCOME)
    // Somamos apenas o lado EXPENSE para não contar duplo
    const totalInvested = transactions
      .filter((t) => t.transferId && t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0)
    return { regularTx, totalInvested }
  }, [transactions])

  // ── Summary ──────────────────────────────────────────────────────────────────
  const { totalIncome, totalExpense } = useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0
    for (const t of regularTx) {
      if (t.type === 'INCOME') totalIncome += Number(t.amount)
      else totalExpense += Number(t.amount)
    }
    return { totalIncome, totalExpense }
  }, [regularTx])

  // ── Monthly bar chart data ───────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    for (const t of regularTx) {
      const key = t.date.slice(0, 7) // "YYYY-MM"
      if (!map[key]) map[key] = { income: 0, expense: 0 }
      if (t.type === 'INCOME') map[key].income += Number(t.amount)
      else map[key].expense += Number(t.amount)
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        month: shortMonthLabel(key + '-01'),
        income: v.income,
        expense: v.expense,
      }))
  }, [regularTx])

  // ── Category pie chart data ──────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; color: string; amount: number }> = {}
    for (const t of regularTx) {
      if (t.type !== 'EXPENSE') continue
      const { categoryId, category, amount } = t
      if (!map[categoryId]) map[categoryId] = { name: category.name, color: category.color, amount: 0 }
      map[categoryId].amount += Number(amount)
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [regularTx])

  // ── CSV rows ─────────────────────────────────────────────────────────────────
  const csvRows = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((t) => ({
          date: t.date.slice(0, 10),
          description: t.description,
          type: t.transferId ? 'Transferência' : t.type === 'INCOME' ? 'Receita' : 'Despesa',
          category: t.category.name,
          account: t.account?.name ?? '',
          amount: Number(t.amount),
        })),
    [transactions],
  )

  const formatTooltipValue = (value: number) => formatCurrency(value)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-0.5">Análise detalhada das suas finanças</p>
        </div>
        <Button
          variant="outline"
          disabled={csvRows.length === 0}
          onClick={() => exportCSV(csvRows)}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Period selector */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Período</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                preset === p.key
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-3">
            <Input
              type="date"
              className="w-44"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-slate-400 text-sm">até</span>
            <Input
              type="date"
              className="w-44"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* ── Patrimônio Líquido (always visible, independent of period) ─── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patrimônio Líquido</p>

        {/* Snapshot cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-100">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Ativos Totais</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {isLoadingNetWorth ? '—' : formatCurrency(snapshot?.totalAssets ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Soma dos saldos de todas as contas</p>
            </CardContent>
          </Card>

          <Card className="border-rose-100">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Passivos Totais</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {isLoadingNetWorth ? '—' : formatCurrency(snapshot?.totalLiabilities ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Soma de todas as dívidas</p>
            </CardContent>
          </Card>

          <Card className={cn('border-violet-100', snapshot && snapshot.netWorth < 0 && 'border-rose-200')}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-violet-600 mb-2">
                <Scale className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Patrimônio Líquido</span>
              </div>
              <p className={cn(
                'text-2xl font-bold',
                !snapshot || snapshot.netWorth >= 0 ? 'text-violet-700' : 'text-rose-600',
              )}>
                {isLoadingNetWorth ? '—' : formatCurrency(snapshot?.netWorth ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Ativos − Passivos</p>
            </CardContent>
          </Card>
        </div>

        {/* Evolution chart */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução do Patrimônio (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={history} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="totalAssets" name="Ativos" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line dataKey="totalLiabilities" name="Passivos" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line dataKey="netWorth" name="Patrimônio" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Breakdown */}
        {snapshot && (Object.keys(snapshot.byAccountType).length > 0 || Object.keys(snapshot.byLiabilityType).length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(snapshot.byAccountType).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Ativos por Tipo de Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(snapshot.byAccountType)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([type, amount]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS] ?? type}</span>
                        <span className={cn('font-semibold', (amount as number) >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                          {formatCurrency(amount as number)}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {Object.keys(snapshot.byLiabilityType).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Passivos por Tipo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(snapshot.byLiabilityType)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([type, amount]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{LIABILITY_TYPE_LABELS[type as keyof typeof LIABILITY_TYPE_LABELS] ?? type}</span>
                        <span className="font-semibold text-rose-600">{formatCurrency(amount as number)}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {!isLoading && isValidPeriod && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Receitas</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-slate-400 mt-1">Excluindo transferências</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-rose-500 mb-2">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Despesas</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpense)}</p>
                <p className="text-xs text-slate-400 mt-1">Excluindo transferências</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Saldo</span>
                </div>
                <p className={cn(
                  'text-2xl font-bold',
                  totalIncome - totalExpense >= 0 ? 'text-slate-900' : 'text-rose-600',
                )}>
                  {formatCurrency(totalIncome - totalExpense)}
                </p>
              </CardContent>
            </Card>
            {totalInvested > 0 && (
              <Card className="border-violet-200 bg-violet-50/50">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 text-violet-600 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Aportes</span>
                  </div>
                  <p className="text-2xl font-bold text-violet-700">{formatCurrency(totalInvested)}</p>
                  <p className="text-xs text-violet-400 mt-1">Valor investido no período</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Charts row */}
          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        width={48}
                      />
                      <Tooltip formatter={formatTooltipValue} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pie chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-[240px] text-slate-400 text-sm">
                      Sem despesas no período
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="amount"
                          nameKey="name"
                        >
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category ranking table */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ranking de Gastos por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryData.map((cat, i) => {
                  const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400 w-5">{i + 1}.</span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                          <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(cat.amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: cat.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {regularTx.length === 0 && totalInvested === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-16 gap-3">
                <FileBarChart className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 text-sm">Nenhuma transação encontrada no período selecionado</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
