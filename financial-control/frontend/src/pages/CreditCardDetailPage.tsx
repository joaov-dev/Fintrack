import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CreditCard as CreditCardIcon, Loader2, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CardPaymentModal } from '@/components/creditCards/CardPaymentModal'
import { StatementDetailPanel } from '@/components/creditCards/StatementDetailPanel'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useCardStatements } from '@/hooks/useCardStatements'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/hooks/use-toast'
import { CardStatement } from '@/types'
import { formatCurrency } from '@/lib/utils'
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

export default function CreditCardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { cards } = useCreditCards()
  const { statements, isLoading, refetch, getDetail, pay } = useCardStatements(id ?? '')
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { toast } = useToast()

  const [selectedStatement, setSelectedStatement] = useState<CardStatement | null>(null)
  const [payingStatement, setPayingStatement] = useState<CardStatement | null>(null)

  useEffect(() => { refetch() }, [refetch])

  const card = cards.find((c) => c.id === id)

  const handlePay = async (payload: {
    amount: number
    fromAccountId: string
    date: string
    categoryId: string
  }) => {
    if (!payingStatement) return
    try {
      await pay(payingStatement.id, payload)
      toast({ title: 'Pagamento registrado' })
      setPayingStatement(null)
      setSelectedStatement(null)
    } catch {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        to="/credit-cards"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Cartões de Crédito
      </Link>

      {/* Card header */}
      {card ? (
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: card.color }}
          >
            <CreditCardIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{card.name}</h1>
            {card.brand && <p className="text-sm text-slate-500">{card.brand}</p>}
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-slate-900">Cartão</h1>
      )}

      {/* Card metrics */}
      {card && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 mb-0.5">Em Aberto</p>
              <p className={cn('text-xl font-bold', card.openBalance > 0 ? 'text-rose-600' : 'text-slate-900')}>
                {formatCurrency(card.openBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 mb-0.5">Disponível</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(card.availableLimit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 mb-0.5">Limite</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(card.creditLimit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 mb-0.5">Utilização</p>
              <p className={cn('text-xl font-bold', card.utilizationPercent >= 0.8 ? 'text-amber-600' : 'text-slate-900')}>
                {(card.utilizationPercent * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statements list */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Faturas</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : statements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-400 text-sm">
              Nenhuma fatura encontrada
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {statements.map((stmt) => {
              const openBalance = stmt.totalSpent - stmt.totalPaid
              const isSelected = selectedStatement?.id === stmt.id

              return (
                <div key={stmt.id}>
                  <button
                    className={cn(
                      'w-full text-left rounded-xl border transition-all',
                      isSelected
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                    )}
                    onClick={() => setSelectedStatement(isSelected ? null : stmt)}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 capitalize">
                            {new Date(stmt.closingDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[stmt.status])}>
                            {STATUS_LABELS[stmt.status]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Vence em {new Date(stmt.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {/* Pay button — only active within the payment window (CLOSED status) */}
                      {openBalance > 0 && stmt.status !== 'PAID' && (() => {
                        const isPayable = stmt.status === 'CLOSED'
                        const tipText = stmt.status === 'OPEN'
                          ? `Fatura fecha em ${new Date(stmt.closingDate).toLocaleDateString('pt-BR')}`
                          : stmt.status === 'OVERDUE'
                          ? 'Prazo de pagamento encerrado'
                          : undefined
                        return (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (isPayable) setPayingStatement(stmt) }}
                            disabled={!isPayable}
                            title={tipText}
                            className={cn(
                              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                              isPayable
                                ? 'bg-primary text-white hover:opacity-90 active:scale-95'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed',
                            )}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            {stmt.status === 'OPEN' ? 'Aguardando fechamento' : stmt.status === 'OVERDUE' ? 'Vencida' : 'Pagar fatura'}
                          </button>
                        )
                      })()}

                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-slate-900">{formatCurrency(stmt.totalSpent)}</p>
                        {openBalance > 0 && (
                          <p className="text-xs text-rose-500 font-medium">
                            {formatCurrency(openBalance)} em aberto
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="mt-2">
                      <StatementDetailPanel
                        statement={selectedStatement}
                        onClose={() => setSelectedStatement(null)}
                        onPay={(s) => setPayingStatement(s)}
                        getDetail={getDetail}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CardPaymentModal
        open={!!payingStatement}
        onClose={() => setPayingStatement(null)}
        statement={payingStatement}
        accounts={accounts}
        categories={categories}
        onPay={handlePay}
      />
    </div>
  )
}
