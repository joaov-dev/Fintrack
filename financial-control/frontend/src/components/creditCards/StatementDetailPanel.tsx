import { useEffect, useState } from 'react'
import { ArrowDownRight, Loader2, X, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardStatementDetail, CardStatement } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
}

interface StatementDetailPanelProps {
  statement: CardStatement | null
  onClose: () => void
  onPay: (statement: CardStatement) => void
  getDetail: (statementId: string) => Promise<CardStatementDetail>
}

export function StatementDetailPanel({ statement, onClose, onPay, getDetail }: StatementDetailPanelProps) {
  const [detail, setDetail] = useState<CardStatementDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!statement) {
      setDetail(null)
      return
    }
    setIsLoading(true)
    getDetail(statement.id)
      .then(setDetail)
      .finally(() => setIsLoading(false))
  }, [statement?.id])

  if (!statement) return null

  const openBalance = statement.totalSpent - statement.totalPaid
  const canPay = openBalance > 0 && statement.status !== 'PAID'

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Fatura {new Date(statement.closingDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(statement.periodStart)} — {formatDate(statement.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[statement.status])}>
            {STATUS_LABELS[statement.status]}
          </span>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">Total gasto</p>
          <p className="text-base font-bold text-slate-900">{formatCurrency(statement.totalSpent)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">Pago</p>
          <p className="text-base font-bold text-emerald-600">{formatCurrency(statement.totalPaid)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">Em aberto</p>
          <p className={cn('text-base font-bold', openBalance > 0 ? 'text-rose-600' : 'text-emerald-600')}>
            {formatCurrency(openBalance)}
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : detail ? (
        <div className="max-h-72 overflow-y-auto">
          {/* Purchases */}
          {detail.transactions.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Compras ({detail.transactions.length})
              </p>
              {detail.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400">{formatDate(tx.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">-{formatCurrency(Number(tx.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payments */}
          {detail.payments.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Pagamentos ({detail.payments.length})
              </p>
              {detail.payments.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400">{formatDate(tx.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">+{formatCurrency(Number(tx.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {detail.transactions.length === 0 && detail.payments.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma movimentação</p>
          )}
        </div>
      ) : null}

      {/* Pay button */}
      {canPay && (
        <div className="px-4 py-3 border-t border-slate-200">
          <Button className="w-full" onClick={() => onPay(statement)}>
            Pagar Fatura · {formatCurrency(openBalance)}
          </Button>
        </div>
      )}
    </div>
  )
}
