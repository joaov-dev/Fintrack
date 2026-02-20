import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transações Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma transação encontrada
          </p>
        ) : (
          transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  t.type === 'INCOME' ? 'bg-emerald-100' : 'bg-rose-100',
                )}
              >
                {t.type === 'INCOME' ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                <p className="text-xs text-slate-400">
                  {t.category.name} · {formatDate(t.date)}
                </p>
              </div>
              <span
                className={cn(
                  'text-sm font-semibold shrink-0',
                  t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
