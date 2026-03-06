import { useState } from 'react'
import { Loader2, AlertTriangle, ShieldCheck, KeyRound, User } from 'lucide-react'
import adminApi from '../services/adminApi'
import { useAdminAuthStore } from '../store/adminAuth.store'

export default function AdminSettingsPage() {
  const { admin } = useAdminAuthStore()

  const [form, setForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.currentPassword) { setError('Senha atual é obrigatória'); return }
    if (!form.newUsername && !form.newPassword) { setError('Informe um novo usuário ou nova senha'); return }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('Nova senha e confirmação não conferem'); return
    }

    setLoading(true)
    try {
      await adminApi.post('/auth/change-credentials', {
        currentPassword: form.currentPassword,
        ...(form.newUsername ? { newUsername: form.newUsername } : {}),
        ...(form.newPassword ? { newPassword: form.newPassword, confirmPassword: form.confirmPassword } : {}),
      })
      window.location.href = '/admin/login'
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao alterar credenciais')
    } finally {
      setLoading(false)
    }
  }

  const initials = admin?.username ? admin.username.slice(0, 2).toUpperCase() : 'AD'

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <ShieldCheck className="w-4.5 h-4.5 text-violet-500" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-sm text-slate-400">Credenciais de acesso admin</p>
        </div>
      </div>

      {/* Current session card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Sessão atual</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-[13px] font-bold text-violet-600">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{admin?.username}</p>
            <p className="text-[11px] text-slate-400">{admin?.role?.replace('_', ' ')}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ativo
          </span>
        </div>
      </div>

      {/* Change credentials form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-[13px] font-semibold text-slate-700">Alterar credenciais</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 leading-relaxed">
              Alterar as credenciais irá <strong>invalidar todas as sessões admin ativas</strong> e você será redirecionado para o login.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <Field
              label="Senha atual"
              icon={<KeyRound className="w-3.5 h-3.5" />}
              required
            >
              <input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => set('currentPassword', e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </Field>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Novo (preencha o que deseja alterar)</p>

              {/* New username */}
              <div className="space-y-4">
                <Field label="Novo usuário" icon={<User className="w-3.5 h-3.5" />}>
                  <input
                    type="text"
                    autoComplete="username"
                    value={form.newUsername}
                    onChange={(e) => set('newUsername', e.target.value)}
                    placeholder={admin?.username}
                    className="input"
                  />
                </Field>

                {/* New password */}
                <Field label="Nova senha" icon={<KeyRound className="w-3.5 h-3.5" />}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={(e) => set('newPassword', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="input"
                  />
                </Field>

                {form.newPassword && (
                  <Field label="Confirmar senha" icon={<KeyRound className="w-3.5 h-3.5" />}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => set('confirmPassword', e.target.value)}
                      placeholder="Repita a nova senha"
                      className="input"
                    />
                  </Field>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <p className="text-[12px] text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar e encerrar sessões'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────

function Field({ label, icon, children, required }: {
  label: string; icon: React.ReactNode; children: React.ReactNode; required?: boolean
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <style>{`.input{width:100%;background:rgb(248 250 252);border:1px solid rgb(226 232 240);color:rgb(15 23 42);border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;outline:none;transition:all 0.15s;}.input:focus{border-color:rgb(139 92 246 / 0.6);box-shadow:0 0 0 3px rgb(139 92 246 / 0.12);}.input::placeholder{color:rgb(148 163 184);}`}</style>
      {children}
    </div>
  )
}
