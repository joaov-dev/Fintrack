import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Ban, CheckCircle, LogOut, Download, User } from 'lucide-react'
import adminApi from '../services/adminApi'

type Tab = 'overview' | 'billing' | 'usage' | 'audit'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'billing',  label: 'Billing' },
  { id: 'usage',    label: 'Uso' },
  { id: 'audit',    label: 'Auditoria' },
]

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    BUSINESS: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    PRO:      'bg-violet-500/10 text-violet-600 border-violet-500/20',
    FREE:     'bg-slate-100 text-slate-500 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[plan] ?? styles.FREE}`}>
      {plan}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0 gap-4">
      <dt className="text-[12px] font-medium text-slate-400 shrink-0 w-40">{label}</dt>
      <dd className="text-[13px] font-medium text-slate-800 text-right break-all">{value}</dd>
    </div>
  )
}

function UsageCard({ label, value }: { label: string; value: number }) {
  const icons: Record<string, string> = {
    transactions: '💸', accounts: '🏦', categories: '🏷️', budgets: '📊', goals: '🎯',
  }
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <p className="text-xl mb-1">{icons[label] ?? '📦'}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] font-medium text-slate-400 capitalize mt-0.5">{label}</p>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDetail() {
    setLoading(true); setError('')
    try {
      const { data } = await adminApi.get(`/users/${id}`)
      setDetail(data)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao carregar usuário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDetail() }, [id])

  async function doAction(action: 'suspend' | 'reactivate' | 'force-logout') {
    const labels = { suspend: 'suspender', reactivate: 'reativar', 'force-logout': 'forçar logout' }
    if (!confirm(`Deseja ${labels[action]} este usuário?`)) return
    try {
      await adminApi.post(`/users/${id}/${action}`)
      loadDetail()
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro')
    }
  }

  async function doExport() {
    try {
      const { data } = await adminApi.get(`/users/${id}/export`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `user-export-${id}.json`; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao exportar')
    }
  }

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-6 w-32 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-100 rounded-2xl" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  )
  if (error) return <div className="text-rose-500 text-sm">{error}</div>
  if (!detail) return null

  const { profile, subscription, usage, auditLog } = detail
  const isSuspended = profile.status === 'SUSPENDED'

  const hue = (profile.name.charCodeAt(0) * 37) % 360

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para usuários
      </button>

      {/* Hero header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: `hsl(${hue}, 55%, 48%)` }}
          >
            {profile.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-slate-900">{profile.name}</h1>
              <PlanBadge plan={profile.currentPlan} />
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isSuspended
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                {isSuspended ? 'Suspenso' : 'Ativo'}
              </span>
            </div>
            <p className="text-sm text-slate-400">{profile.email}</p>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">{profile.id}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            {isSuspended ? (
              <ActionButton onClick={() => doAction('reactivate')} variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />}>
                Reativar
              </ActionButton>
            ) : (
              <ActionButton onClick={() => doAction('suspend')} variant="danger" icon={<Ban className="w-3.5 h-3.5" />}>
                Suspender
              </ActionButton>
            )}
            <ActionButton onClick={() => doAction('force-logout')} variant="warn" icon={<LogOut className="w-3.5 h-3.5" />}>
              Logout
            </ActionButton>
            <ActionButton onClick={doExport} variant="default" icon={<Download className="w-3.5 h-3.5" />}>
              Exportar
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-white border border-slate-100 rounded-xl p-1 shadow-sm w-fit">
        {TABS.map(({ id: tid, label }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
              tab === tid
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">

        {/* Overview */}
        {tab === 'overview' && (
          <dl>
            <InfoRow label="ID"              value={<span className="font-mono text-[11px]">{profile.id}</span>} />
            <InfoRow label="Nome"            value={profile.name} />
            <InfoRow label="Email"           value={profile.email} />
            <InfoRow label="Plano"           value={<PlanBadge plan={profile.currentPlan} />} />
            <InfoRow label="Status assinatura" value={profile.subscriptionStatus ?? '—'} />
            <InfoRow label="MFA"             value={
              <span className={`text-[12px] font-semibold ${profile.mfaEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {profile.mfaEnabled ? '✓ Ativado' : 'Desativado'}
              </span>
            } />
            <InfoRow label="Moeda"           value={profile.currency} />
            <InfoRow label="Timezone"        value={profile.timezone} />
            <InfoRow label="Cadastro"        value={new Date(profile.createdAt).toLocaleString('pt-BR')} />
            <InfoRow label="Último login"    value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('pt-BR') : '—'} />
          </dl>
        )}

        {/* Billing */}
        {tab === 'billing' && (
          subscription ? (
            <div className="space-y-5">
              <dl>
                <InfoRow label="Plano"        value={subscription.plan?.name ?? '—'} />
                <InfoRow label="Status"       value={
                  <span className={`text-[12px] font-semibold ${
                    subscription.status === 'ACTIVE' ? 'text-emerald-600' :
                    subscription.status === 'TRIALING' ? 'text-violet-600' :
                    'text-rose-600'
                  }`}>{subscription.status}</span>
                } />
                <InfoRow label="Ciclo"        value={subscription.price?.billingCycle ?? '—'} />
                <InfoRow label="Valor"        value={
                  subscription.price
                    ? `R$ ${(subscription.price.amountCents / 100).toFixed(2)}`
                    : '—'
                } />
                <InfoRow label="Início período" value={subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString('pt-BR') : '—'} />
                <InfoRow label="Fim período"  value={subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR') : '—'} />
                <InfoRow label="Cancelar no fim" value={subscription.cancelAtPeriodEnd ? 'Sim' : 'Não'} />
              </dl>

              {subscription.events?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Histórico de eventos</p>
                  <div className="space-y-1.5">
                    {subscription.events.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-mono text-[11px] text-slate-600">{e.eventType}</span>
                        <span className="text-[11px] text-slate-400">{new Date(e.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <User className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Sem assinatura registrada</p>
            </div>
          )
        )}

        {/* Usage */}
        {tab === 'usage' && usage && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(usage).map(([k, v]) => (
              <UsageCard key={k} label={k} value={Number(v)} />
            ))}
          </div>
        )}

        {/* Audit */}
        {tab === 'audit' && (
          auditLog.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <p className="text-sm">Sem registros de auditoria</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {auditLog.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[12px] font-semibold text-slate-700">{log.action}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      por <span className="font-medium text-slate-500">{log.admin?.username ?? '—'}</span>
                      {log.ip && <> · <span className="font-mono">{log.ip}</span></>}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ActionButton({
  children, onClick, variant, icon,
}: {
  children: React.ReactNode
  onClick: () => void
  variant: 'danger' | 'success' | 'warn' | 'default'
  icon: React.ReactNode
}) {
  const styles = {
    danger:  'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200',
    success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200',
    warn:    'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200',
    default: 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200',
  }
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  )
}
