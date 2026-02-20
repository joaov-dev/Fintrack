import { useState } from 'react'
import {
  Repeat2, ArrowUpRight, ArrowDownRight, Pencil, Trash2, Loader2, Plus, CalendarClock,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/use-toast'
import { Transaction, RECURRENCE_TYPE_LABELS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const FREQUENCY_COLORS: Record<string, string> = {
  WEEKLY:  'bg-violet-100 text-violet-700',
  MONTHLY: 'bg-blue-100 text-blue-700',
  YEARLY:  'bg-amber-100 text-amber-700',
}

export default function RecurringPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { transactions: templates, isLoading, remove, update } = useTransactions({ isRecurring: true })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const handleEdit = (t: Transaction) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleDelete = async (t: Transaction) => {
    const msg = `Excluir "${t.description}"?\n\nIsso também removerá todas as ocorrências futuras já geradas.`
    if (!confirm(msg)) return
    try {
      await remove(t.id)
      toast({ title: 'Recorrência excluída com sucesso' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleSave = async (data: unknown) => {
    if (!editing) return
    try {
      await update(editing.id, data)
      toast({ title: 'Recorrência atualizada' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recorrências</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? '...' : `${templates.length} transaç${templates.length !== 1 ? 'ões' : 'ão'} recorrente${templates.length !== 1 ? 's' : ''} ativa${templates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/transactions')}>
          <Plus className="w-4 h-4" />
          Nova recorrência
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-20 gap-4">
            <CalendarClock className="w-12 h-12 text-slate-300" />
            <div className="text-center">
              <p className="text-slate-700 font-medium">Nenhuma transação recorrente</p>
              <p className="text-slate-400 text-sm mt-1">
                Crie uma transação marcando a opção "Transação recorrente"
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/transactions')}>
              <Plus className="w-4 h-4" />
              Ir para Transações
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => {
            const isIncome = t.type === 'INCOME'
            const account = accounts.find((a) => a.id === t.accountId)
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 px-5 flex flex-col gap-3">
                  {/* Top row: icon + description + amount */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      isIncome ? 'bg-emerald-100' : 'bg-rose-100',
                    )}>
                      {isIncome
                        ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                        : <ArrowDownRight className="w-5 h-5 text-rose-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{t.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.category.color }} />
                        <span className="text-xs text-slate-500 truncate">{t.category.name}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'text-base font-bold shrink-0',
                      isIncome ? 'text-emerald-600' : 'text-rose-500',
                    )}>
                      {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {t.recurrenceType && (
                      <Badge className={cn(
                        'text-xs font-medium border-0 flex items-center gap-1',
                        FREQUENCY_COLORS[t.recurrenceType] ?? 'bg-slate-100 text-slate-600',
                      )}>
                        <Repeat2 className="w-3 h-3" />
                        {RECURRENCE_TYPE_LABELS[t.recurrenceType]}
                      </Badge>
                    )}
                    {account && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: account.color }} />
                        {account.name}
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <span>Início: <span className="text-slate-600 font-medium">{formatDate(t.date)}</span></span>
                    {t.recurrenceEnd ? (
                      <span>Fim: <span className="text-slate-600 font-medium">{formatDate(t.recurrenceEnd)}</span></span>
                    ) : (
                      <span className="text-slate-400">Sem encerramento</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleEdit(t)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                      onClick={() => handleDelete(t)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        transaction={editing}
        categories={categories}
        accounts={accounts}
      />
    </div>
  )
}
