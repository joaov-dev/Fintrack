import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Eye, Ban, CheckCircle, LogOut, Users } from 'lucide-react'
import { useAdminUsers } from '../hooks/useAdminUsers'
import adminApi from '../services/adminApi'

const PLAN_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  { value: 'FREE',     label: 'Free' },
  { value: 'PRO',      label: 'Pro' },
  { value: 'BUSINESS', label: 'Business' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE',    label: 'Ativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
]

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    BUSINESS: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
    PRO:      'bg-violet-500/10 text-violet-600 border border-violet-500/20',
    FREE:     'bg-slate-100 text-slate-500 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[plan] ?? styles.FREE}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return status === 'SUSPENDED' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Suspenso
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Ativo
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name.charCodeAt(0) * 37) % 360
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: `hsl(${hue}, 55%, 48%)` }}
    >
      {initials}
    </div>
  )
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  const handleSearch = useCallback((val: string) => {
    setQ(val)
    clearTimeout((handleSearch as any)._t)
    ;(handleSearch as any)._t = setTimeout(() => {
      setDebouncedQ(val)
      setPage(1)
    }, 300)
  }, [])

  const { data, meta, loading, error, refetch } = useAdminUsers({
    q: debouncedQ, plan, status, page, limit,
  })

  async function doAction(action: 'suspend' | 'reactivate' | 'force-logout', userId: string) {
    const labels = { suspend: 'suspender', reactivate: 'reativar', 'force-logout': 'forçar logout' }
    if (!confirm(`Deseja ${labels[action]} este usuário?`)) return
    try {
      await adminApi.post(`/users/${userId}/${action}`)
      refetch()
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao executar ação')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Users className="w-4.5 h-4.5 text-violet-500" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Usuários</h1>
          <p className="text-sm text-slate-400">Gestão de contas e acessos</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou ID..."
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 shadow-sm transition-all placeholder-slate-400"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1) }}
          className="px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 shadow-sm text-slate-600 cursor-pointer"
        >
          {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 shadow-sm text-slate-600 cursor-pointer"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        {loading && (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-slate-100 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-32" />
                  <div className="h-2.5 bg-slate-100 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="px-5 py-8 text-center text-rose-500 text-sm">{error}</div>}

        {!loading && !error && (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Plano</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cadastro</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Último login</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><PlanBadge plan={u.currentPlan} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR') : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionBtn title="Ver detalhes" onClick={() => navigate(`/admin/users/${u.id}`)}>
                          <Eye className="w-3.5 h-3.5" />
                        </ActionBtn>
                        {u.status === 'ACTIVE' ? (
                          <ActionBtn title="Suspender" onClick={() => doAction('suspend', u.id)} danger>
                            <Ban className="w-3.5 h-3.5" />
                          </ActionBtn>
                        ) : (
                          <ActionBtn title="Reativar" onClick={() => doAction('reactivate', u.id)} success>
                            <CheckCircle className="w-3.5 h-3.5" />
                          </ActionBtn>
                        )}
                        <ActionBtn title="Forçar logout" onClick={() => doAction('force-logout', u.id)} warn>
                          <LogOut className="w-3.5 h-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-50">
              <p className="text-[12px] text-slate-400">
                <span className="font-semibold text-slate-600">{meta.total}</span> usuário{meta.total !== 1 ? 's' : ''}
                <span className="mx-1.5 text-slate-300">·</span>
                página <span className="font-semibold text-slate-600">{meta.page}</span> de {meta.totalPages || 1}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Action button ─────────────────────────────────────────────────────────

function ActionBtn({
  children, title, onClick, danger, success, warn,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
  success?: boolean
  warn?: boolean
}) {
  const cls = danger
    ? 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
    : success
    ? 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
    : warn
    ? 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
    : 'hover:bg-slate-100 hover:text-slate-700 hover:border-slate-200'

  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg border border-transparent text-slate-400 transition-all ${cls}`}
    >
      {children}
    </button>
  )
}
