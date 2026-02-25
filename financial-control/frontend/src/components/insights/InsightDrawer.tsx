import { useNavigate } from 'react-router-dom'
import { BellOff, ExternalLink, X, RotateCcw } from 'lucide-react'
import { Insight, InsightSeverity } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Atenção',
  INFO: 'Info',
}

const SEVERITY_BADGE: Record<InsightSeverity, string> = {
  CRITICAL: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  WARNING:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  INFO:     'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
}

interface InsightDrawerProps {
  insight: Insight
  open: boolean
  onClose: () => void
  onDismiss: (id: string) => Promise<void>
  onSnooze: (id: string, days?: number) => Promise<void>
  onReactivate?: (id: string) => Promise<void>
  hideDismiss?: boolean
}

export function InsightDrawer({ insight, open, onClose, onDismiss, onSnooze, onReactivate, hideDismiss }: InsightDrawerProps) {
  const navigate = useNavigate()
  const isSnoozed = insight.status === 'SNOOZED'
  const snoozeLabel = isSnoozed && insight.snoozedUntil
    ? `Silenciado até ${new Date(insight.snoozedUntil).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    : 'Silenciar 7 dias'

  const handleCta = () => {
    if (!insight.cta) return
    const { route, params } = insight.cta
    const query = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : ''
    navigate(route + query)
    onClose()
  }

  const handleDismiss = async () => {
    await onDismiss(insight.id)
    onClose()
  }

  const handleReactivate = async () => {
    await onReactivate?.(insight.id)
    onClose()
  }

  const handleSnooze = async () => {
    await onSnooze(insight.id, 7)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${SEVERITY_BADGE[insight.severity]}`}>
              {SEVERITY_LABELS[insight.severity]}
            </span>
          </div>
          <DialogTitle className="text-left">{insight.title}</DialogTitle>
          <DialogDescription className="text-left">{insight.message}</DialogDescription>
        </DialogHeader>

        {/* Explanation */}
        {insight.explanation && (
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/70 uppercase tracking-wide text-[10px]">Como calculamos</p>
            <p>{insight.explanation}</p>
          </div>
        )}

        {/* Suggested action */}
        {insight.suggestedAction && (
          <p className="text-sm text-slate-600 dark:text-slate-400 border-l-2 border-primary/40 pl-3">
            {insight.suggestedAction}
          </p>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 pt-1">
          {insight.cta && (
            <Button onClick={handleCta} className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              {insight.cta.label}
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isSnoozed ? undefined : handleSnooze}
              disabled={isSnoozed}
              className={`flex-1 gap-2 text-xs ${isSnoozed ? 'text-amber-500 dark:text-amber-400 border-amber-300 dark:border-amber-700' : ''}`}
            >
              <BellOff className="w-3.5 h-3.5" />
              {snoozeLabel}
            </Button>
            {hideDismiss ? (
              <Button variant="outline" size="sm" onClick={handleReactivate} className="flex-1 gap-2 text-xs text-emerald-600 hover:text-emerald-700 hover:border-emerald-300">
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleDismiss} className="flex-1 gap-2 text-xs text-rose-600 hover:text-rose-700 hover:border-rose-300">
                <X className="w-3.5 h-3.5" />
                Dispensar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
