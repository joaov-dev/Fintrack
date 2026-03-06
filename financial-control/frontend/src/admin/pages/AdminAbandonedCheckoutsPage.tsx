import { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight, Send, Users } from 'lucide-react'
import { useAbandonedCheckouts, CouponStatus } from '../hooks/useAbandonedCheckouts'
import adminApi from '../services/adminApi'

const PERIOD_OPTIONS = [7, 30, 90] as const

// ── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
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

function CouponStatusBadge({ status }: { status: CouponStatus }) {
  const config: Record<CouponStatus, { label: string; cls: string; dot: string }> = {
    NONE:     { label: 'Sem cupom',     cls: 'bg-slate-100 text-slate-500 border-slate-200',               dot: 'bg-slate-400' },
    PENDING:  { label: 'Cupom enviado', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20',          dot: 'bg-amber-500' },
    REDEEMED: { label: 'Resgatado',     cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',    dot: 'bg-emerald-500' },
    EXPIRED:  { label: 'Expirado',      cls: 'bg-slate-100 text-slate-400 border-slate-200',                dot: 'bg-slate-300' },
  }
  const { label, cls, dot } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAbandonedCheckoutsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [page, setPage] = useState(1)
  const limit = 25

  const { data, meta, loading, error, refetch } = useAbandonedCheckouts({ days, page, limit })

  const [sendingId, setSendingId] = useState<string | null>(null)
  const [bulkSending, setBulkSending] = useState(false)

  async function handleSendCoupon(userId: string) {
    if (!confirm('Enviar cupom de 10% de desconto para este usuário?')) return
    setSendingId(userId)
    try {
      await adminApi.post(`/abandoned-checkouts/${userId}/send-coupon`)
      refetch()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err?.response?.data?.error ?? 'Erro ao enviar cupom')
    } finally {
      setSendingId(null)
    }
  }

  async function handleBulkSend() {
    const eligible = data.filter((r) => r.couponStatus === 'NONE').length
    if (!confirm(`Enviar cupom de 10% para todos os ${eligible} usuários sem cupom?`)) return
    setBulkSending(true)
    try {
      const { data: res } = await adminApi.post('/abandoned-checkouts/send-coupon-bulk')
      alert(`Cupons enviados: ${res.sent} • Ignorados: ${res.skipped} • Erros: ${res.errors}`)
      refetch()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err?.response?.data?.error ?? 'Erro ao enviar cupons')
    } finally {
      setBulkSending(false)
    }
  }

  const eligibleCount = data.filter((r) => r.couponStatus === 'NONE').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <RefreshCw className="text-violet-500" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Recuperação</h1>
            <p className="text-sm text-slate-400">
              Checkouts abandonados · {meta.total} usuário{meta.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {PERIOD_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => { setDays(d); setPage(1) }}
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

          {/* Bulk send */}
          <button
            onClick={handleBulkSend}
            disabled={bulkSending || eligibleCount === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {bulkSending
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
            Enviar para todos ({eligibleCount})
          </button>
        </div>
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
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Plano tentado</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cupom</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row) => (
                  <tr key={row.userId} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.userName} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{row.userName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{row.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <PlanBadge plan={row.planCode} />
                        <span className="text-[10px] text-slate-400">{row.billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-500">
                      {new Date(row.attemptedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <CouponStatusBadge status={row.couponStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSendCoupon(row.userId)}
                          disabled={row.couponStatus !== 'NONE' || sendingId === row.userId}
                          title={row.couponStatus !== 'NONE' ? 'Cupom já foi enviado' : 'Enviar cupom de 10% off'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all bg-violet-50 hover:bg-violet-100 text-violet-600 border-violet-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {sendingId === row.userId
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Send className="w-3 h-3" />}
                          Enviar cupom
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Nenhum checkout abandonado no período</p>
                      </div>
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
