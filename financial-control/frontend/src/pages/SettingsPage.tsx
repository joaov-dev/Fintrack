import { useState, useRef, useEffect } from 'react'
import { Camera, KeyRound, Trash2, ShieldAlert, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB

// ─── Avatar section ───────────────────────────────────────────────────────────

function AvatarSection() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(user?.avatar ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setPreview(user?.avatar ?? null) }, [user?.avatar])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'Imagem muito grande (máx. 2 MB)', variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', { name: user!.name, avatar: preview })
      setUser(data)
      toast({ title: 'Foto atualizada' })
    } catch {
      toast({ title: 'Erro ao salvar foto', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setPreview(null)
    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', { name: user!.name, avatar: null })
      setUser(data)
      toast({ title: 'Foto removida' })
    } catch {
      toast({ title: 'Erro ao remover foto', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?'
  const isDirty = preview !== (user?.avatar ?? null)

  return (
    <div className="flex items-center gap-6">
      {/* Avatar circle */}
      <div className="relative shrink-0">
        <div className="w-20 h-20 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border-2 border-slate-200">
          {preview ? (
            <img src={preview} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary">{initial}</span>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <Camera className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Actions */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-900">{user?.name}</p>
        <p className="text-xs text-slate-400">{user?.email}</p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Alterar foto
          </Button>
          {preview && (
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={handleRemove} disabled={saving}>
              Remover
            </Button>
          )}
          {isDirty && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          )}
        </div>
        <p className="text-[11px] text-slate-400">JPG, PNG ou GIF — máx. 2 MB</p>
      </div>
    </div>
  )
}

// ─── Name section ─────────────────────────────────────────────────────────────

function NameSection() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(user?.name ?? '') }, [user?.name])

  const isDirty = name.trim() !== user?.name

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDirty || name.trim().length < 2) return
    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', { name: name.trim(), avatar: user?.avatar })
      setUser(data)
      toast({ title: 'Nome atualizado' })
    } catch {
      toast({ title: 'Erro ao atualizar nome', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="settings-name">Nome</Label>
        <div className="flex gap-2">
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="max-w-sm"
          />
          <Button type="submit" disabled={!isDirty || saving || name.trim().length < 2}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="settings-email">Email</Label>
        <Input id="settings-email" value={user?.email ?? ''} disabled className="max-w-sm bg-slate-50 text-slate-400" />
        <p className="text-[11px] text-slate-400">O email não pode ser alterado.</p>
      </div>
    </form>
  )
}

// ─── Change password section ──────────────────────────────────────────────────

function PasswordSection() {
  const { toast } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm
  const valid = current.length > 0 && next.length >= 6 && next === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await api.put('/auth/change-password', { currentPassword: current, newPassword: next })
      toast({ title: 'Senha alterada com sucesso' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao alterar senha'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="pw-current">Senha atual</Label>
        <Input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-new">Nova senha</Label>
        <Input id="pw-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        {next.length > 0 && next.length < 6 && (
          <p className="text-[11px] text-rose-500">Mínimo de 6 caracteres</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-confirm">Confirmar nova senha</Label>
        <Input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
          className={mismatch ? 'border-rose-400 focus-visible:ring-rose-400' : ''} />
        {mismatch && <p className="text-[11px] text-rose-500">As senhas não coincidem</p>}
      </div>
      <Button type="submit" disabled={!valid || saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar senha'}
      </Button>
    </form>
  )
}

// ─── Danger zone — clear all data ────────────────────────────────────────────

const CONFIRM_WORD = 'CONFIRMAR'

function DangerZone() {
  const { toast } = useToast()
  const { logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    if (typed !== CONFIRM_WORD) return
    setLoading(true)
    try {
      await api.delete('/auth/data')
      toast({ title: 'Dados limpos com sucesso. Faça login novamente.' })
      setOpen(false)
      // Force re-login so stale state is cleared
      setTimeout(() => logout(), 1500)
    } catch {
      toast({ title: 'Erro ao limpar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Limpar todos os dados</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            Remove permanentemente todas as transações, contas, metas, passivos, orçamentos e investimentos.
            As categorias padrão serão recriadas. Esta ação <span className="font-semibold text-rose-600">não pode ser desfeita</span>.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 shrink-0"
          onClick={() => { setTyped(''); setOpen(true) }}
        >
          <Trash2 className="w-4 h-4" />
          Limpar dados
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              Confirmar limpeza de dados
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-rose-700">O seguinte será apagado permanentemente:</p>
              <ul className="text-xs text-rose-600 space-y-0.5 list-disc list-inside">
                <li>Todas as transações</li>
                <li>Todas as contas e saldos</li>
                <li>Todos os orçamentos</li>
                <li>Todos os investimentos e posições</li>
                <li>Todos os passivos e dívidas</li>
                <li>Todas as metas financeiras</li>
                <li>Todas as categorias personalizadas</li>
              </ul>
              <p className="text-xs text-rose-500 pt-1">As categorias padrão serão recriadas automaticamente.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="danger-confirm">
                Digite <span className="font-bold font-mono">{CONFIRM_WORD}</span> para confirmar
              </Label>
              <Input
                id="danger-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value.toUpperCase())}
                placeholder={CONFIRM_WORD}
                className={typed === CONFIRM_WORD ? 'border-rose-400' : ''}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                disabled={typed !== CONFIRM_WORD || loading}
                onClick={handleClear}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apagar tudo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gerencie seu perfil e preferências da conta</p>
      </div>

      {/* Profile photo */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700">Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <AvatarSection />
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <NameSection />
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-400" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <PasswordSection />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-rose-200 bg-rose-50/30">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-rose-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <DangerZone />
        </CardContent>
      </Card>
    </div>
  )
}
