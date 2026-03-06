import { useState } from 'react'
import { Users, TrendingUp, DollarSign, Activity, UserCheck, UserX, ArrowUpRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAdminStats } from '../hooks/useAdminStats'

const PERIOD_OPTIONS = [7, 30, 90] as const

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatMrr(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: 'violet' | 'emerald' | 'sky' | 'amber' | 'rose' | 'indigo'
  sub?: string
}

const colorMap: Record<StatCardProps['color'], { bg: string; icon: string; dot: string }> = {
  violet: { bg: 'bg-violet-500/10', icon: 'text-violet-500', dot: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', dot: 'bg-emerald-500' },
  sky:    { bg: 'bg-sky-500/10',    icon: 'text-sky-500',    dot: 'bg-sky-500' },
  amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-500',  dot: 'bg-amber-500' },
  rose:   { bg: 'bg-rose-500/10',   icon: 'text-rose-500',   dot: 'bg-rose-500' },
  indigo: { bg: 'bg-indigo-500/10', icon: 'text-indigo-500', dot: 'bg-indigo-500' },
}

function StatCard({ label, value, icon: Icon, color, sub }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${c.icon}`} style={{ width: '18px', height: '18px' }} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold text-white">
          {p.value}
          <span className="text-slate-400 font-normal text-xs ml-1">{p.name}</span>
        </p>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50">
        <h2 className="text-[13px] font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const { data, loading, error } = useAdminStats(days)

  if (loading) return <PageSkeleton />
  if (error)   return <ErrorState message={error} />
  if (!data)   return null

  const { totals, timeseries, planDistribution, recentSignups, recentSubEvents } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Visão geral do produto</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {PERIOD_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3.5 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                days === d
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Usuários"   value={totals.users}             icon={Users}     color="violet" />
        <StatCard label="Ativos"           value={totals.activeUsers}        icon={UserCheck}  color="emerald" />
        <StatCard label="MAU (30d)"        value={totals.mauUsers}           icon={Activity}   color="sky" />
        <StatCard label="MRR"             value={formatMrr(totals.mrrCents)} icon={DollarSign} color="amber" />
        <StatCard label="Assinantes PRO"  value={totals.proSubscribers}      icon={TrendingUp} color="indigo" />
        <StatCard label="Business"        value={totals.businessSubscribers} icon={TrendingUp} color="sky" />
        <StatCard
          label="Conversão"
          value={`${totals.conversionFreeToPaid.toFixed(1)}%`}
          icon={TrendingUp}
          color="emerald"
          sub="Free → Pago no período"
        />
        <StatCard label="Churn"           value={totals.churnThisPeriod}     icon={UserX}      color="rose" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Novos usuários">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeseries.newUsers} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="usuários"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#gradViolet)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Distribuição por plano">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={planDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="plan" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="count"
                name="usuários"
                radius={[6, 6, 0, 0]}
                fill="#7c3aed"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent signups */}
        <Card title="Últimos cadastros">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Plano</th>
                <th className="text-right pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentSignups.map((u) => (
                <tr key={u.id} className="group">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <PlanBadge plan={u.currentPlan} />
                  </td>
                  <td className="py-2.5 text-right text-[11px] text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Subscription events */}
        <Card title="Eventos de assinatura">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Evento</th>
                <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="text-right pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentSubEvents.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5 font-mono text-[11px] text-slate-600 max-w-[160px] truncate pr-2">{e.eventType}</td>
                  <td className="py-2.5 text-[11px] text-slate-400 truncate">{e.userEmail ?? '—'}</td>
                  <td className="py-2.5 text-right text-[11px] text-slate-400">
                    {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {recentSubEvents.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-sm text-slate-400">Nenhum evento no período</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    BUSINESS: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    PRO:      'bg-violet-500/10 text-violet-600 border-violet-500/20',
    FREE:     'bg-slate-100 text-slate-500 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[plan] ?? styles.FREE}`}>
      {plan}
    </span>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-rose-500 text-lg">!</span>
        </div>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  )
}
