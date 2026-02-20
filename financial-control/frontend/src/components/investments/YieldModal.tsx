import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface YieldModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { amount: number; date: string; description?: string }) => Promise<void>
  positionName: string
}

export function YieldModal({ open, onClose, onSave, positionName }: YieldModalProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const reset = () => { setAmount(''); setDate(new Date().toISOString().slice(0, 10)); setDescription('') }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Rendimento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-2">
          Ativo: <span className="font-medium text-slate-700">{positionName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Ex: Dividendos, Juros, Cupom"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !amount}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
