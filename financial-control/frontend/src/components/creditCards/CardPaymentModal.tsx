import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Account, CardStatement, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CardPaymentModalProps {
  open: boolean
  onClose: () => void
  statement: CardStatement | null
  accounts: Account[]
  categories: Category[]
  onPay: (payload: { amount: number; fromAccountId: string; date: string; categoryId: string }) => Promise<void>
}

export function CardPaymentModal({
  open,
  onClose,
  statement,
  accounts,
  categories,
  onPay,
}: CardPaymentModalProps) {
  const openBalance = statement ? statement.totalSpent - statement.totalPaid : 0
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  const [amount, setAmount] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [date, setDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && statement) {
      setAmount(String(openBalance.toFixed(2)))
      setDate(new Date().toISOString().slice(0, 10))
      setFromAccountId('')
      setCategoryId('')
    }
  }, [open, statement])

  const remaining = openBalance - (parseFloat(amount) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onPay({
        amount: parseFloat(amount),
        fromAccountId,
        date: new Date(date + 'T12:00:00').toISOString(),
        categoryId,
      })
      onClose()
    } catch {
      // parent handles error toast
    } finally {
      setIsSaving(false)
    }
  }

  const bankAccounts = accounts.filter((a) => ['CHECKING', 'SAVINGS', 'CASH'].includes(a.type))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
        </DialogHeader>

        {statement && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Statement context */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Em aberto</span>
                <span className="font-semibold text-slate-900">{formatCurrency(openBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Vencimento</span>
                <span className="text-slate-700">
                  {new Date(statement.dueDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valor a pagar (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={openBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Conta de origem *</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data do pagamento *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Preview */}
            <div className={cn(
              'rounded-lg px-4 py-3 flex justify-between text-sm',
              remaining <= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200',
            )}>
              <span className={remaining <= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                {remaining <= 0 ? 'Fatura quitada após pagamento' : 'Em aberto após pagamento'}
              </span>
              <span className={cn('font-semibold', remaining <= 0 ? 'text-emerald-700' : 'text-amber-700')}>
                {formatCurrency(Math.max(0, remaining))}
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                type="submit"
                disabled={isSaving || !amount || !fromAccountId || !date || !categoryId}
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
