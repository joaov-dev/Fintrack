import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, Crown, Sparkles, ArrowRight, TrendingUp, Loader2 } from 'lucide-react'
import { useBillingPlans } from '@/hooks/useBilling'
import { BillingCycle } from '@/types'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

function fmt(cents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100)
}

const PLAN_META = {
  FREE: {
    icon: Sparkles,
    features: [
      'Dashboard básico',
      'Até 2 contas',
      'Até 50 transações/mês',
      'Categorias personalizadas',
      'Importação CSV',
    ],
  },
  PRO: {
    icon: Zap,
    popular: true,
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
    features: [
      'Tudo do Pro',
      'Investimentos avançados',
      'Alocação de portfólio',
      'Exportação de dados',
      'Suporte prioritário',
    ],
  },
} as const

// ─── Navbar ───────────────────────────────────────────────────────────────────
function PricingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-black text-lg tracking-tight text-foreground">DominaHub</span>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { plans, isLoading } = useBillingPlans()
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')

  return (
    <div className="min-h-screen bg-background">
      <PricingNav />

      <main className="pt-24 pb-20 px-5">
        <div className="max-w-5xl mx-auto space-y-12">

          {/* Header */}
          <div className="text-center space-y-4 pt-6">
            <span
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Planos e Preços
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight">
              O plano certo para cada momento
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Comece gratuitamente. Faça upgrade quando precisar de mais poder.
            </p>
          </div>

          {/* Cycle toggle */}
          <div className="flex justify-center">
            <div className="flex rounded-xl border border-border bg-card p-1 gap-1">
              <button
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-lg transition-all',
                  cycle === 'MONTHLY'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setCycle('MONTHLY')}
              >
                Mensal
              </button>
              <button
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
                  cycle === 'YEARLY'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setCycle('YEARLY')}
              >
                Anual
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    cycle === 'YEARLY'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  −30%
                </span>
              </button>
            </div>
          </div>

          {/* Plans */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const meta = PLAN_META[plan.code as keyof typeof PLAN_META] ?? PLAN_META.FREE
                const price = plan.prices.find((p) => p.billingCycle === cycle)
                const Icon = meta.icon
                const isPopular = 'popular' in meta && meta.popular

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg',
                      isPopular
                        ? 'border-primary shadow-md ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    {/* Popular accent bar */}
                    {isPopular && (
                      <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl bg-primary" />
                    )}

                    {/* Plan header */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: 'hsl(var(--primary) / 0.1)' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                        </div>
                        {isPopular && (
                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{
                              background: 'hsl(var(--primary) / 0.1)',
                              color: 'hsl(var(--primary))',
                            }}
                          >
                            Mais popular
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {price ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-foreground">
                            {fmt(price.amountCents, price.currency)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /{cycle === 'MONTHLY' ? 'mês' : 'ano'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-3xl font-black text-foreground">Grátis</span>
                      )}
                    </div>

                    {/* CTA */}
                    <Link
                      to={plan.code === 'FREE' ? '/login' : `/upgrade?plan=${plan.code}&cycle=${cycle}`}
                      className={cn(
                        'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all mb-6',
                        isPopular
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : 'border border-border text-foreground hover:bg-muted',
                      )}
                    >
                      {plan.code === 'FREE' ? 'Começar grátis' : `Assinar ${plan.name}`}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Features */}
                    <ul className="space-y-2.5">
                      {meta.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <Check
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            style={{ color: 'hsl(var(--primary))' }}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom note */}
          <p className="text-center text-sm text-muted-foreground">
            Todos os planos incluem suporte e atualizações.{' '}
            <Link
              to="/login"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
