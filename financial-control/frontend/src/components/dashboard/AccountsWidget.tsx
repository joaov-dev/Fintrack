import { Landmark, PiggyBank, CreditCard, TrendingUp, Wallet, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Account, ACCOUNT_TYPE_LABELS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ACCOUNT_ICONS: Record<Account['type'], React.ElementType> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CREDIT: CreditCard,
  INVESTMENT: TrendingUp,
  CASH: Wallet,
}

interface AccountsWidgetProps {
  accounts: Account[]
  totalBalance: number
}

export function AccountsWidget({ accounts, totalBalance }: AccountsWidgetProps) {
  const navigate = useNavigate()

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8 gap-3">
          <Wallet className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/accounts')}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar conta
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Contas</CardTitle>
          <button onClick={() => navigate('/accounts')} className="text-xs text-primary hover:underline">
            Ver todas
          </button>
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-xs text-muted-foreground">Patrimônio total</p>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {accounts.map((acc) => {
          const Icon = ACCOUNT_ICONS[acc.type]
          return (
            <div key={acc.id} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: acc.color + '18' }}>
                <Icon className="w-4 h-4" style={{ color: acc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{acc.name}</p>
                <p className="text-xs text-slate-400">{ACCOUNT_TYPE_LABELS[acc.type]}</p>
              </div>
              <span className={cn('text-sm font-semibold shrink-0', acc.balance < 0 ? 'text-rose-600' : 'text-slate-900')}>
                {formatCurrency(acc.balance)}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
