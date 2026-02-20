import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Category, Budget } from '@/types'
import { monthLabel } from '@/lib/utils'

interface BudgetModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  category: Category
  existing?: Budget | null
  month: number
  year: number
}

export function BudgetModal({ open, onClose, onSave, category, existing, month, year }: BudgetModalProps) {
  const [amount, setAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setAmount(existing ? String(existing.amount) : '')
  }, [existing, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({ categoryId: category.id, month, year, amount: parseFloat(amount) })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Orçamento — {category.name}</DialogTitle>
          <DialogDescription className="capitalize">{monthLabel(month, year)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Limite de gastos (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 500,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
