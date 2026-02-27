import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  BarChart3, TrendingUp, TrendingDown, Wallet,
  Loader2, Plus, Pencil, Trash2, ArrowLeftRight, Target, Activity,
  ListOrdered, ChevronDown, ChevronUp, Repeat, Scale,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransfers } from '@/hooks/useTransfers'
import { useInvestmentPositions } from '@/hooks/useInvestmentPositions'
import { useInvestmentMovements } from '@/hooks/useInvestmentMovements'
import { useAllocationTargets } from '@/hooks/useAllocationTargets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TransferModal } from '@/components/investments/TransferModal'
import { InvestmentPositionModal } from '@/components/investments/InvestmentPositionModal'
import { MovementModal } from '@/components/investments/MovementModal'
import { useToast } from '@/hooks/use-toast'
import {
  Account, InvestmentPosition, InvestmentMovement, InvestmentPositionType,
  INVESTMENT_POSITION_TYPE_LABELS, INVESTMENT_POSITION_TYPE_COLORS,
  INVESTMENT_TYPE_HEX, INVESTMENT_MOVEMENT_TYPE_LABELS, INVESTMENT_MOVEMENT_TYPE_COLORS,
} from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { AddMovementPayload } from '@/hooks/useInvestmentMovements'

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: 'Visão Geral',    icon: BarChart3 },
  { id: 'positions',    label: 'Posições',        icon: ListOrdered },
  { id: 'movements',   label: 'Movimentações',   icon: Repeat },
  { id: 'allocation',  label: 'Alocação',         icon: Target },
  { id: 'performance', label: 'Rentabilidade',   icon: Activity },
] as const

type Tab = typeof TABS[number]['id']

const ASSET_TYPES: InvestmentPositionType[] = ['STOCK', 'FUND', 'FIXED_INCOME', 'REAL_ESTATE', 'CRYPTO', 'OTHER']

const RADIAN = Math.PI / 180
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: Record<string, number>) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function GainBadge({ value, pct, className }: { value: number; pct?: number; className?: string }) {
  const isPos = value >= 0
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-medium', isPos ? 'text-emerald-600' : 'text-rose-500', className)}>
      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPos ? '+' : ''}{formatCurrency(value)}
      {pct != null && ` (${isPos ? '+' : ''}${pct.toFixed(1)}%)`}
    </span>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={cn('text-2xl font-bold mt-1', color ?? 'text-slate-900')}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Account Selector Card ─────────────────────────────────────────────────────

function AccountCard({ account, selected, onClick, pct, portfolioValue, portfolioGain }: {
  account: Account; selected: boolean; onClick: () => void; pct: number
  portfolioValue: number; portfolioGain: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all hover:shadow-md',
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white dark:bg-slate-900 hover:border-slate-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: account.color }} />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{account.name}</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{pct.toFixed(0)}%</span>
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-3">{formatCurrency(portfolioValue)}</p>
      <GainBadge value={portfolioGain} className="mt-1" />
    </button>
  )
}

// ─── Position Card ─────────────────────────────────────────────────────────────

function PositionCard({ position, onEdit, onDelete, onMovement, expanded, onToggle }: {
  position: InvestmentPosition
  onEdit: () => void
  onDelete: () => void
  onMovement: () => void
  expanded: boolean
  onToggle: () => void
}) {
  const hasMovements = position.movements.length > 0
  const recentMovements = position.movements.slice(0, 3)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{position.name}</span>
              {position.ticker && (
                <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {position.ticker}
                </span>
              )}
            </div>
            <Badge className={cn('text-xs mt-1 border-0', INVESTMENT_POSITION_TYPE_COLORS[position.type])}>
              {INVESTMENT_POSITION_TYPE_LABELS[position.type]}
            </Badge>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{formatCurrency(position.currentValue)}</p>
            {position.costBasis > 0 && (
              <GainBadge value={position.unrealizedGain} pct={position.unrealizedGainPct} />
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
          {position.quantity != null && (
            <span className="text-slate-500">Qtd: <strong className="text-slate-700 dark:text-slate-300">{position.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</strong></span>
          )}
          {position.avgPrice != null && (
            <span className="text-slate-500">PM: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(position.avgPrice)}</strong></span>
          )}
          {position.costBasis > 0 && (
            <span className="text-slate-500">Custo: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(position.costBasis)}</strong></span>
          )}
          {position.totalContributions > 0 && (
            <span className="text-slate-500">Aportes: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(position.totalContributions)}</strong></span>
          )}
          {position.totalIncome > 0 && (
            <span className="text-emerald-600">Rendimentos: <strong>{formatCurrency(position.totalIncome)}</strong></span>
          )}
          {position.totalWithdrawals > 0 && (
            <span className="text-rose-500">Resgates: <strong>{formatCurrency(position.totalWithdrawals)}</strong></span>
          )}
          {position.totalContributions > 0 && (
            <span className={cn('col-span-2 font-semibold', position.totalReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
              Retorno total: {position.totalReturnPct >= 0 ? '+' : ''}{position.totalReturnPct.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Recent movements (expandable) */}
        {hasMovements && (
          <div>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={onToggle}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {position.movements.length} movimentaç{position.movements.length === 1 ? 'ão' : 'ões'}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge className={cn('border-0 px-1.5 py-0 text-[10px]', INVESTMENT_MOVEMENT_TYPE_COLORS[m.type])}>
                        {INVESTMENT_MOVEMENT_TYPE_LABELS[m.type]}
                      </Badge>
                      <span className="text-muted-foreground">{formatDate(m.date)}</span>
                    </div>
                    <span className={cn('font-medium', ['CONTRIBUTION'].includes(m.type) ? 'text-blue-600' : ['WITHDRAWAL'].includes(m.type) ? 'text-rose-500' : 'text-emerald-600')}>
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
                {position.movements.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    + {position.movements.length - 3} mais na aba Movimentações
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950"
            onClick={onMovement}
          >
            <Plus className="w-3.5 h-3.5" />
            Movimentação
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-600 hover:bg-rose-50" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab({
  investmentAccounts, totalBalance, allPositions, recentMovements,
  portfolioValueByAccount, portfolioGainByAccount,
}: {
  investmentAccounts: Account[]
  totalBalance: number
  allPositions: InvestmentPosition[]
  recentMovements: InvestmentMovement[]
  portfolioValueByAccount: Record<string, number>
  portfolioGainByAccount: Record<string, number>
}) {
  const totalContributions = allPositions.reduce((s, p) => s + p.totalContributions, 0)
  const totalIncome = allPositions.reduce((s, p) => s + p.totalIncome, 0)
  const totalPnL = allPositions.reduce((s, p) => s + p.totalPnL, 0)
  const totalReturnPct = totalContributions > 0 ? (totalPnL / totalContributions) * 100 : 0

  // Allocation by type
  const byType = useMemo(() => {
    const map: Partial<Record<InvestmentPositionType, number>> = {}
    for (const p of allPositions) {
      map[p.type] = (map[p.type] ?? 0) + p.currentValue
    }
    return ASSET_TYPES
      .filter((t) => (map[t] ?? 0) > 0)
      .map((t) => ({ name: INVESTMENT_POSITION_TYPE_LABELS[t], value: map[t]!, color: INVESTMENT_TYPE_HEX[t] }))
  }, [allPositions])

  // Top performers
  const performers = useMemo(() => {
    return [...allPositions]
      .filter((p) => p.totalContributions > 0)
      .sort((a, b) => b.totalReturnPct - a.totalReturnPct)
      .slice(0, 6)
  }, [allPositions])

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Patrimônio Total" value={formatCurrency(totalBalance)} />
        <StatCard label="Total Aportado" value={formatCurrency(totalContributions)} sub="Contribuições acumuladas" />
        <StatCard
          label="Rendimentos Recebidos"
          value={formatCurrency(totalIncome)}
          color="text-emerald-600"
          sub="Dividendos, JCP, cupons"
        />
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-slate-500">Retorno Total</p>
            <p className={cn('text-2xl font-bold mt-1', totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
              {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%
            </p>
            <GainBadge value={totalPnL} className="mt-0.5" />
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Allocation by type */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Alocação por Classe</CardTitle></CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum ativo cadastrado</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                    {byType.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Allocation by account */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Alocação por Conta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {investmentAccounts.map((acc) => {
              const pv = portfolioValueByAccount[acc.id] ?? 0
              const pg = portfolioGainByAccount[acc.id] ?? 0
              const pct = totalBalance > 0 ? (pv / totalBalance) * 100 : 0
              return (
                <div key={acc.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: acc.color }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatCurrency(pv)}</span>
                      <GainBadge value={pg} className="ml-2 inline-flex" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: acc.color }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers + Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Ativos por Retorno</CardTitle></CardHeader>
          <CardContent>
            {performers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Registre aportes para ver a performance</p>
            ) : (
              <div className="space-y-2">
                {performers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={cn('border-0 text-xs shrink-0', INVESTMENT_POSITION_TYPE_COLORS[p.type])}>
                        {INVESTMENT_POSITION_TYPE_LABELS[p.type]}
                      </Badge>
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      {p.ticker && <span className="text-xs text-muted-foreground font-mono">{p.ticker}</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-sm font-bold', p.totalReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                        {p.totalReturnPct >= 0 ? '+' : ''}{p.totalReturnPct.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(p.currentValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Últimas Movimentações</CardTitle></CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação registrada</p>
            ) : (
              <div className="space-y-2">
                {recentMovements.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={cn('border-0 text-xs shrink-0', INVESTMENT_MOVEMENT_TYPE_COLORS[m.type])}>
                        {INVESTMENT_MOVEMENT_TYPE_LABELS[m.type]}
                      </Badge>
                      <span className="truncate text-muted-foreground">
                        {m.position?.name ?? '—'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">{formatCurrency(m.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Positions Tab ─────────────────────────────────────────────────────────────

function PositionsTab({
  positions, investmentAccounts, selectedAccountId, onSelectAccount,
  onEdit, onDelete, onMovement,
}: {
  positions: InvestmentPosition[]
  investmentAccounts: Account[]
  selectedAccountId: string | null
  onSelectAccount: (id: string | null) => void
  onEdit: (p: InvestmentPosition) => void
  onDelete: (p: InvestmentPosition) => void
  onMovement: (p: InvestmentPosition) => void
}) {
  const [typeFilter, setTypeFilter] = useState<InvestmentPositionType | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = positions
    if (selectedAccountId) list = list.filter((p) => p.accountId === selectedAccountId)
    if (typeFilter) list = list.filter((p) => p.type === typeFilter)
    return list
  }, [positions, selectedAccountId, typeFilter])

  const usedTypes = useMemo(() => [...new Set(positions.map((p) => p.type))], [positions])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={selectedAccountId ?? ''}
          onChange={(e) => onSelectAccount(e.target.value || null)}
          className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas as contas</option>
          {investmentAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {usedTypes.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              typeFilter === t ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            {INVESTMENT_POSITION_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} ativo{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <BarChart3 className="w-10 h-10 text-slate-300" />
            <p className="text-slate-400 text-sm">Nenhum ativo encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PositionCard
              key={p.id}
              position={p}
              onEdit={() => onEdit(p)}
              onDelete={() => onDelete(p)}
              onMovement={() => onMovement(p)}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Movements Tab ─────────────────────────────────────────────────────────────

function MovementsTab({
  movements, positions, isLoading, onAdd, onDelete,
}: {
  movements: InvestmentMovement[]
  positions: InvestmentPosition[]
  isLoading: boolean
  onAdd: () => void
  onDelete: (m: InvestmentMovement) => void
}) {
  const [filterPosition, setFilterPosition] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo]   = useState('')

  const filtered = useMemo(() => movements.filter((m) => {
    if (filterPosition && m.positionId !== filterPosition) return false
    if (filterType && m.type !== filterType) return false
    if (filterFrom && m.date < filterFrom) return false
    if (filterTo && m.date > filterTo + 'T23:59:59') return false
    return true
  }), [movements, filterPosition, filterType, filterFrom, filterTo])

  const totals = useMemo(() => {
    let contributions = 0, withdrawals = 0, income = 0
    for (const m of filtered) {
      if (m.type === 'CONTRIBUTION') contributions += m.amount
      else if (m.type === 'WITHDRAWAL') withdrawals += m.amount
      else if (['DIVIDEND', 'JCP', 'INTEREST'].includes(m.type)) income += m.amount
    }
    return { contributions, withdrawals, income }
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Filters + Add button */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Ativo</p>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">Todos</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}{p.ticker ? ` (${p.ticker})` : ''}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tipo</p>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">Todos</option>
            {(['CONTRIBUTION','WITHDRAWAL','DIVIDEND','JCP','INTEREST','BONUS','SPLIT'] as const).map((t) => (
              <option key={t} value={t}>{INVESTMENT_MOVEMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">De</p>
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="text-xs h-8 w-36" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Até</p>
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="text-xs h-8 w-36" />
        </div>
        <Button size="sm" className="h-8 ml-auto" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" />
          Nova Movimentação
        </Button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3">
        <span className="text-slate-500">Aportes: <strong className="text-blue-700">{formatCurrency(totals.contributions)}</strong></span>
        <span className="text-slate-500">Resgates: <strong className="text-rose-600">{formatCurrency(totals.withdrawals)}</strong></span>
        <span className="text-slate-500">Rendimentos: <strong className="text-emerald-600">{formatCurrency(totals.income)}</strong></span>
        <span className="text-slate-400 ml-auto">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-2">
            <Repeat className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">Nenhuma movimentação encontrada</p>
            <Button size="sm" variant="outline" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Registrar movimentação</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Ativo</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium">Valor</th>
                  <th className="text-right px-4 py-3 font-medium">Qtd</th>
                  <th className="text-right px-4 py-3 font-medium">P. Unit.</th>
                  <th className="text-left px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(m.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{m.position?.name ?? '—'}</span>
                      {m.position?.ticker && <span className="text-xs text-muted-foreground ml-1 font-mono">{m.position.ticker}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={cn('border-0 text-xs', INVESTMENT_MOVEMENT_TYPE_COLORS[m.type])}>
                        {INVESTMENT_MOVEMENT_TYPE_LABELS[m.type]}
                      </Badge>
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-medium whitespace-nowrap', m.type === 'WITHDRAWAL' ? 'text-rose-600' : m.type === 'CONTRIBUTION' ? 'text-blue-700' : 'text-emerald-600')}>
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {m.quantity != null ? m.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {m.unitPrice != null ? formatCurrency(m.unitPrice) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate">
                      {m.description ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => onDelete(m)}
                        className="text-muted-foreground hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Allocation Tab ────────────────────────────────────────────────────────────

function AllocationTab({
  allPositions, targets, saveTargets,
}: {
  allPositions: InvestmentPosition[]
  targets: { getTarget: (t: InvestmentPositionType) => number }
  saveTargets: (t: { type: InvestmentPositionType; targetPct: number }[]) => Promise<unknown>
}) {
  const total = allPositions.reduce((s, p) => s + p.currentValue, 0)

  const byType = useMemo(() => {
    const map: Partial<Record<InvestmentPositionType, number>> = {}
    for (const p of allPositions) map[p.type] = (map[p.type] ?? 0) + p.currentValue
    return ASSET_TYPES.map((t) => ({
      type: t,
      label: INVESTMENT_POSITION_TYPE_LABELS[t],
      value: map[t] ?? 0,
      currentPct: total > 0 ? ((map[t] ?? 0) / total) * 100 : 0,
      color: INVESTMENT_TYPE_HEX[t],
    }))
  }, [allPositions, total])

  const [editing, setEditing] = useState<Partial<Record<InvestmentPositionType, string>>>({})
  const [saving, setSaving] = useState(false)

  const getEditValue = (t: InvestmentPositionType) =>
    editing[t] !== undefined ? editing[t]! : targets.getTarget(t).toString()

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = ASSET_TYPES.map((type) => ({
        type,
        targetPct: parseFloat(getEditValue(type)) || 0,
      }))
      await saveTargets(payload)
      setEditing({})
    } finally {
      setSaving(false)
    }
  }

  const totalTarget = ASSET_TYPES.reduce((s, t) => s + (parseFloat(getEditValue(t)) || 0), 0)

  const pieData = byType.filter((b) => b.value > 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Current allocation donut */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Alocação Atual por Classe</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum ativo com valor cadastrado</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                      paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {byType.filter((b) => b.value > 0).map((b) => (
                    <div key={b.type} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: b.color }} />
                      <span className="flex-1 font-medium">{b.label}</span>
                      <span className="text-muted-foreground">{formatCurrency(b.value)}</span>
                      <span className="w-12 text-right font-semibold">{b.currentPct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Target allocation editor */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Meta de Alocação</CardTitle>
              <span className={cn('text-xs font-medium', Math.abs(totalTarget - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-600')}>
                Total: {totalTarget.toFixed(0)}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ASSET_TYPES.map((type) => {
              const current = byType.find((b) => b.type === type)!
              const targetVal = parseFloat(getEditValue(type)) || 0
              const diff = targetVal - current.currentPct
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: INVESTMENT_TYPE_HEX[type] }} />
                    <span className="text-sm font-medium flex-1">{INVESTMENT_POSITION_TYPE_LABELS[type]}</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      atual {current.currentPct.toFixed(1)}%
                    </span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={getEditValue(type)}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [type]: e.target.value }))}
                        className="h-7 w-16 text-xs text-right px-1.5"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    {Math.abs(diff) > 0.5 && (
                      <span className={cn('text-xs font-medium w-12 text-right', diff > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <Button
              className="w-full mt-2"
              size="sm"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Salvando...' : 'Salvar Metas'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Rebalancing suggestions */}
      {total > 0 && (() => {
        const suggestions = byType.map((b) => {
          const targetPct = parseFloat(getEditValue(b.type)) || 0
          const diffAmt = ((targetPct - b.currentPct) / 100) * total
          return { ...b, targetPct, diffAmt }
        }).filter((s) => Math.abs(s.diffAmt) >= 100)

        if (suggestions.length === 0) return null

        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Sugestão de Rebalanceamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s.type} className="flex items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="font-medium flex-1">{s.label}</span>
                    <Badge className={cn('border-0 text-xs', s.diffAmt > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                      {s.diffAmt > 0 ? 'Comprar' : 'Vender'} {formatCurrency(Math.abs(s.diffAmt))}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({s.currentPct.toFixed(1)}% → {s.targetPct.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}

// ─── Performance Tab ───────────────────────────────────────────────────────────

type Period = '1M' | '3M' | '6M' | 'YTD' | '1A' | 'MAX'

function PerformanceTab({ allPositions, movements }: {
  allPositions: InvestmentPosition[]
  movements: InvestmentMovement[]
}) {
  const [period, setPeriod] = useState<Period>('MAX')

  const periodStart = useMemo(() => {
    const now = new Date()
    if (period === '1M') return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    if (period === '3M') return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    if (period === '6M') return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    if (period === 'YTD') return new Date(now.getFullYear(), 0, 1)
    if (period === '1A') return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    return null // MAX = all time
  }, [period])

  const periodMovements = useMemo(() =>
    movements.filter((m) => !periodStart || new Date(m.date) >= periodStart),
    [movements, periodStart],
  )

  const periodContributions = periodMovements.filter((m) => m.type === 'CONTRIBUTION').reduce((s, m) => s + m.amount, 0)
  const periodWithdrawals   = periodMovements.filter((m) => m.type === 'WITHDRAWAL').reduce((s, m) => s + m.amount, 0)
  const periodIncome        = periodMovements.filter((m) => ['DIVIDEND','JCP','INTEREST'].includes(m.type)).reduce((s, m) => s + m.amount, 0)

  // Per-position performance table
  const posPerf = useMemo(() => [...allPositions]
    .filter((p) => p.totalContributions > 0 || p.currentValue > 0)
    .sort((a, b) => b.totalReturnPct - a.totalReturnPct), [allPositions])

  // Chart data: current value by type
  const barData = useMemo(() => {
    const map: Partial<Record<InvestmentPositionType, { total: number; gain: number }>> = {}
    for (const p of allPositions) {
      if (!map[p.type]) map[p.type] = { total: 0, gain: 0 }
      map[p.type]!.total += p.currentValue
      map[p.type]!.gain  += p.unrealizedGain
    }
    return ASSET_TYPES
      .filter((t) => (map[t]?.total ?? 0) > 0)
      .map((t) => ({
        name: INVESTMENT_POSITION_TYPE_LABELS[t],
        valor: map[t]!.total,
        ganho: map[t]!.gain,
        fill: INVESTMENT_TYPE_HEX[t],
      }))
  }, [allPositions])

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {(['1M','3M','6M','YTD','1A','MAX'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              period === p ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Period KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aportes no Período" value={formatCurrency(periodContributions)} color="text-blue-700" />
        <StatCard label="Resgates no Período" value={formatCurrency(periodWithdrawals)} color="text-rose-600" />
        <StatCard label="Rendimentos no Período" value={formatCurrency(periodIncome)} color="text-emerald-600" />
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-slate-500">Ganho Não Realizado</p>
            <p className={cn('text-xl font-bold mt-1', allPositions.reduce((s, p) => s + p.unrealizedGain, 0) >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
              {formatCurrency(allPositions.reduce((s, p) => s + p.unrealizedGain, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Realizado: {formatCurrency(allPositions.reduce((s, p) => s + p.realizedGain, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart by class */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Valor Atual por Classe de Ativo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="valor" name="Valor Atual" radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-position table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Performance por Ativo</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {posPerf.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Registre aportes para ver a performance</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Ativo</th>
                  <th className="text-right px-4 py-3 font-medium">Custo</th>
                  <th className="text-right px-4 py-3 font-medium">Atual</th>
                  <th className="text-right px-4 py-3 font-medium">G. Não Realizado</th>
                  <th className="text-right px-4 py-3 font-medium">Rendimentos</th>
                  <th className="text-right px-4 py-3 font-medium">Retorno Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posPerf.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('border-0 text-xs', INVESTMENT_POSITION_TYPE_COLORS[p.type])}>
                          {INVESTMENT_POSITION_TYPE_LABELS[p.type]}
                        </Badge>
                        <span className="font-medium">{p.name}</span>
                        {p.ticker && <span className="text-xs text-muted-foreground font-mono">{p.ticker}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(p.costBasis)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(p.currentValue)}</td>
                    <td className={cn('px-4 py-2.5 text-right font-medium', p.unrealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                      {p.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(p.unrealizedGain)}
                      <span className="text-xs ml-1 opacity-70">({p.unrealizedGainPct >= 0 ? '+' : ''}{p.unrealizedGainPct.toFixed(1)}%)</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(p.totalIncome)}</td>
                    <td className={cn('px-4 py-2.5 text-right font-bold', p.totalReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                      {p.totalReturnPct >= 0 ? '+' : ''}{p.totalReturnPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { accounts, refetch: refetchAccounts } = useAccounts()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  // Modals
  const [transferOpen,    setTransferOpen]    = useState(false)
  const [positionModal,   setPositionModal]   = useState<{ open: boolean; position: InvestmentPosition | null }>({ open: false, position: null })
  const [movementModal,   setMovementModal]   = useState<{ open: boolean; position: InvestmentPosition | null }>({ open: false, position: null })

  const investmentAccounts = useMemo(() => accounts.filter((a) => a.type === 'INVESTMENT'), [accounts])

  const { positions, isLoading: loadingPos, create: createPosition, update: updatePosition, remove: removePosition, refetch: refetchPositions } =
    useInvestmentPositions(null) // fetch all, filter client-side

  const { movements, isLoading: loadingMov, fetchAll: fetchMovements, addMovement, deleteMovement } = useInvestmentMovements()
  const { getTarget, save: saveTargets } = useAllocationTargets()
  const { create: createTransfer } = useTransfers()

  const loadMovements = useCallback(() => fetchMovements(), [fetchMovements])
  useEffect(() => { loadMovements() }, [loadMovements])

  // ── Derived — portfolio values based on position currentValue, NOT account.balance ──

  const allPositions = positions

  /** Sum of position currentValue per accountId */
  const portfolioValueByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of positions) {
      map[p.accountId] = (map[p.accountId] ?? 0) + p.currentValue
    }
    return map
  }, [positions])

  /** Sum of position totalPnL per accountId */
  const portfolioGainByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of positions) {
      map[p.accountId] = (map[p.accountId] ?? 0) + p.totalPnL
    }
    return map
  }, [positions])

  /** Total market value of all investment positions */
  const totalBalance = useMemo(
    () => positions.reduce((s, p) => s + p.currentValue, 0),
    [positions],
  )

  const recentMovements = useMemo(() => [...movements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [movements])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTransfer = async (data: Parameters<typeof createTransfer>[0]) => {
    try {
      await createTransfer(data)
      await refetchAccounts()
      toast({ title: 'Aporte realizado com sucesso' })
    } catch {
      toast({ title: 'Erro ao realizar aporte', variant: 'destructive' })
      throw new Error()
    }
  }

  const handleSavePosition = async (data: unknown) => {
    try {
      if (positionModal.position) {
        await updatePosition(positionModal.position.id, data)
        toast({ title: 'Ativo atualizado' })
      } else {
        await createPosition(data)
        toast({ title: 'Ativo adicionado' })
      }
      await refetchPositions()
    } catch {
      toast({ title: 'Erro ao salvar ativo', variant: 'destructive' })
      throw new Error()
    }
  }

  const handleDeletePosition = async (p: InvestmentPosition) => {
    if (!confirm(`Excluir "${p.name}"?`)) return
    try {
      await removePosition(p.id)
      toast({ title: 'Ativo removido' })
    } catch {
      toast({ title: 'Erro ao remover ativo', variant: 'destructive' })
    }
  }

  const handleSaveMovement = async (positionId: string, payload: AddMovementPayload) => {
    try {
      await addMovement(positionId, payload)
      await refetchPositions()
      await loadMovements()
      await refetchAccounts()
      toast({ title: 'Movimentação registrada' })
    } catch {
      toast({ title: 'Erro ao registrar movimentação', variant: 'destructive' })
      throw new Error()
    }
  }

  const handleDeleteMovement = async (m: InvestmentMovement) => {
    if (!confirm('Excluir esta movimentação?')) return
    try {
      await deleteMovement(m.positionId, m.id)
      await refetchPositions()
      await loadMovements()
      toast({ title: 'Movimentação excluída' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  // ── Empty states ─────────────────────────────────────────────────────────────

  if (accounts.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (investmentAccounts.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Investimentos</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-4">
            <BarChart3 className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 text-sm">Nenhuma conta de investimentos cadastrada</p>
            <Button variant="outline" onClick={() => navigate('/accounts')}>
              <Plus className="w-4 h-4 mr-1.5" />Adicionar conta de investimentos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Investimentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Patrimônio total: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(totalBalance)}</strong>
            {' · '}{allPositions.length} ativo{allPositions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="w-4 h-4" />Aportar
          </Button>
          <Button onClick={() => { setPositionModal({ open: true, position: null }) }}>
            <Plus className="w-4 h-4" />Novo Ativo
          </Button>
        </div>
      </div>

      {/* Account selector (compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={cn(
            'text-left rounded-xl border-2 px-3 py-2.5 transition-all hover:shadow-sm',
            selectedAccountId === null ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white dark:bg-slate-900 hover:border-slate-300',
          )}
        >
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Todas</span>
          </div>
          <p className="text-sm font-bold mt-1">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-slate-400">{investmentAccounts.length} conta{investmentAccounts.length !== 1 ? 's' : ''}</p>
        </button>
        {investmentAccounts.map((acc) => {
          const pv = portfolioValueByAccount[acc.id] ?? 0
          const pg = portfolioGainByAccount[acc.id] ?? 0
          return (
            <AccountCard
              key={acc.id}
              account={acc}
              selected={selectedAccountId === acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              pct={totalBalance > 0 ? (pv / totalBalance) * 100 : 0}
              portfolioValue={pv}
              portfolioGain={pg}
            />
          )
        })}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              activeTab === id
                ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loadingPos ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              investmentAccounts={investmentAccounts}
              totalBalance={totalBalance}
              allPositions={allPositions}
              recentMovements={recentMovements}
              portfolioValueByAccount={portfolioValueByAccount}
              portfolioGainByAccount={portfolioGainByAccount}
            />
          )}
          {activeTab === 'positions' && (
            <PositionsTab
              positions={allPositions}
              investmentAccounts={investmentAccounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              onEdit={(p) => setPositionModal({ open: true, position: p })}
              onDelete={handleDeletePosition}
              onMovement={(p) => setMovementModal({ open: true, position: p })}
            />
          )}
          {activeTab === 'movements' && (
            <MovementsTab
              movements={movements}
              positions={allPositions}
              isLoading={loadingMov}
              onAdd={() => setMovementModal({ open: true, position: null })}
              onDelete={handleDeleteMovement}
            />
          )}
          {activeTab === 'allocation' && (
            <AllocationTab
              allPositions={allPositions}
              targets={{ getTarget }}
              saveTargets={saveTargets}
            />
          )}
          {activeTab === 'performance' && (
            <PerformanceTab allPositions={allPositions} movements={movements} />
          )}
        </>
      )}

      {/* Modals */}
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSave={handleTransfer}
        accounts={accounts}
        defaultToAccountId={selectedAccountId ?? undefined}
      />

      <InvestmentPositionModal
        open={positionModal.open}
        onClose={() => setPositionModal({ open: false, position: null })}
        onSave={handleSavePosition}
        position={positionModal.position}
        accountId={selectedAccountId ?? (investmentAccounts[0]?.id ?? '')}
      />

      <MovementModal
        open={movementModal.open}
        onClose={() => setMovementModal({ open: false, position: null })}
        onSave={handleSaveMovement}
        positions={allPositions}
        defaultPositionId={movementModal.position?.id}
      />
    </div>
  )
}
