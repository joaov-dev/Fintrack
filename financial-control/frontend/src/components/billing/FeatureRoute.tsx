import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Lock, Loader2, ArrowRight, Check,
  Repeat2, Target, AlertCircle, CreditCard,
  Wand2, Lightbulb, HeartPulse, CalendarClock,
  FileBarChart, BarChart3, PieChart, Download,
  Zap, Crown,
} from 'lucide-react'
import { useEntitlements } from '@/hooks/useBilling'
import type { FeatureKey } from '@/types'
import { cn } from '@/lib/utils'

// ─── Feature metadata ─────────────────────────────────────────────────────────
interface FeatureInfo {
  label: string
  description: string
  icon: LucideIcon
  requiredPlan: 'PRO' | 'BUSINESS'
  planLabel: string
  monthlyPrice: number
  highlights: [string, string, string]
}

const FEATURE_INFO: Partial<Record<FeatureKey, FeatureInfo>> = {
  RECURRING_TRANSACTIONS: {
    label: 'Transações Recorrentes',
    description:
      'Cadastre salários, aluguéis e despesas fixas uma vez. O sistema lança automaticamente a cada mês, sem retrabalho.',
    icon: Repeat2,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Lançamento automático a cada mês',
      'Previsão de fluxo de caixa futuro',
      'Sem retrabalho em despesas fixas',
    ],
  },
  GOALS: {
    label: 'Metas Financeiras',
    description:
      'Defina objetivos como viagem, reserva de emergência ou entrada de imóvel e acompanhe o progresso real, calculado a partir do saldo das suas contas.',
    icon: Target,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Progresso calculado automaticamente',
      'Vinculado ao saldo real das contas',
      'Múltiplas metas simultâneas',
    ],
  },
  LIABILITIES: {
    label: 'Passivos e Dívidas',
    description:
      'Controle empréstimos, financiamentos e dívidas com parcelas, juros e datas de vencimento — integrado ao patrimônio líquido.',
    icon: AlertCircle,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Parcelas, juros e datas de vencimento',
      'Calendário de compromissos futuros',
      'Impacto no patrimônio líquido',
    ],
  },
  CREDIT_CARDS: {
    label: 'Cartões de Crédito',
    description:
      'Gerencie múltiplos cartões, acompanhe a fatura e visualize gastos por cartão — integrados ao fluxo mensal.',
    icon: CreditCard,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Até 10 cartões de crédito',
      'Fatura e gastos por cartão',
      'Integrado ao fluxo mensal',
    ],
  },
  RULES_AUTOCATEGORIZATION: {
    label: 'Regras de Autocategorização',
    description:
      'Crie regras para categorizar transações automaticamente por palavras-chave ou valor. Economize tempo no lançamento manual.',
    icon: Wand2,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Regras por palavra-chave ou valor',
      'Categorização automática na importação',
      'Economize tempo no lançamento',
    ],
  },
  INSIGHTS: {
    label: 'Insights Automáticos',
    description:
      'Alertas contextuais quando um orçamento estoura, uma meta atrasa, um passivo vence ou quando surgem padrões incomuns nos gastos.',
    icon: Lightbulb,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Alertas quando o orçamento estoura',
      'Detecção de padrões de gasto',
      'Avisos sobre metas e vencimentos',
    ],
  },
  FINANCIAL_HEALTH: {
    label: 'Saúde Financeira',
    description:
      'Um score de 0 a 100 que resume sua taxa de poupança, endividamento, reserva de emergência e controle de orçamento em um único número claro.',
    icon: HeartPulse,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Score de 0 a 100 atualizado automaticamente',
      'Análise de poupança, dívidas e reserva',
      'Histórico de evolução do score',
    ],
  },
  FORECAST: {
    label: 'Previsão Mensal',
    description:
      'Projete o fechamento do mês antes de ele chegar, com base no histórico real e recorrências futuras. Saiba com antecedência se vai fechar no azul.',
    icon: CalendarClock,
    requiredPlan: 'PRO',
    planLabel: 'Pro',
    monthlyPrice: 19,
    highlights: [
      'Previsão do saldo ao fechar o mês',
      'Calendário financeiro detalhado',
      'Baseado em recorrências e histórico real',
    ],
  },
  REPORTS_ADVANCED: {
    label: 'Relatórios Avançados',
    description:
      'Análises comparativas entre períodos, top categorias de despesa, tendências de gastos e exportação em múltiplos formatos.',
    icon: FileBarChart,
    requiredPlan: 'BUSINESS',
    planLabel: 'Business',
    monthlyPrice: 49,
    highlights: [
      'Comparativos de período avançados',
      'Top categorias e tendências de gastos',
      'Exportação em CSV e outros formatos',
    ],
  },
  INVESTMENTS_ADVANCED: {
    label: 'Investimentos Avançados',
    description:
      'Registre ativos financeiros, acompanhe movimentações e visualize a evolução completa do portfólio ao longo do tempo.',
    icon: BarChart3,
    requiredPlan: 'BUSINESS',
    planLabel: 'Business',
    monthlyPrice: 49,
    highlights: [
      'Registro de ativos e movimentações',
      'Evolução do portfólio ao longo do tempo',
      'Integrado ao patrimônio líquido',
    ],
  },
  INVESTMENT_ALLOCATION: {
    label: 'Alocação de Portfólio',
    description:
      'Defina metas de alocação por classe de ativo, visualize o balanceamento atual e identifique quando rebalancear.',
    icon: PieChart,
    requiredPlan: 'BUSINESS',
    planLabel: 'Business',
    monthlyPrice: 49,
    highlights: [
      'Metas de alocação por classe de ativo',
      'Visualização do balanceamento atual',
      'Identificação de desvios do portfólio',
    ],
  },
  EXPORT_DATA: {
    label: 'Exportação de Dados',
    description:
      'Exporte transações, relatórios e dados financeiros em múltiplos formatos para análise externa ou backup completo.',
    icon: Download,
    requiredPlan: 'BUSINESS',
    planLabel: 'Business',
    monthlyPrice: 49,
    highlights: [
      'Exportação completa de transações',
      'Relatórios em CSV e PDF',
      'Backup total dos seus dados',
    ],
  },
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Plano Free',
  PRO: 'Plano Pro',
  BUSINESS: 'Plano Business',
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  feature: FeatureKey
  children: ReactNode
  title?: string
  description?: string
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FeatureRoute({ feature, children, title, description: descOverride }: Props) {
  const { data, isLoading } = useEntitlements()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  if (data.features[feature]?.enabled) {
    return <>{children}</>
  }

  const info = FEATURE_INFO[feature]
  const FeatureIcon = info?.icon ?? Lock
  const isPro = (info?.requiredPlan ?? 'PRO') === 'PRO'
  const PlanIcon = isPro ? Zap : Crown
  const planLabel = info?.planLabel ?? 'Pro'
  const monthlyPrice = info?.monthlyPrice ?? 19
  const featureLabel = title ?? info?.label ?? 'este recurso'
  const description = descOverride ?? info?.description ?? 'Este recurso está disponível em um plano pago.'
  const highlights = info?.highlights ?? [
    'Acesso completo ao recurso',
    'Sem limite de uso',
    'Suporte incluído',
  ]

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4 py-10 sm:py-16 overflow-hidden animate-fade-in">

      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-64 blur-3xl pointer-events-none rounded-full"
        style={{ background: 'hsl(var(--primary) / 0.07)' }}
      />

      <div className="relative w-full max-w-md mx-auto flex flex-col gap-6">

        {/* Current plan badge */}
        <div className="flex justify-center">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border',
              data.plan === 'FREE'
                ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                : 'border-primary/30 text-primary',
            )}
            style={data.plan !== 'FREE' ? { background: 'hsl(var(--primary) / 0.1)' } : {}}
          >
            {PLAN_LABELS[data.plan] ?? data.plan}
          </span>
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700/60">
              <FeatureIcon className="w-11 h-11 text-slate-400 dark:text-slate-500" />
            </div>
            {/* Lock badge */}
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        </div>

        {/* Title + description */}
        <div className="text-center space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight">
            {featureLabel}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Plan unlock card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(var(--primary) / 0.12)' }}
            >
              <PlanIcon className="w-4.5 h-4.5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Disponível no Plano {planLabel}
              </p>
              <p className="text-xs text-slate-400">
                A partir de R$ {monthlyPrice}/mês
              </p>
            </div>
            {isPro && (
              <span className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 px-2.5 py-1 rounded-full">
                7 dias grátis
              </span>
            )}
          </div>

          {/* Highlights */}
          <div className="px-5 py-4 space-y-3">
            {highlights.map((h) => (
              <div key={h} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'hsl(var(--primary) / 0.12)' }}
                >
                  <Check className="w-3 h-3" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/upgrade?plan=${info?.requiredPlan ?? 'PRO'}&cycle=MONTHLY`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            <PlanIcon className="w-4 h-4" />
            Assinar Plano {planLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/billing"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Minha assinatura
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          {isPro
            ? '7 dias grátis no Pro · Cancele quando quiser · Sem compromisso'
            : 'Cancele quando quiser · Sem cobrança de setup'}
        </p>
      </div>
    </div>
  )
}
