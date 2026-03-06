import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAdminAuthStore } from '../store/adminAuth.store'

export default function AdminLoginPage() {
  const { admin, login } = useAdminAuthStore()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex,nofollow'
  }, [])

  useEffect(() => {
    if (admin) navigate('/admin', { replace: true })
  }, [admin, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 60% 0%, #1e1333 0%, #0a0b0f 60%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo / brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/40 mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-xl font-semibold tracking-tight">DominaHub Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Acesso restrito · Painel interno</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 border border-white/[0.07]"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 tracking-wide uppercase">
                Usuário
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 tracking-wide uppercase">
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Verificando...' : 'Entrar no painel'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          Acesso monitorado e auditado
        </p>
      </div>
    </div>
  )
}
