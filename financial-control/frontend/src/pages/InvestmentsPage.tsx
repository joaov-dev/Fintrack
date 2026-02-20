import { useState, useMemo } from 'react'
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Loader2, Plus, Pencil, Trash2, ArrowLeftRight, Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useTransfers } from '@/hooks/useTransfers'
import { useInvestmentPositions } from '@/hooks/useInvestmentPositions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TransferModal } from '@/components/investments/TransferModal'
import { InvestmentPositionModal } from '@/components/investments/InvestmentPositionModal'
import { YieldModal } from '@/components/investments/YieldModal'
import { useToast } from '@/hooks/use-toast'
import {
  Account, InvestmentPosition,
  INVESTMENT_POSITION_TYPE_LABELS, INVESTMENT_POSITION_TYPE_COLORS,
} from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// ─── Sub-components ────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: Account
  selected: boolean
  onClick: () => void
  allocationPct: number
}

function AccountCard({ account, selected, onClick, allocationPct }: AccountCardProps) {
  const gain = account.balance - account.initialBalance
  const gainPct = account.initialBalance > 0 ? (gain / account.initialBalance) * 100 : 0
  const isPositive = gain >= 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all hover:shadow-md',
        selected
          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
          : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: account.color }} />
          <span className="text-sm font-semibold text-slate-800 truncate">{account.name}</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{allocationPct.toFixed(0)}%</span>
      </div>
      <p className="text-xl font-bold text-slate-900 mt-3">{formatCurrency(account.balance)}</p>
      <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-rose-500')}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{isPositive ? '+' : ''}{formatCurrency(gain)}</span>
        <span className="text-slate-400 font-normal">({isPositive ? '+' : ''}{gainPct.toFixed(1)}%)</span>
      </div>
    </button>
  )
}

interface PositionCardProps {
  position: InvestmentPosition
  onEdit: () => void
  onDelete: () => void
  onYield: () => void
}

function PositionCard({ position, onEdit, onDelete, onYield }: PositionCardProps) {
  const cost = position.quantity != null && position.avgPrice != null
    ? position.quantity * position.avgPrice
    : null
  const gain = cost != null ? position.currentValue - cost : null
  const gainPct = cost != null && cost > 0 ? ((position.currentValue - cost) / cost) * 100 : null
  const isPositive = gain == null || gain >= 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">{position.name}</span>
              {position.ticker && (
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {position.ticker}
                </span>
              )}
            </div>
            <Badge className={cn('text-xs mt-1 border-0', INVESTMENT_POSITION_TYPE_COLORS[position.type])}>
              {INVESTMENT_POSITION_TYPE_LABELS[position.type]}
            </Badge>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-slate-900">{formatCurrency(position.currentValue)}</p>
            {gain != null && (
              <p className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-rose-500')}>
                {isPositive ? '+' : ''}{formatCurrency(gain)}
                {gainPct != null && ` (${isPositive ? '+' : ''}${gainPct.toFixed(1)}%)`}
              </p>
            )}
          </div>
        </div>

        {/* Details row */}
        {(position.quantity != null || position.avgPrice != null || position.totalYields > 0) && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            {position.quantity != null && (
              <span>Qtd: <strong className="text-slate-700">{position.quantity}</strong></span>
            )}
            {position.avgPrice != null && (
              <span>PM: <strong className="text-slate-700">{formatCurrency(position.avgPrice)}</strong></span>
            )}
            {cost != null && (
              <span>Custo: <strong className="text-slate-700">{formatCurrency(cost)}</strong></span>
            )}
            {position.totalYields > 0 && (
              <span className="text-emerald-600">
                Rendimentos: <strong>{formatCurrency(position.totalYields)}</strong>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            onClick={onYield}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Rendimento
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-rose-600 hover:bg-rose-50"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface TransactionRowProps { tx: { id: string; type: string; amount: number; description: string; date: string; category?: { color: string; name: string } } }

function TransactionRow({ tx }: TransactionRowProps) {
  const isIncome = tx.type === 'INCOME'
  return (
    <div className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', isIncome ? 'bg-emerald-100' : 'bg-rose-100')}>
        {isIncome ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
        <span className="text-xs text-slate-400">{formatDate(tx.date)}</span>
      </div>
      <span className={cn('text-sm font-semibold shrink-0', isIncome ? 'text-emerald-600' : 'text-rose-500')}>
        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
      </span>
    </div>
  )
}

const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: Record<string, number>) {
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type TxFilter = 'ALL' | 'INCOME' | 'EXPENSE'

export default function InvestmentsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { accounts, refetch: refetchAccounts } = useAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<TxFilter>('ALL')

  // Modals
  const [transferOpen, setTransferOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<InvestmentPosition | null>(null)
  const [yieldModalOpen, setYieldModalOpen] = useState(false)
  const [yieldingPosition, setYieldingPosition] = useState<InvestmentPosition | null>(null)

  const investmentAccounts = useMemo(() => accounts.filter((a) => a.type === 'INVESTMENT'), [accounts])
  const totalBalance = useMemo(() => investmentAccounts.reduce((s, a) => s + a.balance, 0), [investmentAccounts])
  const selectedAccount = selectedAccountId ? investmentAccounts.find((a) => a.id === selectedAccountId) ?? null : null

  const { transactions, isLoading: loadingTx, refetch: refetchTx } = useTransactions(
    selectedAccountId ? { accountId: selectedAccountId } : {},
  )
  const filteredTx = useMemo(() => {
    if (txFilter === 'ALL') return transactions
    return transactions.filter((t) => t.type === txFilter)
  }, [transactions, txFilter])

  const txStats = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
    const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
    return { income, expense }
  }, [transactions])

  const allocationData = useMemo(
    () => investmentAccounts.map((a) => ({ name: a.name, value: a.balance, color: a.color })),
    [investmentAccounts],
  )

  const { positions, isLoading: loadingPositions, create: createPosition, update: updatePosition, remove: removePosition, addYield } =
    useInvestmentPositions(selectedAccountId)

  const { create: createTransfer } = useTransfers()

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleTransfer = async (data: Parameters<typeof createTransfer>[0]) => {
    try {
      await createTransfer(data)
      await refetchAccounts()
      await refetchTx()
      toast({ title: 'Aporte realizado com sucesso' })
    } catch {
      toast({ title: 'Erro ao realizar aporte', variant: 'destructive' })
      throw new Error()
    }
  }

  const handleSavePosition = async (data: unknown) => {
    try {
      if (editingPosition) {
        await updatePosition(editingPosition.id, data)
        toast({ title: 'Ativo atualizado' })
      } else {
        await createPosition(data)
        toast({ title: 'Ativo adicionado' })
      }
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

  const handleAddYield = async (data: { amount: number; date: string; description?: string }) => {
    if (!yieldingPosition) return
    try {
      await addYield(yieldingPosition.id, data)
      await refetchAccounts()
      await refetchTx()
      toast({ title: 'Rendimento registrado' })
    } catch {
      toast({ title: 'Erro ao registrar rendimento', variant: 'destructive' })
      throw new Error()
    }
  }

  // ── Loading / empty states ───────────────────────────────────────────────────

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (investmentAccounts.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900">Investimentos</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-4">
            <BarChart3 className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 text-sm">Nenhuma conta de investimentos cadastrada</p>
            <Button variant="outline" onClick={() => navigate('/accounts')}>
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar conta de investimentos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Investimentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Acompanhe sua carteira de investimentos</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedAccount && (
            <Button onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="w-4 h-4" />
              Aportar
            </Button>
          )}
          <div className="text-right">
            <p className="text-xs text-slate-500">Patrimônio investido</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
      </div>

      {/* Account selector */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Selecionar conta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <button
            onClick={() => setSelectedAccountId(null)}
            className={cn(
              'text-left rounded-xl border-2 p-4 transition-all hover:shadow-md',
              selectedAccountId === null
                ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-3 h-3 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Todas as contas</span>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-3">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-slate-400 mt-1">{investmentAccounts.length} conta{investmentAccounts.length !== 1 ? 's' : ''}</p>
          </button>

          {investmentAccounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              selected={selectedAccountId === acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              allocationPct={totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0}
            />
          ))}
        </div>
      </div>

      {/* All accounts overview */}
      {selectedAccountId === null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Alocação da Carteira</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" labelLine={false} label={CustomLabel}>
                    {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Resumo por Conta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {investmentAccounts.map((acc) => {
                const pct = totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0
                const gain = acc.balance - acc.initialBalance
                const isPositive = gain >= 0
                return (
                  <div key={acc.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: acc.color }} />
                        <span className="text-sm font-medium text-slate-700">{acc.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(acc.balance)}</span>
                        <span className={cn('text-xs ml-2', isPositive ? 'text-emerald-600' : 'text-rose-500')}>
                          {isPositive ? '+' : ''}{formatCurrency(gain)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: acc.color }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Single account detail */}
      {selectedAccount && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-slate-500 font-medium">Saldo Atual</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(selectedAccount.balance)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Saldo inicial: {formatCurrency(selectedAccount.initialBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-slate-500 font-medium">Total Entradas</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(txStats.income)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Aportes e rendimentos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-slate-500 font-medium">Total Saídas</p>
                <p className="text-2xl font-bold text-rose-500 mt-1">{formatCurrency(txStats.expense)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Resgates e taxas</p>
              </CardContent>
            </Card>
          </div>

          {/* Positions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Meus Ativos</h2>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => { setEditingPosition(null); setPositionModalOpen(true) }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Ativo
              </Button>
            </div>

            {loadingPositions ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : positions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-10 gap-3">
                  <BarChart3 className="w-10 h-10 text-slate-300" />
                  <p className="text-slate-400 text-sm">Nenhum ativo cadastrado nesta conta</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditingPosition(null); setPositionModalOpen(true) }}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar primeiro ativo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {positions.map((p) => (
                  <PositionCard
                    key={p.id}
                    position={p}
                    onEdit={() => { setEditingPosition(p); setPositionModalOpen(true) }}
                    onDelete={() => handleDeletePosition(p)}
                    onYield={() => { setYieldingPosition(p); setYieldModalOpen(true) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Movimentações</CardTitle>
                <div className="flex rounded-lg bg-slate-100 p-0.5 gap-0.5">
                  {(['ALL', 'INCOME', 'EXPENSE'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTxFilter(f)}
                      className={cn(
                        'px-3 py-1 rounded-md text-xs font-medium transition-all',
                        txFilter === f
                          ? f === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm'
                            : f === 'EXPENSE' ? 'bg-white text-rose-500 shadow-sm'
                              : 'bg-white text-slate-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {f === 'ALL' ? 'Todas' : f === 'INCOME' ? 'Entradas' : 'Saídas'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : filteredTx.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <BarChart3 className="w-8 h-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhuma movimentação encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTx.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
                </div>
              )}
            </CardContent>
          </Card>
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
        open={positionModalOpen}
        onClose={() => { setPositionModalOpen(false); setEditingPosition(null) }}
        onSave={handleSavePosition}
        position={editingPosition}
        accountId={selectedAccountId ?? ''}
      />

      {yieldingPosition && (
        <YieldModal
          open={yieldModalOpen}
          onClose={() => { setYieldModalOpen(false); setYieldingPosition(null) }}
          onSave={handleAddYield}
          positionName={yieldingPosition.name}
        />
      )}
    </div>
  )
}
