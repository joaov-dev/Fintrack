import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  InvestmentPosition, InvestmentMovementType,
  INVESTMENT_MOVEMENT_TYPE_LABELS, INVESTMENT_MOVEMENT_TYPE_COLORS,
} from '@/types'
import { cn } from '@/lib/utils'
import { AddMovementPayload } from '@/hooks/useInvestmentMovements'

const MOVEMENT_TYPES: InvestmentMovementType[] = [
  'CONTRIBUTION', 'WITHDRAWAL', 'DIVIDEND', 'JCP', 'INTEREST', 'BONUS', 'SPLIT',
]

const TYPE_DESCRIPTIONS: Record<InvestmentMovementType, string> = {
  CONTRIBUTION: 'Compra / aporte de recursos',
  WITHDRAWAL:   'Venda / resgate de recursos',
  DIVIDEND:     'Dividendos recebidos',
  JCP:          'Juros sobre Capital Próprio',
  INTEREST:     'Rendimento ou cupom de renda fixa',
  BONUS:        'Ações ou cotas bonificadas (custo zero)',
  SPLIT:        'Desdobramento (split) de ações',
}

// Movement types that show quantity + unit price
const HAS_QTY: InvestmentMovementType[] = ['CONTRIBUTION', 'WITHDRAWAL', 'BONUS', 'SPLIT']
// Movement types where amount = 0 by default
const ZERO_AMOUNT: InvestmentMovementType[] = ['BONUS', 'SPLIT']
// Movement types that auto-compute unit price
const AUTO_UNIT: InvestmentMovementType[] = ['CONTRIBUTION', 'WITHDRAWAL']

interface Props {
  open: boolean
  onClose: () => void
  onSave: (positionId: string, payload: AddMovementPayload) => Promise<void>
  positions: InvestmentPosition[]
  defaultPositionId?: string
}

export function MovementModal({ open, onClose, onSave, positions, defaultPositionId }: Props) {
  const [positionId, setPositionId] = useState(defaultPositionId ?? positions[0]?.id ?? '')
  const [type, setType] = useState<InvestmentMovementType>('CONTRIBUTION')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setPositionId(defaultPositionId ?? positions[0]?.id ?? '')
    setType('CONTRIBUTION')
    setAmount('')
    setQuantity('')
    setUnitPrice('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
  }, [open, defaultPositionId, positions])

  // Auto-compute unit price from amount / quantity
  useEffect(() => {
    if (!AUTO_UNIT.includes(type)) return
    const a = parseFloat(amount)
    const q = parseFloat(quantity)
    if (a > 0 && q > 0) {
      setUnitPrice((a / q).toFixed(6).replace(/\.?0+$/, ''))
    }
  }, [amount, quantity, type])

  const showQty   = HAS_QTY.includes(type)
  const zeroAmt   = ZERO_AMOUNT.includes(type)
  const showUnit  = AUTO_UNIT.includes(type)

  const handleSave = async () => {
    const a = zeroAmt ? 0 : parseFloat(amount)
    if (!positionId || isNaN(a) || !date) return
    const q = quantity ? parseFloat(quantity) : null
    const u = unitPrice ? parseFloat(unitPrice) : null

    setSaving(true)
    try {
      await onSave(positionId, {
        type,
        amount: a,
        quantity: q,
        unitPrice: u,
        date: new Date(date).toISOString(),
        description: description.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const selectedPosition = positions.find((p) => p.id === positionId)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Position selector */}
          {positions.length > 1 && (
            <div className="space-y-1.5">
              <Label>Ativo</Label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.ticker ? ` (${p.ticker})` : ''}
                  </option>
                ))}
              </select>
              {selectedPosition && (
                <p className="text-xs text-muted-foreground">
                  Valor atual: {selectedPosition.currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {selectedPosition.quantity != null && ` · Qtd: ${selectedPosition.quantity}`}
                </p>
              )}
            </div>
          )}

          {/* Movement type */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {MOVEMENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors text-left',
                    type === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  {INVESTMENT_MOVEMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</p>
          </div>

          {/* Amount */}
          {!zeroAmt && (
            <div className="space-y-1.5">
              <Label htmlFor="mv-amount">Valor (R$)</Label>
              <Input
                id="mv-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}

          {/* Quantity + Unit Price */}
          {showQty && (
            <div className={cn('grid gap-3', showUnit ? 'grid-cols-2' : 'grid-cols-1')}>
              <div className="space-y-1.5">
                <Label htmlFor="mv-qty">Quantidade{type === 'SPLIT' ? ' (delta)' : ''}</Label>
                <Input
                  id="mv-qty"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              {showUnit && (
                <div className="space-y-1.5">
                  <Label htmlFor="mv-unit">Preço unitário (R$)</Label>
                  <Input
                    id="mv-unit"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0,000000"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="mv-date">Data</Label>
            <Input
              id="mv-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="mv-desc">Descrição (opcional)</Label>
            <Input
              id="mv-desc"
              placeholder={`Ex: ${type === 'SPLIT' ? '2:1 split' : INVESTMENT_MOVEMENT_TYPE_LABELS[type]}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Summary badge */}
          {((!zeroAmt && parseFloat(amount) > 0) || (zeroAmt && parseFloat(quantity) > 0)) && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm flex items-center gap-2">
              <Badge className={cn('border-0 text-xs', INVESTMENT_MOVEMENT_TYPE_COLORS[type])}>
                {INVESTMENT_MOVEMENT_TYPE_LABELS[type]}
              </Badge>
              <span className="text-muted-foreground">
                {!zeroAmt && parseFloat(amount) > 0 && (
                  <>R$ {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                )}
                {quantity && parseFloat(quantity) > 0 && (
                  <> · {parseFloat(quantity)} unidades</>
                )}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || (!positionId)}>
            {saving ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
