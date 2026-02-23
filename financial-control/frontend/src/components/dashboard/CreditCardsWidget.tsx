import { CreditCard, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCardSummary } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CreditCardsWidgetProps {
  data: CreditCardSummary | null
}

export function CreditCardsWidget({ data }: CreditCardsWidgetProps) {
  const navigate = useNavigate()

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartões de Crédito</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8 gap-3">
          <CreditCard className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/credit-cards')}>
            Adicionar cartão
          </Button>
        </CardContent>
      </Card>
    )
  }

  const utilizationPercent =
    data.totalCreditLimit > 0
      ? data.totalOpenBalance / data.totalCreditLimit
      : 0
  const utilizationPct = Math.min(utilizationPercent * 100, 100)
  const isHigh = utilizationPercent >= 0.80
  const isCritical = utilizationPercent >= 0.90

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Cartões de Crédito</CardTitle>
          <button onClick={() => navigate('/credit-cards')} className="text-xs text-primary hover:underline">
            Ver todos
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Open balance */}
        <div>
          <p className={cn('text-2xl font-bold', data.totalOpenBalance > 0 ? 'text-rose-600' : 'text-slate-900')}>
            {formatCurrency(data.totalOpenBalance)}
          </p>
          <p className="text-xs text-muted-foreground">Total em aberto</p>
        </div>

        {/* Utilization bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{utilizationPct.toFixed(0)}% utilizado</span>
            <span>Limite {formatCurrency(data.totalCreditLimit)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-400' : 'bg-emerald-500',
              )}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>

        {/* Disponível */}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Disponível</span>
          <span className="font-semibold text-emerald-600">{formatCurrency(data.totalAvailableLimit)}</span>
        </div>

        {/* Next due */}
        {data.nextDueStatement && (
          <div className={cn(
            'flex items-start gap-2 rounded-lg px-3 py-2.5',
            new Date(data.nextDueStatement.dueDate) < new Date()
              ? 'bg-rose-50 border border-rose-200'
              : 'bg-amber-50 border border-amber-200',
          )}>
            <AlertCircle className={cn(
              'w-4 h-4 mt-0.5 shrink-0',
              new Date(data.nextDueStatement.dueDate) < new Date() ? 'text-rose-500' : 'text-amber-500',
            )} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{data.nextDueStatement.cardName}</p>
              <p className="text-xs text-slate-500">
                {formatCurrency(data.nextDueStatement.openBalance)} · Vence{' '}
                {new Date(data.nextDueStatement.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
            </div>
          </div>
        )}

        {isHigh && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            {isCritical ? 'Utilização crítica do limite' : 'Utilização elevada do limite'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
