import { useState } from 'react'
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Upload, CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { ImportModal } from '@/components/import/ImportModal'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/use-toast'
import { Transaction } from '@/types'
import { formatCurrency, formatDate, monthLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function TransactionsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const { toast } = useToast()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { transactions, isLoading, refetch, create, update, remove } = useTransactions({
    month,
    year,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    search: search || undefined,
  })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear()
    if (isCurrent) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const handleSave = async (data: unknown) => {
    try {
      if (editing) {
        await update(editing.id, data)
        toast({ title: 'Transação atualizada', variant: 'default' })
      } else {
        await create(data)
        toast({ title: 'Transação adicionada', variant: 'default' })
      }
    } catch {
      toast({ title: 'Erro ao salvar transação', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmar exclusão?')) return
    try {
      await remove(id)
      toast({ title: 'Transação excluída' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const totalIncome = transactions.filter(t => t.type === 'INCOME' && !t.transferId).reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' && !t.transferId).reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transações</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" />
            Importar CSV
          </Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Month selector + mini summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center capitalize">
            {monthLabel(month, year)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}
            disabled={month === now.getMonth() + 1 && year === now.getFullYear()}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-3 text-sm">
          <span className="text-emerald-600 font-medium">+{formatCurrency(totalIncome)}</span>
          <span className="text-slate-300">|</span>
          <span className="text-rose-600 font-medium">-{formatCurrency(totalExpense)}</span>
          <span className="text-slate-300">|</span>
          <span className={cn('font-semibold', totalIncome - totalExpense >= 0 ? 'text-slate-900' : 'text-rose-700')}>
            {formatCurrency(totalIncome - totalExpense)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="INCOME">Receitas</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-400 text-sm">Nenhuma transação encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="w-4 h-4" /> Adicionar primeira transação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors group">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    t.transferId ? 'bg-violet-100'
                      : t.isCardPayment ? 'bg-pink-100'
                      : t.paymentMethod === 'CREDIT_CARD' ? 'bg-indigo-100'
                      : t.type === 'INCOME' ? 'bg-emerald-100' : 'bg-rose-100',
                  )}>
                    {t.transferId
                      ? <ArrowLeftRight className="w-4 h-4 text-violet-600" />
                      : t.isCardPayment
                      ? <CreditCard className="w-4 h-4 text-pink-600" />
                      : t.paymentMethod === 'CREDIT_CARD'
                      ? <CreditCard className="w-4 h-4 text-indigo-600" />
                      : t.type === 'INCOME'
                        ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        : <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.transferId ? (
                        <span className="text-xs text-violet-500 font-medium">Transferência</span>
                      ) : t.isCardPayment ? (
                        <span className="text-xs text-pink-500 font-medium">Pagamento de Fatura</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <span className="w-2 h-2 rounded-full" style={{ background: t.category.color }} />
                          {t.category.name}
                        </span>
                      )}
                      {t.paymentMethod === 'CREDIT_CARD' && !t.isCardPayment && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                          Cartão
                          {t.installmentNumber != null ? ` ${t.installmentNumber}×` : ''}
                        </span>
                      )}
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{formatDate(t.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-sm font-semibold',
                      t.transferId ? 'text-violet-600'
                        : t.isCardPayment ? 'text-pink-600'
                        : t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600',
                    )}>
                      {t.transferId ? '' : t.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </span>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-primary"
                        onClick={() => { setEditing(t); setModalOpen(true) }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        transaction={editing}
        categories={categories}
        accounts={accounts}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={refetch}
      />
    </div>
  )
}
