import { useState, useEffect } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Account } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface AccountTransferModalProps {
  open: boolean
  onClose: () => void
  onTransfer: (data: {
    fromAccountId: string
    toAccountId: string
    amount: number
    date: string
    description?: string
  }) => Promise<void>
  accounts: Account[]
}

export function AccountTransferModal({ open, onClose, onTransfer, accounts }: AccountTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const reset = () => {
    setFromAccountId('')
    setToAccountId('')
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError(null)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)

  const destinationAccounts = accounts.filter((a) => a.id !== fromAccountId)
  const sourceAccounts = accounts.filter((a) => a.id !== toAccountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fromAccountId) return setError('Selecione a conta de origem.')
    if (!toAccountId) return setError('Selecione a conta de destino.')
    if (fromAccountId === toAccountId) return setError('As contas de origem e destino devem ser diferentes.')

    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) return setError('Informe um valor válido.')

    if (fromAccount && numAmount > fromAccount.balance) {
      return setError(`Saldo insuficiente em "${fromAccount.name}".`)
    }

    setIsSaving(true)
    try {
      await onTransfer({
        fromAccountId,
        toAccountId,
        amount: numAmount,
        date: new Date(date + 'T12:00:00').toISOString(),
        description: description.trim() || undefined,
      })
      onClose()
    } catch {
      setError('Erro ao realizar transferência. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Transferência entre Contas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From → To */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Conta de Origem *</Label>
              <Select
                value={fromAccountId}
                onValueChange={(v) => { setFromAccountId(v); if (v === toAccountId) setToAccountId('') }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="De onde sai" />
                </SelectTrigger>
                <SelectContent>
                  {sourceAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground mb-2.5 shrink-0" />

            <div className="flex-1 space-y-1.5">
              <Label>Conta de Destino *</Label>
              <Select
                value={toAccountId}
                onValueChange={(v) => { setToAccountId(v); if (v === fromAccountId) setFromAccountId('') }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Para onde vai" />
                </SelectTrigger>
                <SelectContent>
                  {destinationAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Balance preview */}
          {fromAccount && (
            <div className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2 text-muted-foreground">
              <span>Saldo disponível em <span className="font-semibold text-foreground">{fromAccount.name}</span></span>
              <span className={fromAccount.balance < 0 ? 'font-semibold text-rose-500' : 'font-semibold text-foreground'}>
                {formatCurrency(fromAccount.balance)}
              </span>
            </div>
          )}

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              placeholder={
                fromAccount && toAccount
                  ? `Transferência de ${fromAccount.name} para ${toAccount.name}`
                  : 'Ex: Reserva de emergência'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !fromAccountId || !toAccountId || !amount}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
