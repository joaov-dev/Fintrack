import { useState, useEffect } from 'react'
import { Wand2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useRules } from '@/hooks/useRules'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/use-toast'
import { CategorizationRule } from '@/types'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface RuleForm {
  name: string
  pattern: string
  matchType: 'CONTAINS' | 'STARTS_WITH' | 'EQUALS'
  categoryId: string
  accountId: string
  isActive: boolean
  priority: number
}

const defaultForm: RuleForm = {
  name: '',
  pattern: '',
  matchType: 'CONTAINS',
  categoryId: '',
  accountId: '',
  isActive: true,
  priority: 0,
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  CONTAINS:    'Contém',
  STARTS_WITH: 'Começa com',
  EQUALS:      'Igual a',
}

const MATCH_TYPE_COLORS: Record<string, string> = {
  CONTAINS:    'bg-sky-100 text-sky-700',
  STARTS_WITH: 'bg-violet-100 text-violet-700',
  EQUALS:      'bg-emerald-100 text-emerald-700',
}

// ── Rule Modal ─────────────────────────────────────────────────────────────────

interface RuleModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: RuleForm) => Promise<void>
  rule?: CategorizationRule | null
  categories: { id: string; name: string; color: string; type: string; parentId?: string | null }[]
  accounts: { id: string; name: string; color: string }[]
}

function RuleModal({ open, onClose, onSave, rule, categories, accounts }: RuleModalProps) {
  const [form, setForm] = useState<RuleForm>(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(rule ? {
      name: rule.name,
      pattern: rule.pattern,
      matchType: rule.matchType as RuleForm['matchType'],
      categoryId: rule.categoryId,
      accountId: rule.accountId ?? '',
      isActive: rule.isActive,
      priority: rule.priority,
    } : defaultForm)
  }, [open, rule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da regra</Label>
            <Input
              placeholder="Ex: Supermercado Extra"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de correspondência</Label>
              <Select
                value={form.matchType}
                onValueChange={(v) => setForm({ ...form, matchType: v as RuleForm['matchType'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTAINS">Contém</SelectItem>
                  <SelectItem value="STARTS_WITH">Começa com</SelectItem>
                  <SelectItem value="EQUALS">Igual a</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Padrão a buscar</Label>
              <Input
                placeholder="Ex: Extra"
                value={form.pattern}
                onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria destino</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm({ ...form, categoryId: v })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categories.filter((c) => !c.parentId).map((root) => {
                  const children = categories.filter((c) => c.parentId === root.id)
                  return [
                    <SelectItem key={root.id} value={root.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: root.color }} />
                        {root.name}
                      </span>
                    </SelectItem>,
                    ...children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2 pl-4">
                          <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                          <span className="text-slate-500">{c.name}</span>
                        </span>
                      </SelectItem>
                    )),
                  ]
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Conta destino <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Select
              value={form.accountId || 'none'}
              onValueChange={(v) => setForm({ ...form, accountId: v === 'none' ? '' : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem conta específica</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-[11px] text-slate-400">Maior número = maior prioridade</p>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={cn(
                  'flex items-center gap-2 w-full text-sm font-medium px-3 py-2 rounded-md border transition-colors',
                  form.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200',
                )}
              >
                <div className={cn(
                  'w-8 h-4 rounded-full flex items-center px-0.5 transition-colors',
                  form.isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start',
                )}>
                  <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                </div>
                {form.isActive ? 'Ativa' : 'Inativa'}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !form.categoryId || !form.pattern || !form.name}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {rule ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RulesPage() {
  const { rules, isLoading, create, update, remove } = useRules()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CategorizationRule | null>(null)

  const handleSave = async (data: RuleForm) => {
    try {
      const payload = {
        ...data,
        accountId: data.accountId || null,
      }
      if (editing) {
        await update(editing.id, payload)
        toast({ title: 'Regra atualizada' })
      } else {
        await create(payload)
        toast({ title: 'Regra criada' })
      }
    } catch {
      toast({ title: 'Erro ao salvar regra', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return
    try {
      await remove(id)
      toast({ title: 'Regra excluída' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (rule: CategorizationRule) => {
    try {
      await update(rule.id, { isActive: !rule.isActive })
    } catch {
      toast({ title: 'Erro ao atualizar regra', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            Regras de Categorização
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Categorize transações automaticamente ao importar ou criar
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wand2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Nenhuma regra criada</p>
            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
              Crie regras para categorizar automaticamente transações que contenham determinadas palavras
            </p>
            <Button variant="outline" className="mt-4" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="w-4 h-4" /> Criar primeira regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Padrão</th>
                    <th className="px-4 py-3 text-left font-medium">Categoria</th>
                    <th className="px-4 py-3 text-left font-medium">Conta</th>
                    <th className="px-4 py-3 text-center font-medium">Aplicações</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules
                    .slice()
                    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
                    .map((rule) => (
                      <tr key={rule.id} className={cn('hover:bg-slate-50/60 transition-colors', !rule.isActive && 'opacity-50')}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{rule.name}</p>
                          {rule.priority > 0 && (
                            <span className="text-[10px] text-slate-400">prioridade {rule.priority}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                              MATCH_TYPE_COLORS[rule.matchType] ?? 'bg-slate-100 text-slate-600',
                            )}>
                              {MATCH_TYPE_LABELS[rule.matchType] ?? rule.matchType}
                            </span>
                            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {rule.pattern}
                            </code>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rule.category && (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: rule.category.color }} />
                              {rule.category.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rule.account ? (
                            <span className="text-xs text-slate-600">{rule.account.name}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-medium text-slate-700">{rule.appliedCount}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(rule)}
                            title={rule.isActive ? 'Clique para desativar' : 'Clique para ativar'}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-colors',
                              rule.isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                            )}
                          >
                            <span className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              rule.isActive ? 'bg-emerald-500' : 'bg-slate-400',
                            )} />
                            {rule.isActive ? 'Ativa' : 'Inativa'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-primary"
                              onClick={() => { setEditing(rule); setModalOpen(true) }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-rose-600"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="border-dashed border-slate-200 bg-slate-50/50">
        <CardContent className="py-4 px-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Como funcionam:</strong>{' '}
            Quando uma transação é criada ou importada, o sistema verifica se a descrição corresponde
            a alguma regra ativa (em ordem de prioridade). A primeira correspondência preenche
            automaticamente a categoria e conta.
          </p>
        </CardContent>
      </Card>

      <RuleModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        rule={editing}
        categories={categories}
        accounts={accounts}
      />
    </div>
  )
}
