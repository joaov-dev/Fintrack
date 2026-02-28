import { Link } from 'react-router-dom'
import { CreditCard, Calendar, Clock, AlertTriangle, CheckCircle2, Loader2, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEntitlements, openBillingPortal, cancelSubscription, resumeSubscription } from '@/hooks/useBilling'
import { useToast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/lib/apiError'
import { SubscriptionStatus, PlanCode } from '@/types'
import { cn } from '@/lib/utils'

// ─── Config maps ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Partial<Record<SubscriptionStatus, {
  label: string
  badge: string
  icon: React.ElementType
}>> = {
  ACTIVE:              { label: 'Ativa',              badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  TRIALING:            { label: 'Período de teste',   badge: 'bg-blue-100 text-blue-700',       icon: Clock },
  PAST_DUE:            { label: 'Pgto. pendente',     badge: 'bg-amber-100 text-amber-700',     icon: AlertTriangle },
  CANCELED:            { label: 'Cancelada',          badge: 'bg-slate-100 text-slate-600',     icon: AlertTriangle },
  UNPAID:              { label: 'Inadimplente',       badge: 'bg-rose-100 text-rose-700',       icon: AlertTriangle },
  INCOMPLETE:          { label: 'Incompleta',         badge: 'bg-amber-100 text-amber-700',     icon: Clock },
  INCOMPLETE_EXPIRED:  { label: 'Expirada',           badge: 'bg-rose-100 text-rose-700',       icon: AlertTriangle },
}

const PLAN_CONFIG: Record<PlanCode, { label: string; badge: string }> = {
  FREE:     { label: 'Free',     badge: 'bg-slate-100 text-slate-600' },
  PRO:      { label: 'Pro',      badge: 'bg-primary/10 text-primary' },
  BUSINESS: { label: 'Business', badge: 'bg-amber-100 text-amber-700' },
}

const PRO_HIGHLIGHTS = [
  'Contas e transações ilimitadas',
  'Cartões de crédito',
  'Metas financeiras',
  'Relatórios avançados',
  'Insights automáticos',
  'Previsão financeira',
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { data, isLoading, reload } = useEntitlements()
  const { toast } = useToast()

  async function onCancel() {
    if (!confirm('Confirmar cancelamento da assinatura ao fim do ciclo atual?')) return
    try {
      await cancelSubscription()
      toast({ title: 'Assinatura configurada para cancelamento ao fim do ciclo' })
      await reload()
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao cancelar assinatura'), variant: 'destructive' })
    }
  }

  async function onResume() {
    try {
      await resumeSubscription()
      toast({ title: 'Assinatura reativada com sucesso' })
      await reload()
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao reativar assinatura'), variant: 'destructive' })
    }
  }

  async function onPortal() {
    try {
      await openBillingPortal()
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao abrir portal de cobrança'), variant: 'destructive' })
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  const planCfg = PLAN_CONFIG[data.plan] ?? PLAN_CONFIG.FREE
  const statusCfg = data.subscriptionStatus ? STATUS_CONFIG[data.subscriptionStatus] : null
  const StatusIcon = statusCfg?.icon ?? CheckCircle2

  const isFree = data.plan === 'FREE'
  const isCanceling = data.subscriptionStatus === 'CANCELED' && !!data.subscriptionEndsAt
  const canCancel = !isFree && data.subscriptionStatus === 'ACTIVE'
  const canResume = !isFree && data.subscriptionStatus === 'CANCELED'
  const isPastDue = data.subscriptionStatus === 'PAST_DUE' || data.subscriptionStatus === 'UNPAID'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assinatura</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gerencie seu plano e forma de pagamento</p>
      </div>

      {/* Past due alert */}
      {isPastDue && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Pagamento pendente</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Atualize seu método de pagamento para manter o acesso.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                onClick={onPortal}
              >
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan card */}
      <Card className="border-slate-200">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">

            {/* Plan info */}
            <div className="space-y-3">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', planCfg.badge)}>
                  {planCfg.label}
                </span>
                {statusCfg && (
                  <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1', statusCfg.badge)}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-slate-900">Plano {planCfg.label}</h2>

              {/* Dates */}
              <div className="space-y-1.5">
                {data.subscriptionEndsAt && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {isCanceling
                      ? `Acesso válido até ${new Date(data.subscriptionEndsAt).toLocaleDateString('pt-BR')}`
                      : `Renova em ${new Date(data.subscriptionEndsAt).toLocaleDateString('pt-BR')}`
                    }
                  </div>
                )}
                {data.trialEndsAt && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    Teste gratuito até {new Date(data.trialEndsAt).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {isFree && !data.subscriptionEndsAt && (
                  <p className="text-sm text-slate-500">Sem renovação — plano gratuito</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {!isFree && (
                <Button variant="outline" size="sm" onClick={onPortal}>
                  <CreditCard className="w-4 h-4" />
                  Gerenciar pagamento
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={onCancel}
                >
                  Cancelar assinatura
                </Button>
              )}
              {canResume && (
                <Button size="sm" onClick={onResume}>
                  Reativar assinatura
                </Button>
              )}
            </div>
          </div>

          {/* Upgrade nudge for Free users */}
          {isFree && (
            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-slate-600">
                  Faça upgrade para desbloquear cartões, metas, insights e muito mais.
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/upgrade">Ver planos</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pro feature highlights for Free users */}
      {isFree && (
        <Card className="border-dashed border-slate-200">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Com o Pro você desbloqueia</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {PRO_HIGHLIGHTS.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
