import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, Loader2, ShieldCheck, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ─── Shared background layout ─────────────────────────────────────────────────

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">

      {/* Back to landing */}
      <Link
        to="/landing"
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </Link>

      {/* Dot grid — same pattern used in FeatureRoute & paywall pages */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient glow — top right */}
      <div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'hsl(var(--primary) / 0.12)' }}
      />

      {/* Ambient glow — bottom left */}
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'hsl(var(--primary) / 0.07)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [mfaCode, setMfaCode] = useState('')
  const { login, register, verifyMfa, isLoading, requiresMfa } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        if (!useAuthStore.getState().requiresMfa) navigate('/')
      } else {
        await register(form.name, form.email, form.password)
        navigate('/')
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Ocorreu um erro. Tente novamente.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await verifyMfa(mfaCode)
      navigate('/')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Código inválido. Tente novamente.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
      setMfaCode('')
    }
  }

  // ── MFA step ────────────────────────────────────────────────────────────────
  if (requiresMfa) {
    return (
      <AuthShell>
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4"
            style={{ boxShadow: '0 8px 32px hsl(var(--primary) / 0.35)' }}
          >
            <TrendingUp className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">DominaHub</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Verificação em dois fatores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(var(--primary) / 0.12)' }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Autenticação em dois fatores</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Digite o código de 6 dígitos do seu autenticador</p>
            </div>
          </div>

          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">Código TOTP</Label>
              <Input
                id="mfa-code"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-lg tracking-widest font-mono"
                required
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isLoading || mfaCode.length !== 6}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verificar
            </Button>
          </form>
        </div>

        <Footer />
      </AuthShell>
    )
  }

  // ── Login / Register ─────────────────────────────────────────────────────────
  return (
    <AuthShell>
      {/* Logo */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-5"
          style={{ boxShadow: '0 8px 32px hsl(var(--primary) / 0.35)' }}
        >
          <TrendingUp className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">DominaHub</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Controle suas finanças com clareza</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm p-8">

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-white/[0.05] p-1 mb-6 gap-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                mode === m
                  ? 'bg-white dark:bg-white/[0.10] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>
      </div>

      <Footer />
    </AuthShell>
  )
}

function Footer() {
  return (
    <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      Seus dados são seguros e criptografados
    </div>
  )
}
