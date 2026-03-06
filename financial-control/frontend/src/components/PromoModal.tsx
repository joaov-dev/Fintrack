import { useEffect, useState } from 'react'
import { Tag, Sparkles, Loader2, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePromotion } from '@/hooks/usePromotion'
import { startCheckout } from '@/hooks/useBilling'

export function PromoModal() {
  const { promotion, markSeen } = usePromotion()
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (promotion && !promotion.shownAt) {
      setOpen(true)
      markSeen()
    }
  }, [promotion, markSeen])

  async function handleSubscribe() {
    setIsPending(true)
    try {
      await startCheckout('PRO', 'MONTHLY')
    } catch {
      setIsPending(false)
    }
  }

  if (!promotion) return null

  const expiresIn = Math.max(
    1,
    Math.ceil((new Date(promotion.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-500 px-6 pt-7 pb-5 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Oferta especial para você</h2>
          <p className="text-sm text-violet-200 mt-1">Voltamos com um desconto exclusivo</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Oferta especial</DialogTitle>
            <DialogDescription>Desconto exclusivo no Plano Pro</DialogDescription>
          </DialogHeader>

          {/* Discount highlight */}
          <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-4 text-center">
            <p className="text-4xl font-black text-violet-600 dark:text-violet-400">
              {promotion.discountPct}% OFF
            </p>
            <p className="text-sm text-slate-500 mt-1">no primeiro mês do Plano Pro</p>
          </div>

          {/* Expiry */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Oferta válida por {expiresIn} dia{expiresIn !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full"
              onClick={handleSubscribe}
              disabled={isPending}
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Sparkles className="w-4 h-4 mr-2" />}
              Assinar agora com desconto
            </Button>
            <Button
              variant="ghost"
              className="w-full text-slate-400"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Talvez depois
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
