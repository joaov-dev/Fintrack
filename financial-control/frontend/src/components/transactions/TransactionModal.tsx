import { useEffect, useState } from 'react'
import { Loader2, Repeat2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Transaction, Category, Account, RECURRENCE_TYPE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  transaction?: Transaction | null
  categories: Category[]
  accounts: Account[]
}

const defaultForm = {
  type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  isRecurring: false,
  recurrenceType: '' as string,
  recurrenceEnd: '',
}

export function TransactionModal({ open, onClose, onSave, transaction, categories, accounts }: TransactionModalProps) {
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        description: transaction.description,
        amount: String(transaction.amount),
        categoryId: transaction.categoryId,
        accountId: transaction.accountId || '',
        date: transaction.date.slice(0, 10),
        notes: transaction.notes || '',
        isRecurring: transaction.isRecurring,
        recurrenceType: transaction.recurrenceType || '',
        recurrenceEnd: transaction.recurrenceEnd ? transaction.recurrenceEnd.slice(0, 10) : '',
      })
    } else {
      setForm(defaultForm)
    }
  }, [transaction, open])

  const filteredCategories = categories.filter((c) => c.type === form.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        accountId: form.accountId || null,
        date: new Date(form.date + 'T12:00:00').toISOString(),
        notes: form.notes || null,
        isRecurring: form.isRecurring,
        recurrenceType: form.isRecurring && form.recurrenceType ? form.recurrenceType : null,
        recurrenceEnd: form.isRecurring && form.recurrenceEnd
          ? new Date(form.recurrenceEnd + 'T23:59:59').toISOString()
          : null,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setForm({ ...form, type: t, categoryId: '' })}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                  form.type === t
                    ? t === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t === 'EXPENSE' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input placeholder="Ex: Almoço no trabalho" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })} required>
              <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Conta <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Select value={form.accountId || 'none'} onValueChange={(v) => setForm({ ...form, accountId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conta específica</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recurring toggle — not shown for auto-generated instances */}
          {!transaction?.parentId && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecurring: !form.isRecurring, recurrenceType: !form.isRecurring ? 'MONTHLY' : '' })}
                className={cn('flex items-center gap-2 w-full text-sm font-medium transition-colors', form.isRecurring ? 'text-primary' : 'text-slate-600 hover:text-slate-900')}
              >
                <Repeat2 className="w-4 h-4" />
                Transação recorrente
                <div className={cn('ml-auto w-9 h-5 rounded-full transition-colors flex items-center px-0.5', form.isRecurring ? 'bg-primary justify-end' : 'bg-slate-200 justify-start')}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {form.isRecurring && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frequência</Label>
                    <Select value={form.recurrenceType} onValueChange={(v) => setForm({ ...form, recurrenceType: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECURRENCE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Encerrar em <span className="text-slate-400">(opcional)</span></Label>
                    <Input type="date" className="h-8 text-xs" value={form.recurrenceEnd} onChange={(e) => setForm({ ...form, recurrenceEnd: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Observações <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input placeholder="Anotações adicionais" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !form.categoryId}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {transaction ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
