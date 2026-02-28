import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Zap, Crown, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBillingPlans, useEntitlements, startCheckout } from '@/hooks/useBilling'
import { BillingCycle, PlanCode } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { getApiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'

function fmt(cents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100)
}

// ─── Plan feature metadata ────────────────────────────────────────────────────
const PLAN_META: Record<string, {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  description: string
  features: string[]
  highlighted?: boolean
}> = {
  PRO: {
    icon: Zap,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    description: 'Para quem quer controle total das finanças pessoais.',
    highlighted: true,
    features: [
      'Contas ilimitadas',
      'Transações ilimitadas',
      'Cartões de crédito',
      'Metas financeiras',
      'Transações recorrentes',
      'Passivos e dívidas',
      'Relatórios avançados',
      'Insights automáticos',
      'Previsão financeira',
      'Regras de autocategorização',
      'Saúde financeira',
    ],
  },
  BUSINESS: {
    icon: Crown,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    description: 'Para investidores e gestão patrimonial completa.',
    features: [
      'Tudo do Pro',
      'Investimentos avançados',
      'Alocação de portfólio',
      'Exportação de dados',
      'Suporte prioritário',
    ],
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UpgradePage() {
  const [params] = useSearchParams()
  const [cycle, setCycle] = useState<BillingCycle>(
    (params.get('cycle') as BillingCycle) ?? 'MONTHLY',
  )
  const [pending, setPending] = useState<PlanCode | null>(null)

  const { plans, isLoading } = useBillingPlans()
  const { data: entitlements } = useEntitlements()
  const { toast } = useToast()

  const paidPlans = plans.filter((p) => p.code !== 'FREE')

  async function handleCheckout(planCode: PlanCode) {
    try {
      setPending(planCode)
      await startCheckout(planCode, cycle)
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao iniciar checkout'), variant: 'destructive' })
      setPending(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upgrade de plano</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {entitlements
              ? <>Plano atual: <span className="font-semibold text-slate-700">{entitlements.plan}</span></>
              : 'Escolha o plano ideal para você'
            }
          </p>
        </div>

        {/* Cycle toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1 shrink-0">
          <button
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
              cycle === 'MONTHLY'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
            onClick={() => setCycle('MONTHLY')}
          >
            Mensal
          </button>
          <button
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5',
              cycle === 'YEARLY'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
            onClick={() => setCycle('YEARLY')}
          >
            Anual
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                cycle === 'YEARLY'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700',
              )}
            >
              −30%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {paidPlans.map((plan) => {
            const meta = PLAN_META[plan.code]
            if (!meta) return null

            const price = plan.prices.find((p) => p.billingCycle === cycle)
            const Icon = meta.icon
            const isCurrent = entitlements?.plan === plan.code
            const isPending = pending === plan.code

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative overflow-hidden border-slate-200',
                  meta.highlighted && 'border-primary/40 ring-1 ring-primary/20',
                )}
              >
                {/* Accent bar */}
                {meta.highlighted && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
                )}

                <CardContent className="pt-6 pb-6 space-y-5">

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', meta.iconBg)}>
                        <Icon className={cn('w-5 h-5', meta.iconColor)} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{plan.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap shrink-0">
                        Plano atual
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    {price ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">
                          {fmt(price.amountCents, price.currency)}
                        </span>
                        <span className="text-sm text-slate-400">
                          /{cycle === 'MONTHLY' ? 'mês' : 'ano'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg text-slate-400">Preço não disponível</span>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full"
                    variant={meta.highlighted ? 'default' : 'outline'}
                    disabled={!price || isPending || isCurrent}
                    onClick={() => handleCheckout(plan.code as PlanCode)}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirecionando...
                      </>
                    ) : isCurrent ? (
                      'Plano ativo'
                    ) : (
                      `Assinar ${plan.name}`
                    )}
                  </Button>

                  {/* Feature list */}
                  <ul className="space-y-2 pt-2 border-t border-slate-100">
                    {meta.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-600 pt-2 first:pt-0">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Trust note */}
      <p className="text-center text-xs text-slate-400">
        Pagamento seguro via Stripe · Cancele a qualquer momento sem burocracia
      </p>
    </div>
  )
}
