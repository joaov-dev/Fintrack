import { useState, useEffect } from 'react'
import { Liability, Account, Category, DiscountType } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface PayLiabilityModalProps {
  open: boolean
  onClose: () => void
  onPay: (id: string, payload: {
    installmentsPaid?: number | null
    grossAmount: number
    discountType?: DiscountType | null
    discountValue?: number | null
    accountId?: string | null
    categoryId?: string | null
    notes?: string | null
    paidAt: string
  }) => Promise<void>
  liability: Liability | null
  accounts: Account[]
  categories: Category[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function PayLiabilityModal({
  open, onClose, onPay, liability, accounts, categories,
}: PayLiabilityModalProps) {
  const [installmentsPaid, setInstallmentsPaid] = useState('1')
  const [grossAmount, setGrossAmount] = useState('')
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paidAt, setPaidAt] = useState(today())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  // Prisma Decimal fields are serialized as strings — normalize to number
  const balance = Number(liability?.currentBalance ?? 0)

  const installmentAmount = liability?.installments && liability.installments > 0
    ? balance / liability.installments
    : null

  // Reset on open
  useEffect(() => {
    if (!open) return
    const numInstallments = 1
    setInstallmentsPaid(String(numInstallments))
    setGrossAmount(
      installmentAmount !== null
        ? installmentAmount.toFixed(2)
        : balance.toFixed(2)
    )
    setDiscountEnabled(false)
    setDiscountType('PERCENTAGE')
    setDiscountValue('')
    setAccountId('')
    setCategoryId('')
    setPaidAt(today())
    setNotes('')
    setError(null)
  }, [open, liability])

  // Recalculate gross when installmentsPaid changes (only if installment-based)
  const handleInstallmentChange = (val: string) => {
    setInstallmentsPaid(val)
    const n = parseInt(val)
    if (installmentAmount !== null && !isNaN(n) && n > 0) {
      setGrossAmount((installmentAmount * n).toFixed(2))
    }
  }

  const gross = parseFloat(grossAmount) || 0
  const discountVal = parseFloat(discountValue) || 0
  const discountAmountCalc = discountEnabled && discountVal > 0
    ? discountType === 'PERCENTAGE'
      ? gross * (discountVal / 100)
      : discountVal
    : 0
  const paidAmountCalc = gross - discountAmountCalc

  const handleSave = async () => {
    setError(null)
    if (!liability) return
    if (gross <= 0) return setError('Valor bruto deve ser positivo.')
    if (gross > balance) return setError('Valor maior que o saldo atual.')
    if (discountEnabled && discountAmountCalc >= gross) return setError('Desconto não pode ser maior ou igual ao valor bruto.')
    if (!accountId) return setError('Selecione uma conta para registrar o pagamento.')
    if (!categoryId) return setError('Selecione uma categoria para a despesa.')

    setSaving(true)
    try {
      await onPay(liability.id, {
        installmentsPaid: installmentAmount !== null ? parseInt(installmentsPaid) || null : null,
        grossAmount: gross,
        discountType: discountEnabled ? discountType : null,
        discountValue: discountEnabled && discountVal > 0 ? discountVal : null,
        accountId: accountId || null,
        categoryId: categoryId || null,
        notes: notes.trim() || null,
        paidAt: new Date(paidAt).toISOString(),
      })
      onClose()
    } catch {
      setError('Erro ao registrar pagamento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!liability) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{liability.name}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Installments selector — only if liability has installments */}
          {installmentAmount !== null && (
            <div className="space-y-1.5">
              <Label>Parcelas a pagar</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={installmentsPaid}
                onChange={(e) => handleInstallmentChange(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Valor por parcela: R$ {installmentAmount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Gross amount */}
          <div className="space-y-1.5">
            <Label>Valor bruto (R$) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Saldo atual: R$ {balance.toFixed(2)}
            </p>
          </div>

          {/* Discount toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="discount-toggle"
                checked={discountEnabled}
                onChange={(e) => setDiscountEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <Label htmlFor="discount-toggle" className="cursor-pointer">Aplicar desconto / amortização</Label>
            </div>

            {discountEnabled && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Porcentagem (%)</SelectItem>
                      <SelectItem value="FIXED">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{discountType === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={discountType === 'PERCENTAGE' ? '0' : '0,00'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary box */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Valor bruto</span>
              <span>R$ {gross.toFixed(2)}</span>
            </div>
            {discountEnabled && discountAmountCalc > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Desconto</span>
                <span>- R$ {discountAmountCalc.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
              <span>Valor a pagar</span>
              <span className="text-primary">R$ {paidAmountCalc > 0 ? paidAmountCalc.toFixed(2) : '0,00'}</span>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Data do pagamento</Label>
            <Input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          {/* Account (required) */}
          <div className="space-y-1.5">
            <Label>Conta *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accountId && (
              <p className="text-[11px] text-muted-foreground">
                Uma despesa de R$ {paidAmountCalc.toFixed(2)} será criada nesta conta.
              </p>
            )}
          </div>

          {/* Category (required) */}
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

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Input
              placeholder="Observações sobre o pagamento"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Confirmar pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
