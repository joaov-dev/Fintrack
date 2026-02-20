import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Account } from '@/types'

interface TransferModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => Promise<void>
  accounts: Account[]
  defaultToAccountId?: string
}

export function TransferModal({ open, onClose, onSave, accounts, defaultToAccountId }: TransferModalProps) {
  const investmentAccounts = accounts.filter((a) => a.type === 'INVESTMENT')
  const sourceAccounts = accounts.filter((a) => a.type !== 'INVESTMENT')

  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState(defaultToAccountId ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const reset = () => {
    setFromAccountId('')
    setToAccountId(defaultToAccountId ?? '')
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccountId || !toAccountId || !amount) return
    setIsSaving(true)
    try {
      await onSave({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        date: new Date(date + 'T12:00:00').toISOString(),
        description: description || undefined,
      })
      handleClose()
    } catch {
      // error handling (toast) is done in the parent handler
    } finally {
      setIsSaving(false)
    }
  }

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aportar em Investimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From / To accounts */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Conta de Origem</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="De onde sai o dinheiro" />
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

            <ArrowRight className="w-4 h-4 text-slate-400 mt-6 shrink-0" />

            <div className="flex-1 space-y-1.5">
              <Label>Conta de Destino</Label>
              <Select value={toAccountId} onValueChange={setToAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Para onde vai" />
                </SelectTrigger>
                <SelectContent>
                  {investmentAccounts.map((a) => (
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
          {fromAccount && toAccount && (
            <div className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 text-slate-500">
              <span>Saldo disponível em <strong>{fromAccount.name}</strong>:</span>
              <span className="font-semibold text-slate-700">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fromAccount.balance)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
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
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input
              placeholder="Ex: Aporte mensal RICO"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !fromAccountId || !toAccountId || !amount}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
