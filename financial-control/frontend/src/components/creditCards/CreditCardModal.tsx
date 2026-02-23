import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard } from '@/types'

interface CreditCardModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  card?: CreditCard | null
}

const defaultForm = {
  name: '',
  brand: '',
  creditLimit: '',
  statementClosingDay: '',
  dueDay: '',
  color: '#6366f1',
}

const BRAND_OPTIONS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros']

export function CreditCardModal({ open, onClose, onSave, card }: CreditCardModalProps) {
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (card) {
      setForm({
        name: card.name,
        brand: card.brand ?? '',
        creditLimit: String(card.creditLimit),
        statementClosingDay: String(card.statementClosingDay),
        dueDay: String(card.dueDay),
        color: card.color,
      })
    } else {
      setForm(defaultForm)
    }
  }, [card, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        name: form.name,
        brand: form.brand || null,
        creditLimit: parseFloat(form.creditLimit),
        statementClosingDay: parseInt(form.statementClosingDay),
        dueDay: parseInt(form.dueDay),
        color: form.color,
      })
      onClose()
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false)
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{card ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do cartão *</Label>
            <Input
              placeholder="Ex: Nubank, Itaú Platinum"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bandeira <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <select
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
              >
                <option value="">Selecionar</option>
                {BRAND_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Limite (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.creditLimit}
                onChange={(e) => set('creditLimit', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dia de fechamento *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 10"
                value={form.statementClosingDay}
                onChange={(e) => set('statementClosingDay', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dia de vencimento *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 20"
                value={form.dueDay}
                onChange={(e) => set('dueDay', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="w-10 h-9 rounded-md border border-slate-200 cursor-pointer p-0.5"
              />
              <span className="text-sm text-slate-500">{form.color}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={isSaving || !form.name || !form.creditLimit || !form.statementClosingDay || !form.dueDay}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {card ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
