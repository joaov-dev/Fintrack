import { useEffect, useRef, useState } from 'react'
import { Loader2, Repeat2, Tag, Plus, X, Paperclip, Scissors, Trash2, AlertCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Transaction, Category, Account, RECURRENCE_TYPE_LABELS, TransactionAttachment } from '@/types'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { formatCurrency } from '@/lib/utils'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: unknown) => Promise<void>
  transaction?: Transaction | null
  categories: Category[]
  accounts: Account[]
}

interface SplitPart {
  categoryId: string
  amount: string
  description: string
}

const defaultForm = {
  type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  isRecurring: false,
  recurrenceType: '' as string,
  recurrenceEnd: '',
}

export function TransactionModal({ open, onClose, onSave, transaction, categories, accounts }: TransactionModalProps) {
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  // Tags
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<{ id: string; name: string }[]>([])

  // Rule suggestion
  const [ruleSuggestion, setRuleSuggestion] = useState<{ categoryId: string; accountId: string | null; ruleName: string } | null>(null)
  const ruleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Split (rateio)
  const [isSplit, setIsSplit] = useState(false)
  const [splitParts, setSplitParts] = useState<SplitPart[]>([
    { categoryId: '', amount: '', description: '' },
    { categoryId: '', amount: '', description: '' },
  ])

  // Attachments
  const [existingAttachments, setExistingAttachments] = useState<Pick<TransactionAttachment, 'id' | 'filename' | 'mimeType' | 'size'>[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<{ filename: string; mimeType: string; dataUrl: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit scope (when editing a recurring instance)
  const [editScope, setEditScope] = useState<'only' | 'future' | 'all'>('only')

  // Is this a recurring instance (not the template)?
  const isRecurringInstance = !!(transaction?.parentId && !transaction.isRecurring)

  // ── Reset state when modal opens/closes ───────────────────────────────────

  useEffect(() => {
    if (!open) return
    setRuleSuggestion(null)
    setTagInput('')
    setIsSplit(false)
    setEditScope('only')
    setSplitParts([
      { categoryId: '', amount: '', description: '' },
      { categoryId: '', amount: '', description: '' },
    ])
    setPendingAttachments([])

    if (transaction) {
      setForm({
        type: transaction.type,
        description: transaction.description,
        amount: String(transaction.amount),
        categoryId: transaction.categoryId,
        accountId: transaction.accountId || '',
        date: transaction.date.slice(0, 10),
        notes: transaction.notes || '',
        isRecurring: transaction.isRecurring,
        recurrenceType: transaction.recurrenceType || '',
        recurrenceEnd: transaction.recurrenceEnd ? transaction.recurrenceEnd.slice(0, 10) : '',
      })
      setTags(transaction.tags?.map((t) => t.name) ?? [])
      setExistingAttachments(transaction.attachments ?? [])
    } else {
      setForm(defaultForm)
      setTags([])
      setExistingAttachments([])
    }
  }, [transaction, open])

  // ── Fetch tag suggestions for autocomplete ────────────────────────────────

  useEffect(() => {
    if (!tagInput) { setTagSuggestions([]); return }
    api.get('/transactions/tags').then(({ data }) => {
      setTagSuggestions(
        (data as { id: string; name: string }[]).filter(
          (t) => t.name.includes(tagInput.toLowerCase()) && !tags.includes(t.name),
        ),
      )
    }).catch(() => {})
  }, [tagInput, tags])

  // ── Rule suggestion when description changes ──────────────────────────────

  const handleDescriptionChange = (value: string) => {
    setForm((f) => ({ ...f, description: value }))
    if (ruleDebounceRef.current) clearTimeout(ruleDebounceRef.current)
    if (!value.trim() || form.categoryId) { setRuleSuggestion(null); return }
    ruleDebounceRef.current = setTimeout(() => {
      api.get('/categorization-rules/suggest', { params: { description: value } })
        .then(({ data }) => {
          if (data && !form.categoryId) {
            setRuleSuggestion(data)
            setForm((f) => ({
              ...f,
              categoryId: f.categoryId || data.categoryId,
              accountId:  f.accountId  || data.accountId || '',
            }))
          }
        }).catch(() => {})
    }, 600)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const filteredCategories = categories.filter((c) => c.type === form.type)
  const rootCats    = filteredCategories.filter((c) => !c.parentId)
  const childrenOf  = (pid: string) => filteredCategories.filter((c) => c.parentId === pid)

  const addTag = (name: string) => {
    const clean = name.trim().toLowerCase()
    if (clean && !tags.includes(clean)) setTags([...tags, clean])
    setTagInput('')
    setTagSuggestions([])
  }

  const removeTag = (name: string) => setTags(tags.filter((t) => t !== name))

  const splitTotal = splitParts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const splitValid = isSplit && splitParts.every((p) => p.categoryId && parseFloat(p.amount) > 0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPendingAttachments((prev) => [...prev, {
        filename: file.name,
        mimeType: file.type,
        dataUrl:  reader.result as string,
      }])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeExistingAttachment = async (attachmentId: string) => {
    if (!transaction) return
    await api.delete(`/transactions/${transaction.id}/attachments/${attachmentId}`)
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  const uploadPendingAttachments = async (transactionId: string) => {
    for (const att of pendingAttachments) {
      await api.post(`/transactions/${transactionId}/attachments`, att)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (isSplit) {
        // Split transaction — calls POST /transactions/split
        const result = await api.post('/transactions/split', {
          description:   form.description,
          date:          new Date(form.date + 'T12:00:00').toISOString(),
          type:          form.type,
          accountId:     form.accountId || null,
          notes:         form.notes || null,
          parts:         splitParts.map((p) => ({
            categoryId:  p.categoryId,
            amount:      parseFloat(p.amount),
            description: p.description || undefined,
          })),
        })
        const firstId = result.data[0]?.id
        if (firstId && pendingAttachments.length > 0) await uploadPendingAttachments(firstId)
        await onSave(result.data)
      } else {
        await onSave({
          type:            form.type,
          description:     form.description,
          amount:          parseFloat(form.amount),
          categoryId:      form.categoryId,
          accountId:       form.accountId || null,
          date:            new Date(form.date + 'T12:00:00').toISOString(),
          notes:           form.notes || null,
          tags:            tags.length > 0 ? tags : undefined,
          isRecurring:     form.isRecurring,
          recurrenceType:  form.isRecurring && form.recurrenceType ? form.recurrenceType : null,
          recurrenceEnd:   form.isRecurring && form.recurrenceEnd
            ? new Date(form.recurrenceEnd + 'T23:59:59').toISOString()
            : null,
          // Pass editScope for recurring instances
          ...(isRecurringInstance ? { editScope } : {}),
        })
        if (pendingAttachments.length > 0 && transaction?.id) {
          await uploadPendingAttachments(transaction.id)
        }
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const canSubmit = isSplit ? splitValid : !!form.categoryId

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setForm({ ...form, type: t, categoryId: '' })}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                  form.type === t
                    ? t === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t === 'EXPENSE' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          {/* Description + rule suggestion */}
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Almoço no trabalho"
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              required
            />
            {ruleSuggestion && (
              <p className="text-xs text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                Regra aplicada: <strong>{ruleSuggestion.ruleName}</strong>
                <button type="button" onClick={() => { setRuleSuggestion(null); setForm((f) => ({ ...f, categoryId: '', accountId: '' })) }} className="ml-auto text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              </p>
            )}
          </div>

          {/* Amount + date */}
          {!isSplit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required={!isSplit} />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
          )}

          {isSplit && (
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          )}

          {/* Category (grouped: root + indented children) — only shown when not in split mode */}
          {!isSplit && (
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoryId} onValueChange={(v) => { setForm({ ...form, categoryId: v }); setRuleSuggestion(null) }} required>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {rootCats.map((root) => {
                    const children = childrenOf(root.id)
                    return [
                      <SelectItem key={root.id} value={root.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: root.color }} />
                          {root.name}
                        </span>
                      </SelectItem>,
                      ...children.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2 pl-4">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                            <span className="text-slate-500">{c.name}</span>
                          </span>
                        </SelectItem>
                      )),
                    ]
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Split parts */}
          {isSplit && (
            <div className="space-y-2">
              <Label>Partes do rateio</Label>
              {splitParts.map((part, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_28px] gap-2 items-end">
                  <div>
                    <Select value={part.categoryId} onValueChange={(v) => setSplitParts((prev) => prev.map((p, j) => j === i ? { ...p, categoryId: v } : p))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                      <SelectContent>
                        {rootCats.map((root) => {
                          const children = childrenOf(root.id)
                          return [
                            <SelectItem key={root.id} value={root.id}>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: root.color }} />
                                {root.name}
                              </span>
                            </SelectItem>,
                            ...children.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-1.5 pl-3 text-slate-500">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                                  {c.name}
                                </span>
                              </SelectItem>
                            )),
                          ]
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number" step="0.01" min="0.01" placeholder="0,00"
                    className="h-8 text-xs"
                    value={part.amount}
                    onChange={(e) => setSplitParts((prev) => prev.map((p, j) => j === i ? { ...p, amount: e.target.value } : p))}
                  />
                  <button
                    type="button"
                    disabled={splitParts.length <= 2}
                    onClick={() => setSplitParts((prev) => prev.filter((_, j) => j !== i))}
                    className="h-8 w-7 flex items-center justify-center text-slate-400 hover:text-rose-500 disabled:opacity-30"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSplitParts((prev) => [...prev, { categoryId: '', amount: '', description: '' }])}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar linha
                </button>
                <span className={cn('text-xs font-medium', splitTotal > 0 ? 'text-slate-700' : 'text-slate-400')}>
                  Total: {formatCurrency(splitTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Split toggle */}
          {!transaction && !form.isRecurring && (
            <button
              type="button"
              onClick={() => { setIsSplit((v) => !v); setSplitParts([{ categoryId: '', amount: '', description: '' }, { categoryId: '', amount: '', description: '' }]) }}
              className={cn('flex items-center gap-2 w-full text-sm font-medium transition-colors', isSplit ? 'text-primary' : 'text-slate-500 hover:text-slate-700')}
            >
              <Scissors className="w-4 h-4" />
              Dividir em categorias (rateio)
              <div className={cn('ml-auto w-9 h-5 rounded-full transition-colors flex items-center px-0.5', isSplit ? 'bg-primary justify-end' : 'bg-slate-200 justify-start')}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </button>
          )}

          {/* Account */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Conta <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Select value={form.accountId || 'none'} onValueChange={(v) => setForm({ ...form, accountId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conta específica</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recurring */}
          {!transaction?.parentId && !isSplit && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecurring: !form.isRecurring, recurrenceType: !form.isRecurring ? 'MONTHLY' : '' })}
                className={cn('flex items-center gap-2 w-full text-sm font-medium transition-colors', form.isRecurring ? 'text-primary' : 'text-slate-600 hover:text-slate-900')}
              >
                <Repeat2 className="w-4 h-4" />
                Transação recorrente
                <div className={cn('ml-auto w-9 h-5 rounded-full transition-colors flex items-center px-0.5', form.isRecurring ? 'bg-primary justify-end' : 'bg-slate-200 justify-start')}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {form.isRecurring && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frequência</Label>
                    <Select value={form.recurrenceType} onValueChange={(v) => setForm({ ...form, recurrenceType: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECURRENCE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Encerrar em <span className="text-slate-400">(opcional)</span></Label>
                    <Input type="date" className="h-8 text-xs" value={form.recurrenceEnd} onChange={(e) => setForm({ ...form, recurrenceEnd: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Observações <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input placeholder="Anotações adicionais" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tags <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border rounded-md bg-white relative">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  #{t}
                  <button type="button" onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[80px] text-xs outline-none"
                placeholder={tags.length === 0 ? 'trabalho, viagem...' : ''}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault()
                    addTag(tagInput)
                  }
                  if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    removeTag(tags[tags.length - 1])
                  }
                }}
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 min-w-[140px]">
                  {tagSuggestions.slice(0, 5).map((s) => (
                    <button key={s.id} type="button" onClick={() => addTag(s.name)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                      #{s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Anexos <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <div className="space-y-1.5">
              {existingAttachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 text-xs bg-slate-50 rounded-md px-3 py-2">
                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate text-slate-700">{att.filename}</span>
                  <span className="text-slate-400">{(att.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => removeExistingAttachment(att.id)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {pendingAttachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-primary/5 rounded-md px-3 py-2">
                  <Paperclip className="w-3 h-3 text-primary shrink-0" />
                  <span className="flex-1 truncate text-slate-700">{att.filename}</span>
                  <span className="text-primary text-xs">novo</span>
                  <button type="button" onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Anexar comprovante
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Edit scope — only shown when editing a recurring instance */}
          {isRecurringInstance && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Esta é uma ocorrência recorrente. O que deseja alterar?
              </p>
              <div className="flex flex-col gap-1.5">
                {([
                  { value: 'only',   label: 'Apenas esta ocorrência' },
                  { value: 'future', label: 'Esta e as próximas' },
                  { value: 'all',    label: 'Todas as ocorrências' },
                ] as const).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editScope"
                      value={value}
                      checked={editScope === value}
                      onChange={() => setEditScope(value)}
                      className="accent-primary"
                    />
                    <span className="text-xs text-amber-900">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !canSubmit}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {transaction ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
