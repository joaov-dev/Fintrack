import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Budget } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BudgetProgressProps {
  budgets: Budget[]
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  const navigate = useNavigate()

  if (budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orçamentos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8 gap-3">
          <Target className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">Nenhum orçamento definido</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/categories')}>
            <Target className="w-3 h-3 mr-1" /> Definir orçamentos
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Orçamentos</CardTitle>
          <button onClick={() => navigate('/categories')} className="text-xs text-primary hover:underline">
            Gerenciar
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((b) => {
          const pct = Math.min(b.percentage, 100)
          const isOver = b.percentage > 100
          const isWarning = b.percentage > 70 && !isOver

          return (
            <div key={b.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.categoryColor }} />
                  <span className="text-sm font-medium text-slate-700">{b.categoryName}</span>
                  {isOver && (
                    <span className="text-xs bg-rose-100 text-rose-600 font-medium px-1.5 py-0.5 rounded-full">
                      Excedido
                    </span>
                  )}
                </div>
                <span className={cn('text-xs font-medium', isOver ? 'text-rose-600' : 'text-slate-500')}>
                  {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{b.percentage.toFixed(0)}% utilizado</span>
                <span className={cn(b.remaining < 0 ? 'text-rose-500' : 'text-slate-400')}>
                  {b.remaining < 0 ? `${formatCurrency(Math.abs(b.remaining))} acima` : `${formatCurrency(b.remaining)} restam`}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
