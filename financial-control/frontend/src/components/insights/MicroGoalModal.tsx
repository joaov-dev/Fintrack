import { useState, useEffect } from 'react'
import { MicroGoal, Category } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface MicroGoalModalProps {
  open: boolean
  onClose: () => void
  onSave: (payload: {
    name: string
    scopeType: 'CATEGORY' | 'TOTAL_SPEND'
    scopeRefId?: string | null
    limitAmount: number
    startDate: string
    endDate: string
  }) => Promise<void>
  categories: Category[]
  editGoal?: MicroGoal | null
}

function monthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}

function monthEnd() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

export function MicroGoalModal({ open, onClose, onSave, categories, editGoal }: MicroGoalModalProps) {
  const [name, setName] = useState('')
  const [scopeType, setScopeType] = useState<'CATEGORY' | 'TOTAL_SPEND'>('CATEGORY')
  const [categoryId, setCategoryId] = useState<string>('')
  const [limitAmount, setLimitAmount] = useState('')
  const [startDate, setStartDate] = useState(monthStart())
  const [endDate, setEndDate] = useState(monthEnd())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  // Populate fields when editing
  useEffect(() => {
    if (editGoal) {
      setName(editGoal.name)
      setScopeType(editGoal.scopeType)
      setCategoryId(editGoal.scopeRefId ?? '')
      setLimitAmount(String(editGoal.limitAmount))
      setStartDate(editGoal.startDate.split('T')[0])
      setEndDate(editGoal.endDate.split('T')[0])
    } else {
      setName('')
      setScopeType('CATEGORY')
      setCategoryId('')
      setLimitAmount('')
      setStartDate(monthStart())
      setEndDate(monthEnd())
    }
    setError(null)
  }, [editGoal, open])

  const dailyLimit = (() => {
    const limit = parseFloat(limitAmount)
    if (!limit || !startDate || !endDate) return null
    const days = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    return limit / days
  })()

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) return setError('Nome é obrigatório.')
    const limit = parseFloat(limitAmount)
    if (!limit || limit <= 0) return setError('Valor limite deve ser positivo.')
    if (scopeType === 'CATEGORY' && !categoryId) return setError('Selecione uma categoria.')
    if (!startDate || !endDate) return setError('Período obrigatório.')
    if (new Date(startDate) > new Date(endDate)) return setError('Data início deve ser anterior à data fim.')

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        scopeType,
        scopeRefId: scopeType === 'CATEGORY' ? categoryId : null,
        limitAmount: limit,
        startDate,
        endDate,
      })
      onClose()
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editGoal ? 'Editar Meta' : 'Nova Micro-Meta'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da meta *</Label>
            <Input
              placeholder="Ex: Limite de restaurantes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Escopo</Label>
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as typeof scopeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CATEGORY">Categoria específica</SelectItem>
                <SelectItem value="TOTAL_SPEND">Total de despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeType === 'CATEGORY' && (
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Limite (R$) *</Label>
            <Input
              type="number"
              placeholder="0,00"
              min="0"
              step="0.01"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
            />
            {dailyLimit !== null && (
              <p className="text-[11px] text-muted-foreground">
                Ritmo recomendado: R$ {dailyLimit.toFixed(2)}/dia
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editGoal ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
