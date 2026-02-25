import { useState, useEffect } from 'react'
import { Liability, LiabilityPayment } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LiabilityHistoryDialogProps {
  open: boolean
  onClose: () => void
  liability: Liability | null
  getPayments: (id: string) => Promise<LiabilityPayment[]>
}

export function LiabilityHistoryDialog({
  open, onClose, liability, getPayments,
}: LiabilityHistoryDialogProps) {
  const [payments, setPayments] = useState<LiabilityPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !liability) return
    setIsLoading(true)
    getPayments(liability.id)
      .then(setPayments)
      .finally(() => setIsLoading(false))
  }, [open, liability])

  if (!liability) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico de Pagamentos</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{liability.name}</p>
        </DialogHeader>

        <div className="min-h-[120px]">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Receipt className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {payments.map((p) => (
                <PaymentItem key={p.id} payment={p} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentItem({ payment }: { payment: LiabilityPayment }) {
  const date = new Date(payment.paidAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{date}</span>
        {payment.installmentsPaid != null && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {payment.installmentsPaid} {payment.installmentsPaid === 1 ? 'parcela' : 'parcelas'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Valor bruto</span>
        <span className="text-sm">{formatCurrency(payment.grossAmount)}</span>
      </div>

      {payment.discountAmount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Desconto</span>
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            - {formatCurrency(payment.discountAmount)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-1.5">
        <span className="text-sm font-semibold">Valor pago</span>
        <span className="text-sm font-bold text-primary">{formatCurrency(payment.paidAmount)}</span>
      </div>

      {payment.notes && (
        <p className="text-xs text-muted-foreground pt-0.5">{payment.notes}</p>
      )}
    </div>
  )
}
