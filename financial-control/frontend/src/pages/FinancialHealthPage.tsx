import { Loader2, HeartPulse } from 'lucide-react'
import { useFinancialHealth } from '@/hooks/useFinancialHealth'
import { useInsights } from '@/hooks/useInsights'
import { FinancialHealthData, FinancialHealthPillar } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertChip } from '@/components/dashboard/InsightsPanel'

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function gaugeColor(score: number): string {
  if (score < 40) return '#f43f5e'  // rose-500
  if (score < 60) return '#f59e0b'  // amber-500
  if (score < 80) return '#10b981'  // emerald-500
  return '#8b5cf6'                  // violet-500
}

function classificationStyle(classification: string): string {
  switch (classification) {
    case 'Excelente': return 'text-violet-700 bg-violet-100'
    case 'Saudável':  return 'text-emerald-700 bg-emerald-100'
    case 'Atenção':   return 'text-amber-700 bg-amber-100'
    default:          return 'text-rose-700 bg-rose-100'
  }
}

function ScoreGauge({ score }: { score: number }) {
  const cx = 100, cy = 100, r = 72
  const circumference = Math.PI * r
  const filled = circumference * (score / 100)
  const color = gaugeColor(score)

  return (
    <svg viewBox="0 0 200 115" className="w-60 mx-auto">
      {/* Track */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Score number */}
      <text x="100" y="92" textAnchor="middle" fontSize="38" fontWeight="700" fill="#0f172a">
        {score}
      </text>
      <text x="100" y="110" textAnchor="middle" fontSize="11" fill="#94a3b8">
        / 100
      </text>
    </svg>
  )
}

// ─── Pillar helpers ───────────────────────────────────────────────────────────

function pillarScoreStyle(score: number) {
  if (score >= 75) return { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' }
  if (score >= 50) return { badge: 'bg-amber-100 text-amber-700',   bar: 'bg-amber-500' }
  if (score >= 25) return { badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' }
  return              { badge: 'bg-rose-100 text-rose-700',         bar: 'bg-rose-500' }
}

interface PillarCardProps {
  title: string
  weight: string
  pillar: FinancialHealthPillar
  valueLabel: string
  valueDescription: string
  goal: string
}

function PillarCard({ title, weight, pillar, valueLabel, valueDescription, goal }: PillarCardProps) {
  const style = pillarScoreStyle(pillar.score)

  return (
    <Card className="border-slate-200">
      <CardContent className="pt-5 pb-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{title}</p>
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap mt-0.5">{weight}</span>
        </div>

        {/* Raw value */}
        <div>
          <p className="text-2xl font-bold text-slate-900">{valueLabel}</p>
          <p className="text-xs text-slate-500 mt-0.5">{valueDescription}</p>
        </div>

        {/* Score bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Pontuação</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>
              {pillar.score}/100
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
              style={{ width: `${pillar.score}%` }}
            />
          </div>
        </div>

        {/* Goal hint */}
        <p className="text-[11px] text-slate-400">{goal}</p>
      </CardContent>
    </Card>
  )
}

// ─── Summary sentence ─────────────────────────────────────────────────────────

function getSummary(data: FinancialHealthData): string {
  if (data.score >= 80) return 'Excelentes hábitos financeiros! Continue mantendo a disciplina.'

  const entries = [
    { key: 'savingsRate',      score: data.pillars.savingsRate.score },
    { key: 'incomeCommitment', score: data.pillars.incomeCommitment.score },
    { key: 'creditDependency', score: data.pillars.creditDependency.score },
    { key: 'emergencyReserve', score: data.pillars.emergencyReserve.score },
  ]
  const weakest = entries.reduce((min, p) => p.score < min.score ? p : min)

  const tips: Record<string, string> = {
    savingsRate:      'Tente aumentar sua taxa de poupança reduzindo gastos não essenciais.',
    incomeCommitment: 'Seus gastos fixos estão altos. Revise assinaturas e contratos recorrentes.',
    creditDependency: 'Suas dívidas estão elevadas. Priorize quitar os passivos para ganhar fôlego financeiro.',
    emergencyReserve: 'Reforce sua reserva de emergência — tente acumular ao menos 3 meses de despesas em contas líquidas.',
  }

  return tips[weakest.key] ?? 'Continue monitorando suas finanças regularmente.'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialHealthPage() {
  const { data, isLoading } = useFinancialHealth()
  const { data: insightsData } = useInsights()

  const alerts = insightsData?.alerts
  const hasAlerts = alerts && (alerts.overdueLiabilities > 0 || alerts.negativeBalanceProjection)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saúde Financeira</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Score baseado nos últimos 3 meses de transações e patrimônio atual
        </p>
      </div>

      {/* Active alerts relevant to financial health */}
      {hasAlerts && (
        <div className="flex flex-wrap gap-2">
          {alerts.overdueLiabilities > 0 && (
            <AlertChip type="overdue" count={alerts.overdueLiabilities} />
          )}
          {alerts.negativeBalanceProjection && <AlertChip type="projection" />}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data && !data.hasEnoughData ? (
        /* ── Empty state ── */
        <Card className="border-dashed border-slate-200">
          <CardContent className="py-14 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <HeartPulse className="w-7 h-7 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-700 font-semibold">Ainda sem dados suficientes</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Adicione transações de receita e despesa, configure o saldo das suas contas ou
                cadastre passivos para que seu score seja calculado com precisão.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {['Transações de renda', 'Saldo em contas', 'Passivos e dívidas'].map((item) => (
                <span key={item} className="text-xs px-2.5 py-1 bg-slate-100 rounded-full text-slate-500">
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Score card */}
          <Card className="border-slate-200">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center gap-3">
                <ScoreGauge score={data.score} />
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${classificationStyle(data.classification)}`}
                >
                  {data.classification}
                </span>
                <p className="text-sm text-slate-600 text-center max-w-md">
                  {getSummary(data)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pillar cards */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3">Pilares da Pontuação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PillarCard
                title="Taxa de Poupança"
                weight="30%"
                pillar={data.pillars.savingsRate}
                valueLabel={`${(data.pillars.savingsRate.value * 100).toFixed(1)}%`}
                valueDescription="da renda economizada (últ. 3 meses)"
                goal="Meta: ≥ 20% da renda"
              />
              <PillarCard
                title="Comprometimento da Renda"
                weight="30%"
                pillar={data.pillars.incomeCommitment}
                valueLabel={`${(data.pillars.incomeCommitment.value * 100).toFixed(1)}%`}
                valueDescription="da renda em gastos fixos recorrentes"
                goal="Meta: ≤ 20% da renda"
              />
              <PillarCard
                title="Dependência de Crédito"
                weight="20%"
                pillar={data.pillars.creditDependency}
                valueLabel={`${data.pillars.creditDependency.value.toFixed(2)}x`}
                valueDescription="de passivos vs. 6 meses de renda"
                goal="Meta: ≤ 0.25× a renda semestral"
              />
              <PillarCard
                title="Reserva de Emergência"
                weight="20%"
                pillar={data.pillars.emergencyReserve}
                valueLabel={`${data.pillars.emergencyReserve.value.toFixed(1)} meses`}
                valueDescription="de despesas cobertas por contas líquidas"
                goal="Meta: ≥ 6 meses de despesas"
              />
            </div>
          </div>

          {/* Methodology note */}
          <Card className="border-slate-100 bg-slate-50">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Como o score é calculado
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li><span className="font-medium text-slate-600">Taxa de Poupança (30%)</span> — (Receita − Despesa) ÷ Receita nos últimos 3 meses</li>
                <li><span className="font-medium text-slate-600">Comprometimento da Renda (30%)</span> — Gastos fixos recorrentes ÷ Receita nos últimos 3 meses</li>
                <li><span className="font-medium text-slate-600">Dependência de Crédito (20%)</span> — Passivos totais ÷ (Renda mensal × 6)</li>
                <li><span className="font-medium text-slate-600">Reserva de Emergência (20%)</span> — Saldo de contas líquidas ÷ Despesa mensal média</li>
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
