import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Account, ACCOUNT_TYPE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface AccountModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  account?: Account | null
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#f59e0b', '#f97316', '#f43f5e', '#94a3b8',
]

const defaultForm = {
  name: '',
  type: 'CHECKING' as Account['type'],
  color: '#6366f1',
  initialBalance: '0',
}

export function AccountModal({ open, onClose, onSave, account }: AccountModalProps) {
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name,
        type: account.type,
        color: account.color,
        initialBalance: String(account.initialBalance),
      })
    } else {
      setForm(defaultForm)
    }
  }, [account, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({ ...form, initialBalance: parseFloat(form.initialBalance) || 0 })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da conta</Label>
            <Input
              placeholder="Ex: Nubank, Itaú, Carteira"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Account['type'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!account && (
            <div className="space-y-1.5">
              <Label>Saldo inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.initialBalance}
                onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Saldo atual antes de começar a usar o app
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all ring-offset-2',
                    form.color === c ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-105',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {account ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
