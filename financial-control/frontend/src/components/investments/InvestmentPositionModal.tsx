import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InvestmentPosition, InvestmentPositionType, INVESTMENT_POSITION_TYPE_LABELS } from '@/types'

interface InvestmentPositionModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  position?: InvestmentPosition | null
  accountId: string
}

const defaultForm = {
  name: '',
  ticker: '',
  type: 'STOCK' as InvestmentPositionType,
  quantity: '',
  avgPrice: '',
  currentValue: '',
  notes: '',
}

export function InvestmentPositionModal({ open, onClose, onSave, position, accountId }: InvestmentPositionModalProps) {
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (position) {
      setForm({
        name: position.name,
        ticker: position.ticker ?? '',
        type: position.type,
        quantity: position.quantity != null ? String(position.quantity) : '',
        avgPrice: position.avgPrice != null ? String(position.avgPrice) : '',
        currentValue: String(position.currentValue),
        notes: position.notes ?? '',
      })
    } else {
      setForm(defaultForm)
    }
  }, [position, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        accountId,
        name: form.name,
        ticker: form.ticker || null,
        type: form.type,
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        avgPrice: form.avgPrice ? parseFloat(form.avgPrice) : null,
        currentValue: form.currentValue ? parseFloat(form.currentValue) : 0,
        notes: form.notes || null,
      })
      onClose()
    } catch {
      // error handling (toast) is done in the parent handler
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{position ? 'Editar Ativo' : 'Adicionar Ativo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Nome do Ativo</Label>
              <Input
                placeholder="Ex: PETR4, Tesouro IPCA+"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ticker <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                placeholder="Ex: PETR4"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InvestmentPositionType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(INVESTMENT_POSITION_TYPE_LABELS) as [InvestmentPositionType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quantidade <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                type="number"
                step="0.000001"
                min="0"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preço Médio (R$) <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.avgPrice}
                onChange={(e) => setForm({ ...form, avgPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valor Atual (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.currentValue}
              onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observações <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input
              placeholder="Notas sobre este ativo"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !form.name}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {position ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
