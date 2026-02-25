import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import { Camera, KeyRound, Trash2, ShieldAlert, Loader2, Check, ShieldCheck, ShieldOff, Monitor, Smartphone, Globe, Trash, Settings, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api'
import { Session } from '@/types'
import { getApiErrorMessage } from '@/lib/apiError'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// ─── Inline Switch (no @radix-ui/react-switch installed) ──────────────────────

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
}

function Switch({ checked, onCheckedChange, id, disabled }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

// ─── Preferences option lists ─────────────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'BRL — Real Brasileiro' },
  { value: 'USD', label: 'USD — Dólar Americano' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — Libra Esterlina' },
  { value: 'JPY', label: 'JPY — Iene Japonês' },
  { value: 'ARS', label: 'ARS — Peso Argentino' },
]

const LOCALE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'es-ES', label: 'Español (España)' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY — 25/02/2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY — 02/25/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD — 2026-02-25' },
]

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo',   label: 'América/São Paulo (BRT −3)' },
  { value: 'America/New_York',    label: 'América/Nova York (ET)' },
  { value: 'America/Chicago',     label: 'América/Chicago (CT)' },
  { value: 'America/Denver',      label: 'América/Denver (MT)' },
  { value: 'America/Los_Angeles', label: 'América/Los Angeles (PT)' },
  { value: 'Europe/London',       label: 'Europa/Londres (GMT/BST)' },
  { value: 'Europe/Berlin',       label: 'Europa/Berlim (CET)' },
  { value: 'Europe/Madrid',       label: 'Europa/Madri (CET)' },
  { value: 'Asia/Tokyo',          label: 'Ásia/Tóquio (JST +9)' },
  { value: 'Asia/Shanghai',       label: 'Ásia/Xangai (CST +8)' },
  { value: 'UTC',                 label: 'UTC' },
]

// ─── Preferences section ──────────────────────────────────────────────────────

function PreferencesSection() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [currency,   setCurrency]   = useState(user?.currency   ?? 'BRL')
  const [locale,     setLocale]     = useState(user?.locale     ?? 'pt-BR')
  const [timezone,   setTimezone]   = useState(user?.timezone   ?? 'America/Sao_Paulo')
  const [dateFormat, setDateFormat] = useState(user?.dateFormat ?? 'DD/MM/YYYY')
  const [closingDay, setClosingDay] = useState(String(user?.closingDay ?? 1))

  useEffect(() => {
    setCurrency(user?.currency   ?? 'BRL')
    setLocale(user?.locale       ?? 'pt-BR')
    setTimezone(user?.timezone   ?? 'America/Sao_Paulo')
    setDateFormat(user?.dateFormat ?? 'DD/MM/YYYY')
    setClosingDay(String(user?.closingDay ?? 1))
  }, [user?.currency, user?.locale, user?.timezone, user?.dateFormat, user?.closingDay])

  const closingDayNum = parseInt(closingDay, 10)
  const closingDayValid = !isNaN(closingDayNum) && closingDayNum >= 1 && closingDayNum <= 31

  const isDirty =
    currency   !== (user?.currency   ?? 'BRL')               ||
    locale     !== (user?.locale     ?? 'pt-BR')             ||
    timezone   !== (user?.timezone   ?? 'America/Sao_Paulo') ||
    dateFormat !== (user?.dateFormat ?? 'DD/MM/YYYY')        ||
    closingDay !== String(user?.closingDay ?? 1)

  const handleSave = async () => {
    if (!isDirty || !closingDayValid) return
    setSaving(true)
    try {
      const { data } = await api.put('/auth/preferences', {
        currency,
        locale,
        timezone,
        dateFormat,
        closingDay: closingDayNum,
      })
      setUser(data)
      toast({ title: 'Preferências salvas' })
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao salvar preferências'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pref-currency">Moeda</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="pref-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pref-locale">Idioma de formatação</Label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger id="pref-locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pref-dateformat">Formato de data</Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger id="pref-dateformat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pref-timezone">Fuso horário</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="pref-timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pref-closingday">Dia de fechamento do mês financeiro</Label>
        <Input
          id="pref-closingday"
          type="number"
          min={1}
          max={31}
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          className="max-w-[120px]"
        />
        {!closingDayValid && closingDay !== '' && (
          <p className="text-[11px] text-rose-500">Valor deve ser entre 1 e 31</p>
        )}
        <p className="text-[11px] text-slate-400">
          Define quando o ciclo financeiro recomeça. Salvo para uso futuro nas consultas.
        </p>
      </div>

      <Button onClick={handleSave} disabled={!isDirty || !closingDayValid || saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar preferências'}
      </Button>
    </div>
  )
}

// ─── Notifications section ────────────────────────────────────────────────────

type NotifKey =
  | 'notifBudget' | 'notifGoals' | 'notifDue' | 'notifInsights'
  | 'emailBudget' | 'emailGoals' | 'emailDue' | 'emailInsights'

const NOTIF_ROWS: { key: 'Budget' | 'Goals' | 'Due' | 'Insights'; label: string; description: string }[] = [
  { key: 'Budget',   label: 'Alertas de orçamento',   description: 'Notifica quando os gastos atingem 80% do limite definido.' },
  { key: 'Goals',    label: 'Progresso de metas',     description: 'Marcos em 25%, 50%, 75% e 100% da meta atingida.' },
  { key: 'Due',      label: 'Pagamentos a vencer',    description: 'Pagamentos recorrentes com vencimento em até 3 dias.' },
  { key: 'Insights', label: 'Sugestões de IA',        description: 'Insights automáticos sobre seus padrões financeiros.' },
]

function NotificationsSection() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>({
    notifBudget:   user?.notifBudget   ?? true,
    notifGoals:    user?.notifGoals    ?? true,
    notifDue:      user?.notifDue      ?? true,
    notifInsights: user?.notifInsights ?? true,
    emailBudget:   user?.emailBudget   ?? false,
    emailGoals:    user?.emailGoals    ?? false,
    emailDue:      user?.emailDue      ?? false,
    emailInsights: user?.emailInsights ?? false,
  })

  useEffect(() => {
    setPrefs({
      notifBudget:   user?.notifBudget   ?? true,
      notifGoals:    user?.notifGoals    ?? true,
      notifDue:      user?.notifDue      ?? true,
      notifInsights: user?.notifInsights ?? true,
      emailBudget:   user?.emailBudget   ?? false,
      emailGoals:    user?.emailGoals    ?? false,
      emailDue:      user?.emailDue      ?? false,
      emailInsights: user?.emailInsights ?? false,
    })
  }, [
    user?.notifBudget, user?.notifGoals, user?.notifDue, user?.notifInsights,
    user?.emailBudget, user?.emailGoals, user?.emailDue, user?.emailInsights,
  ])

  const toggle = (key: NotifKey) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))

  const isDirty =
    prefs.notifBudget   !== (user?.notifBudget   ?? true)  ||
    prefs.notifGoals    !== (user?.notifGoals    ?? true)  ||
    prefs.notifDue      !== (user?.notifDue      ?? true)  ||
    prefs.notifInsights !== (user?.notifInsights ?? true)  ||
    prefs.emailBudget   !== (user?.emailBudget   ?? false) ||
    prefs.emailGoals    !== (user?.emailGoals    ?? false) ||
    prefs.emailDue      !== (user?.emailDue      ?? false) ||
    prefs.emailInsights !== (user?.emailInsights ?? false)

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    try {
      const { data } = await api.put('/auth/preferences', prefs)
      setUser(data)
      toast({ title: 'Notificações atualizadas' })
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao salvar notificações'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center px-1">
        <div />
        <span className="text-xs font-medium text-slate-500 text-center w-12">No app</span>
        <span className="text-xs font-medium text-slate-500 text-center w-12">Email</span>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {NOTIF_ROWS.map(({ key, label, description }) => {
          const inAppKey = `notif${key}` as NotifKey
          const emailKey = `email${key}` as NotifKey
          return (
            <div
              key={key}
              className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-start py-3 border-b border-slate-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              </div>
              <div className="flex items-center justify-center w-12 pt-0.5">
                <Switch
                  checked={prefs[inAppKey]}
                  onCheckedChange={() => toggle(inAppKey)}
                />
              </div>
              <div className="flex items-center justify-center w-12 pt-0.5">
                <Switch
                  checked={prefs[emailKey]}
                  onCheckedChange={() => toggle(emailKey)}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-slate-400">
        O envio por email será ativado em breve. As preferências já ficam salvas.
      </p>

      <Button onClick={handleSave} disabled={!isDirty || saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar notificações'}
      </Button>
    </div>
  )
}

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
    e.target.value = '' // allow re-selecting the same file
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({ title: 'Formato não suportado. Use JPG, PNG, GIF ou WebP.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'Arquivo muito grande. O tamanho máximo permitido é 2 MB.', variant: 'destructive' })
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
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao salvar foto'), variant: 'destructive' })
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
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao remover foto'), variant: 'destructive' })
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
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao atualizar nome'), variant: 'destructive' })
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
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao alterar senha'), variant: 'destructive' })
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
      setTimeout(() => void logout(), 1500)
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Erro ao limpar dados'), variant: 'destructive' })
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

// ─── MFA section ──────────────────────────────────────────────────────────────

type MfaStep = 'idle' | 'setup' | 'confirm-disable'

function MfaSection() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const [step, setStep] = useState<MfaStep>('idle')
  const [qrDataUri, setQrDataUri] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const mfaEnabled = user?.mfaEnabled ?? false

  const handleSetup = async () => {
    setSaving(true)
    try {
      const { data } = await api.post('/auth/mfa/setup')
      const dataUri = await QRCode.toDataURL(data.otpauthUrl)
      setQrDataUri(dataUri)
      setSecret(data.secret)
      setCode('')
      setStep('setup')
    } catch {
      toast({ title: 'Erro ao iniciar configuração de MFA', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/auth/mfa/enable', { code })
      const { data } = await api.get('/auth/me')
      setUser(data)
      toast({ title: 'MFA ativado com sucesso' })
      setStep('idle')
      setCode('')
      setQrDataUri(null)
      setSecret(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Código inválido'
      toast({ title: msg, variant: 'destructive' })
      setCode('')
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.delete('/auth/mfa/disable', { data: { code } })
      const { data } = await api.get('/auth/me')
      setUser(data)
      toast({ title: 'MFA desativado' })
      setStep('idle')
      setCode('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Código inválido'
      toast({ title: msg, variant: 'destructive' })
      setCode('')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'setup') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Escaneie o QR code abaixo com Google Authenticator, Authy ou outro aplicativo TOTP.
        </p>
        {qrDataUri && (
          <div className="flex flex-col items-center gap-3">
            <img src={qrDataUri} alt="QR Code MFA" className="w-44 h-44 rounded-lg border border-slate-200 p-2" />
            {secret && (
              <p className="text-[11px] text-slate-400 font-mono break-all text-center max-w-xs">
                Chave manual: <span className="font-semibold text-slate-600">{secret}</span>
              </p>
            )}
          </div>
        )}
        <form onSubmit={handleEnable} className="space-y-3 max-w-xs">
          <div className="space-y-1.5">
            <Label htmlFor="mfa-enable-code">Confirme com o código gerado</Label>
            <Input
              id="mfa-enable-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              className="font-mono tracking-widest text-center"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setStep('idle'); setCode('') }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || code.length !== 6}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Ativar MFA
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (step === 'confirm-disable') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Digite o código do seu aplicativo autenticador para desativar o MFA.
        </p>
        <form onSubmit={handleDisable} className="space-y-3 max-w-xs">
          <Input
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            className="font-mono tracking-widest text-center"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setStep('idle'); setCode('') }}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={saving || code.length !== 6}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desativar'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {mfaEnabled ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Autenticação em dois fatores ativa</span>
            </div>
            <p className="text-xs text-slate-500">
              Seu login exige um código TOTP do aplicativo autenticador.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ShieldOff className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Autenticação em dois fatores inativa</span>
            </div>
            <p className="text-xs text-slate-500">
              Adicione uma camada extra de segurança com um aplicativo autenticador (Google Authenticator, Authy, etc.).
            </p>
          </>
        )}
      </div>
      {mfaEnabled ? (
        <Button
          size="sm"
          variant="outline"
          className="border-rose-200 text-rose-600 hover:bg-rose-50 shrink-0"
          onClick={() => setStep('confirm-disable')}
        >
          Desativar
        </Button>
      ) : (
        <Button size="sm" onClick={handleSetup} disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ativar'}
        </Button>
      )}
    </div>
  )
}

// ─── Sessions section ─────────────────────────────────────────────────────────

function deviceIcon(deviceName: string | null) {
  const name = deviceName?.toLowerCase() ?? ''
  if (name === 'mobile') return <Smartphone className="w-4 h-4 text-slate-500" />
  if (name === 'navegador' || name === '') return <Globe className="w-4 h-4 text-slate-500" />
  return <Monitor className="w-4 h-4 text-slate-500" />
}

function SessionsSection() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/sessions')
      setSessions(data)
    } catch {
      toast({ title: 'Erro ao carregar sessões', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSessions() }, [])

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      await api.delete(`/auth/sessions/${id}`)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      toast({ title: 'Sessão encerrada' })
    } catch {
      toast({ title: 'Erro ao revogar sessão', variant: 'destructive' })
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeAll = async () => {
    const others = sessions.filter((s) => !s.isCurrent)
    for (const s of others) await handleRevoke(s.id)
  }

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  }

  const others = sessions.filter((s) => !s.isCurrent)

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Nenhuma sessão ativa encontrada.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
              <div className="shrink-0">{deviceIcon(session.deviceName)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {session.deviceName ?? 'Dispositivo desconhecido'}
                  </span>
                  {session.isCurrent && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Esta sessão
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {session.ipAddress && <span>{session.ipAddress} · </span>}
                  Última atividade: {new Date(session.lastUsedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!session.isCurrent && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-rose-600 shrink-0"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                >
                  {revoking === session.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {others.length > 1 && (
        <Button
          size="sm"
          variant="outline"
          className="text-rose-600 border-rose-200 hover:bg-rose-50"
          onClick={handleRevokeAll}
        >
          Encerrar todas as outras sessões
        </Button>
      )}
    </div>
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

      {/* Financial preferences */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Preferências Financeiras
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <PreferencesSection />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <NotificationsSection />
        </CardContent>
      </Card>

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
            Alterar senha
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <PasswordSection />
        </CardContent>
      </Card>

      {/* MFA */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            Autenticação em dois fatores (MFA)
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <MfaSection />
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-400" />
            Sessões ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <SessionsSection />
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
