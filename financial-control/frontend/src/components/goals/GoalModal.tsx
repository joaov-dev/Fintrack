import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GoalProgress } from '@/types'
import { Account } from '@/types'

interface GoalModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  goal?: GoalProgress | null
  accounts: Account[]
}

const NONE = '__none__'

export function GoalModal({ open, onClose, onSave, goal, accounts }: GoalModalProps) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [linkedAccountId, setLinkedAccountId] = useState(NONE)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (goal) {
      setName(goal.name)
      setTargetAmount(String(goal.targetAmount))
      setTargetDate(goal.targetDate ? goal.targetDate.slice(0, 10) : '')
      setLinkedAccountId(goal.linkedAccountId ?? NONE)
      setNotes(goal.notes ?? '')
    } else {
      setName('')
      setTargetAmount('')
      setTargetDate('')
      setLinkedAccountId(NONE)
      setNotes('')
    }
  }, [goal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(targetAmount.replace(',', '.'))
    if (!name.trim() || isNaN(amount) || amount <= 0) return

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        targetAmount: amount,
        targetDate: targetDate || null,
        linkedAccountId: linkedAccountId === NONE ? null : linkedAccountId,
        notes: notes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Nome da meta *</Label>
            <Input
              id="goal-name"
              placeholder="Ex: Reserva de Emergência"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Target amount */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-amount">Valor alvo (R$) *</Label>
            <Input
              id="goal-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="20000,00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
          </div>

          {/* Linked account */}
          <div className="space-y-1.5">
            <Label>Conta vinculada</Label>
            <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem conta vinculada</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400">
              O progresso é calculado pelo saldo atual da conta selecionada.
            </p>
          </div>

          {/* Target date */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Prazo (opcional)</Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-notes">Notas (opcional)</Label>
            <Input
              id="goal-notes"
              placeholder="Observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Salvando...' : goal ? 'Salvar' : 'Criar Meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
