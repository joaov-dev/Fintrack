import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
        // If MFA is required, stay on page — requiresMfa state handles the UI
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-violet-200">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">DominaHub</h1>
            <p className="text-slate-500 text-sm mt-1">Verificação em dois fatores</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Autenticação em dois fatores</p>
                <p className="text-xs text-slate-500">Digite o código de 6 dígitos do seu aplicativo autenticador</p>
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
        </div>
      </div>
    )
  }

  // ── Login / Register step ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-violet-200">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">DominaHub</h1>
          <p className="text-slate-500 text-sm mt-1">Controle suas finanças com clareza</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

        <p className="text-center text-xs text-slate-400 mt-6">
          Seus dados são seguros e criptografados
        </p>
      </div>
    </div>
  )
}
