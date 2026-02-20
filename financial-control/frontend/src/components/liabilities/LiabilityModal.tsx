import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Liability, LiabilityType, LIABILITY_TYPE_LABELS } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface LiabilityModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  liability?: Liability | null
}

type Mode = 'simple' | 'detailed'

const defaultForm = {
  name: '',
  type: 'LOAN' as LiabilityType,
  currentBalance: '',
  installments: '',
  interestRate: '',
  dueDate: '',
  notes: '',
}

export function LiabilityModal({ open, onClose, onSave, liability }: LiabilityModalProps) {
  const [mode, setMode] = useState<Mode>('simple')
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (liability) {
      const hasInstallments = liability.installments != null
      setMode(hasInstallments ? 'simple' : 'detailed')
      setForm({
        name: liability.name,
        type: liability.type,
        currentBalance: String(liability.currentBalance),
        installments: hasInstallments ? String(liability.installments) : '',
        interestRate: liability.interestRate != null ? String(liability.interestRate * 100) : '',
        dueDate: liability.dueDate ? liability.dueDate.slice(0, 10) : '',
        notes: liability.notes ?? '',
      })
    } else {
      setMode('simple')
      setForm(defaultForm)
    }
  }, [liability, open])

  const monthlyPayment =
    mode === 'simple' && form.currentBalance && form.installments
      ? parseFloat(form.currentBalance) / parseInt(form.installments)
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        name: form.name,
        type: form.type,
        currentBalance: parseFloat(form.currentBalance) || 0,
        installments: mode === 'simple' && form.installments ? parseInt(form.installments) : null,
        interestRate: mode === 'detailed' && form.interestRate ? parseFloat(form.interestRate) / 100 : null,
        dueDate: form.dueDate ? new Date(form.dueDate + 'T12:00:00').toISOString() : null,
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
          <DialogTitle>{liability ? 'Editar Passivo' : 'Novo Passivo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Type */}
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              placeholder="Ex: Financiamento Imóvel, Empréstimo Banco X"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LiabilityType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(LIABILITY_TYPE_LABELS) as [LiabilityType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode('simple')}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                mode === 'simple'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Simplificado
            </button>
            <button
              type="button"
              onClick={() => setMode('detailed')}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                mode === 'detailed'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Detalhado
            </button>
          </div>

          {/* Simple mode */}
          {mode === 'simple' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.currentBalance}
                    onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nº de Parcelas</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 48"
                    value={form.installments}
                    onChange={(e) => setForm({ ...form, installments: e.target.value })}
                    required
                  />
                </div>
              </div>

              {monthlyPayment != null && !isNaN(monthlyPayment) && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                  <span className="text-sm text-slate-500">Parcela mensal estimada</span>
                  <span className="text-base font-bold text-primary">{formatCurrency(monthlyPayment)}</span>
                </div>
              )}
            </>
          )}

          {/* Detailed mode */}
          {mode === 'detailed' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Saldo Devedor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.currentBalance}
                  onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Juros ao mês (%) <span className="text-slate-400 font-normal">(opcional)</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 1,99"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Shared optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vencimento <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                placeholder="Notas sobre este passivo"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={
                isSaving ||
                !form.name ||
                !form.currentBalance ||
                (mode === 'simple' && !form.installments)
              }
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {liability ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
