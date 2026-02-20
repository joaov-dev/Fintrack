import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'

interface SummaryCardProps {
  title: string
  value: number
  icon: LucideIcon
  variant: 'balance' | 'income' | 'expense'
  trend?: number
}

const variants = {
  balance: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600 bg-violet-100',
    value: 'text-slate-900',
  },
  income: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600 bg-emerald-100',
    value: 'text-emerald-700',
  },
  expense: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600 bg-rose-100',
    value: 'text-rose-700',
  },
}

export function SummaryCard({ title, value, icon: Icon, variant }: SummaryCardProps) {
  const v = variants[variant]
  return (
    <Card className={cn('border-0 shadow-sm', v.bg)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', v.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <p className={cn('text-2xl font-bold tracking-tight', v.value)}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  )
}
