import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { parseCSV, autoDetectMapping, isMappingComplete, downloadCSVTemplate } from '@/lib/csvParser'
import { api } from '@/services/api'
import { Account, Category, ImportPreviewRow, ImportResult } from '@/types'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview' | 'confirm' | 'result'

interface ColumnMapping {
  date: string | null
  description: string | null
  amount: string | null
  type: string | null
  account: string | null
  category: string | null
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: 'Data',
  description: 'Descrição',
  amount: 'Valor',
  type: 'Tipo',
  account: 'Conta',
  category: 'Categoria',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  // Handle Brazilian format (1.234,56) and standard (1234.56)
  const cleaned = raw.replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') && cleaned.indexOf(',') > cleaned.indexOf('.')
    ? cleaned.replace('.', '').replace(',', '.')
    : cleaned.replace(',', '')
  return parseFloat(normalized) || 0
}

function normalizeType(raw: string): 'INCOME' | 'EXPENSE' | null {
  const v = raw.trim().toUpperCase()
  if (['INCOME', 'RECEITA', 'ENTRADA', 'CREDIT', 'C'].includes(v)) return 'INCOME'
  if (['EXPENSE', 'DESPESA', 'SAIDA', 'SAÍDA', 'DEBIT', 'D'].includes(v)) return 'EXPENSE'
  return null
}

function buildPreviewRows(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  accountMap: Map<string, string>,   // name.lower → id
  categoryMap: Map<string, string>,  // name.lower → id
): ImportPreviewRow[] {
  return rawRows.map((raw, i) => {
    const get = (field: keyof ColumnMapping) => raw[mapping[field] ?? ''] ?? ''

    const date        = get('date').trim()
    const description = get('description').trim()
    const amountRaw   = get('amount').trim()
    const typeRaw     = get('type').trim()
    const accountName = get('account').trim()
    const categoryName = get('category').trim()

    const amount    = parseAmount(amountRaw)
    const typeVal   = normalizeType(typeRaw)
    const accountId = accountMap.get(accountName.toLowerCase()) ?? null
    const categoryId = categoryMap.get(categoryName.toLowerCase()) ?? null

    const errors: string[] = []
    if (!date || isNaN(new Date(date).getTime())) errors.push('data inválida')
    if (!description) errors.push('descrição ausente')
    if (!amount || amount <= 0) errors.push('valor inválido')
    if (!typeVal) errors.push('tipo inválido')
    if (!accountId) errors.push(`conta "${accountName}" não encontrada`)
    if (!categoryId) errors.push(`categoria "${categoryName}" não encontrada`)

    return {
      _id: `row-${i}`,
      date,
      description,
      amount: amountRaw,
      type: typeRaw,
      accountName,
      categoryName,
      accountId,
      categoryId,
      errors,
      ignored: false,
      overrideType: typeVal ?? undefined,
    }
  })
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload',  label: 'Arquivo' },
  { key: 'mapping', label: 'Colunas' },
  { key: 'preview', label: 'Prévia' },
  { key: 'confirm', label: 'Confirmar' },
]

function StepBar({ current }: { current: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 flex-1">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
            i < activeIndex ? 'bg-primary text-white' :
            i === activeIndex ? 'bg-primary/90 text-white ring-2 ring-primary/30' :
            'bg-slate-100 text-slate-400',
          )}>
            {i < activeIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={cn(
            'text-[11px] font-medium hidden sm:block',
            i === activeIndex ? 'text-primary' : 'text-slate-400',
          )}>{s.label}</span>
          {i < STEPS.length - 1 && (
            <div className={cn('h-px flex-1 mx-1', i < activeIndex ? 'bg-primary' : 'bg-slate-200')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportModal({ open, onClose, onSuccess }: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]               = useState<Step>('upload')
  const [parseError, setParseError]   = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders]   = useState<string[]>([])
  const [csvRows, setCsvRows]         = useState<Record<string, string>[]>([])
  const [mapping, setMapping]         = useState<ColumnMapping>({ date: null, description: null, amount: null, type: null, account: null, category: null })
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return
    setStep('upload')
    setParseError(null)
    setCsvHeaders([])
    setCsvRows([])
    setMapping({ date: null, description: null, amount: null, type: null, account: null, category: null })
    setPreviewRows([])
    setShowOnlyErrors(false)
    setImportResult(null)

    // Fetch accounts + categories for matching
    Promise.all([api.get('/accounts'), api.get('/categories')]).then(([a, c]) => {
      setAccounts(a.data)
      setCategories(c.data)
    })
  }, [open])

  // ── Maps for name→id lookup ────────────────────────────────────────────────
  const accountMap  = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]))
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

  // ── Step 1: File upload ────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setParseError(null)
    if (file.size > 5 * 1024 * 1024) {
      setParseError('Arquivo muito grande. Máximo: 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        const { headers, rows } = parseCSV(text)
        if (headers.length === 0) {
          setParseError('CSV vazio ou sem cabeçalho.')
          return
        }
        if (rows.length === 0) {
          setParseError('Nenhuma linha de dados encontrada.')
          return
        }
        if (rows.length > 2000) {
          setParseError('Máximo de 2000 linhas por importação.')
          return
        }
        setCsvHeaders(headers)
        setCsvRows(rows)

        // Auto-detect columns
        const detected = autoDetectMapping(headers)
        const m: ColumnMapping = {
          date:        detected.date        ?? null,
          description: detected.description ?? null,
          amount:      detected.amount      ?? null,
          type:        detected.type        ?? null,
          account:     detected.account     ?? null,
          category:    detected.category    ?? null,
        }
        setMapping(m)
        setStep(isMappingComplete(m as unknown as Record<string, string | null>) ? 'preview' : 'mapping')
      } catch {
        setParseError('Erro ao processar o arquivo. Verifique se é um CSV válido.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ── Step 2 → 3: Apply mapping and build preview ────────────────────────────
  const applyMappingAndPreview = async () => {
    const rows = buildPreviewRows(csvRows, mapping, accountMap, categoryMap)

    // Check for duplicates against the database
    const validRows = rows.map((r, i) => ({
      index: i,
      date: r.date,
      description: r.description,
      amount: parseAmount(r.amount),
      type: (r.overrideType ?? normalizeType(r.type)) as string,
    })).filter((r) => r.type && r.date && r.description && r.amount > 0)

    try {
      const { data } = await api.post('/import/check-duplicates', {
        rows: validRows.map(({ date, description, amount, type }) => ({ date, description, amount, type })),
      })
      const duplicateIndices = new Set<number>((data.duplicates as number[]).map((i) => validRows[i]?.index ?? -1))
      const markedRows = rows.map((r, i) => ({
        ...r,
        isDuplicate: duplicateIndices.has(i),
        ignored: duplicateIndices.has(i) ? true : r.ignored,
      }))
      setPreviewRows(markedRows)
    } catch {
      setPreviewRows(rows)
    }

    setStep('preview')
  }

  // ── Preview: per-row overrides ─────────────────────────────────────────────
  const updateRow = (id: string, patch: Partial<ImportPreviewRow>) => {
    setPreviewRows((prev) => prev.map((r) => r._id === id ? { ...r, ...patch } : r))
  }

  // ── Confirm step stats ─────────────────────────────────────────────────────
  const activeRows = previewRows.filter((r) => !r.ignored && r.errors.length === 0)
  const totalIncome  = activeRows.filter((r) => (r.overrideType ?? normalizeType(r.type)) === 'INCOME').reduce((s, r) => s + parseAmount(r.amount), 0)
  const totalExpense = activeRows.filter((r) => (r.overrideType ?? normalizeType(r.type)) === 'EXPENSE').reduce((s, r) => s + parseAmount(r.amount), 0)
  const dates        = activeRows.map((r) => r.date).filter(Boolean).sort()
  const dateRange    = dates.length > 0 ? `${dates[0]} → ${dates[dates.length - 1]}` : '—'

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setIsImporting(true)
    try {
      const payload = activeRows.map((r) => ({
        date:        r.date,
        description: r.description,
        amount:      parseAmount(r.amount),
        type:        (r.overrideType ?? normalizeType(r.type)) as 'INCOME' | 'EXPENSE',
        accountId:   r.overrideAccountId ?? r.accountId!,
        categoryId:  r.overrideCategoryId ?? r.categoryId!,
      }))
      const res = await api.post('/import/transactions', { rows: payload })
      setImportResult(res.data)
      setStep('result')
    } finally {
      setIsImporting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const displayRows = showOnlyErrors
    ? previewRows.filter((r) => r.errors.length > 0)
    : previewRows

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar histórico via CSV</DialogTitle>
        </DialogHeader>

        {step !== 'result' && <StepBar current={step} />}

        {/* ── Step 1: Upload ────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Arraste ou clique para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">CSV · Máx. 5MB · Até 2000 linhas</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">date, description, amount, type, account, category</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {parseError && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {parseError}
              </p>
            )}
            <button
              onClick={downloadCSVTemplate}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar template CSV
            </button>
          </div>
        )}

        {/* ── Step 2: Column mapping ────────────────────────────────────── */}
        {step === 'mapping' && (
          <div className="space-y-4 overflow-y-auto">
            <p className="text-sm text-slate-500">
              Não conseguimos detectar todas as colunas automaticamente. Mapeie cada campo:
            </p>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Campo DominaHub</th>
                    <th className="px-4 py-2.5 text-left font-medium">Coluna no CSV</th>
                    <th className="px-4 py-2.5 text-left font-medium">Exemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => {
                    const example = mapping[field]
                      ? csvRows[0]?.[mapping[field]!] ?? '—'
                      : '—'
                    return (
                      <tr key={field}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {FIELD_LABELS[field]}
                          <span className="text-rose-500 ml-0.5">*</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Select
                            value={mapping[field] ?? '__none__'}
                            onValueChange={(v) =>
                              setMapping((m) => ({ ...m, [field]: v === '__none__' ? null : v }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-44">
                              <SelectValue placeholder="Selecione…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— não mapeado —</SelectItem>
                              {csvHeaders.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-xs truncate max-w-[160px]">
                          {example}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button
                disabled={!isMappingComplete(mapping as unknown as Record<string, string | null>)}
                onClick={applyMappingAndPreview}
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ───────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-3 overflow-hidden min-h-0">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="text-emerald-600 font-medium">
                ✓ {previewRows.filter((r) => r.errors.length === 0).length} válidas
              </span>
              {previewRows.filter((r) => r.errors.length > 0).length > 0 && (
                <span className="text-rose-600 font-medium">
                  ✗ {previewRows.filter((r) => r.errors.length > 0).length} com erro
                </span>
              )}
              {previewRows.filter((r) => r.ignored).length > 0 && (
                <span className="text-slate-400">
                  {previewRows.filter((r) => r.ignored).length} ignoradas
                </span>
              )}
              {previewRows.filter((r) => r.isDuplicate).length > 0 && (
                <span className="text-amber-600 font-medium">
                  ⚠ {previewRows.filter((r) => r.isDuplicate).length} possíveis duplicatas
                </span>
              )}
              <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyErrors}
                  onChange={(e) => setShowOnlyErrors(e.target.checked)}
                  className="rounded"
                />
                Mostrar apenas erros
              </label>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 rounded-lg border border-slate-200 text-xs">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">Conta</th>
                    <th className="px-3 py-2 text-left font-medium">Categoria</th>
                    <th className="px-3 py-2 text-center font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.map((row, idx) => {
                    const hasError = row.errors.length > 0
                    return (
                      <tr
                        key={row._id}
                        className={cn(
                          row.ignored ? 'opacity-40 bg-slate-50' :
                          hasError    ? 'bg-rose-50' :
                          row.isDuplicate ? 'bg-amber-50/60' : '',
                        )}
                      >
                        <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-1.5">{row.date}</td>
                        <td className="px-3 py-1.5 max-w-[160px]" title={row.description}>
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{row.description}</span>
                            {row.isDuplicate && !row.ignored && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium border border-amber-200">
                                duplicata
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">{row.amount}</td>
                        {/* Type */}
                        <td className="px-3 py-1.5">
                          <Select
                            value={row.overrideType ?? normalizeType(row.type) ?? ''}
                            onValueChange={(v) => updateRow(row._id, { overrideType: v as 'INCOME' | 'EXPENSE' })}
                            disabled={row.ignored}
                          >
                            <SelectTrigger className="h-6 text-[11px] w-24 border-0 bg-transparent p-0">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INCOME">Receita</SelectItem>
                              <SelectItem value="EXPENSE">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        {/* Account */}
                        <td className="px-3 py-1.5">
                          <Select
                            value={row.overrideAccountId ?? row.accountId ?? '__none__'}
                            onValueChange={(v) => updateRow(row._id, { overrideAccountId: v })}
                            disabled={row.ignored}
                          >
                            <SelectTrigger className={cn('h-6 text-[11px] w-32 border-0 bg-transparent p-0', !row.accountId && 'text-rose-500')}>
                              <SelectValue placeholder="— não encontrada —" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {/* Category */}
                        <td className="px-3 py-1.5">
                          <Select
                            value={row.overrideCategoryId ?? row.categoryId ?? '__none__'}
                            onValueChange={(v) => updateRow(row._id, { overrideCategoryId: v })}
                            disabled={row.ignored}
                          >
                            <SelectTrigger className={cn('h-6 text-[11px] w-32 border-0 bg-transparent p-0', !row.categoryId && 'text-rose-500')}>
                              <SelectValue placeholder="— não encontrada —" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {/* Action */}
                        <td className="px-3 py-1.5 text-center">
                          <button
                            className="text-[11px] underline text-slate-400 hover:text-rose-500"
                            onClick={() => updateRow(row._id, { ignored: !row.ignored })}
                          >
                            {row.ignored ? 'Restaurar' : 'Ignorar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={() => setStep(csvHeaders.length ? 'mapping' : 'upload')}>
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button
                disabled={activeRows.length === 0}
                onClick={() => {
                  // Re-validate after user edits before going to confirm
                  const fixed = previewRows.map((r) => {
                    const accountId  = r.overrideAccountId ?? r.accountId
                    const categoryId = r.overrideCategoryId ?? r.categoryId
                    const typeVal    = r.overrideType ?? normalizeType(r.type)
                    const errs: string[] = []
                    if (!r.date || isNaN(new Date(r.date).getTime())) errs.push('data inválida')
                    if (!r.description) errs.push('descrição ausente')
                    if (!parseAmount(r.amount)) errs.push('valor inválido')
                    if (!typeVal) errs.push('tipo inválido')
                    if (!accountId) errs.push('conta não selecionada')
                    if (!categoryId) errs.push('categoria não selecionada')
                    return { ...r, errors: errs, accountId: accountId ?? null, categoryId: categoryId ?? null }
                  })
                  setPreviewRows(fixed)
                  setStep('confirm')
                }}
              >
                Continuar ({activeRows.length} linhas)
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ───────────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
              <div className="px-5 py-4 flex justify-between">
                <span className="text-sm text-slate-600">Transações a importar</span>
                <span className="text-sm font-semibold text-emerald-700">{activeRows.length}</span>
              </div>
              <div className="px-5 py-4 flex justify-between">
                <span className="text-sm text-slate-600">Linhas ignoradas / com erro</span>
                <span className="text-sm font-semibold text-slate-500">
                  {previewRows.length - activeRows.length}
                </span>
              </div>
              {previewRows.filter((r) => r.isDuplicate && r.ignored).length > 0 && (
                <div className="px-5 py-4 flex justify-between">
                  <span className="text-sm text-amber-700">Duplicatas ignoradas automaticamente</span>
                  <span className="text-sm font-semibold text-amber-700">
                    {previewRows.filter((r) => r.isDuplicate && r.ignored).length}
                  </span>
                </div>
              )}
              <div className="px-5 py-4 flex justify-between">
                <span className="text-sm text-slate-600">Período</span>
                <span className="text-sm font-mono text-slate-700">{dateRange}</span>
              </div>
              <div className="px-5 py-4 flex justify-between">
                <span className="text-sm text-slate-600">Total de receitas</span>
                <span className="text-sm font-semibold text-emerald-700">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="px-5 py-4 flex justify-between">
                <span className="text-sm text-slate-600">Total de despesas</span>
                <span className="text-sm font-semibold text-rose-600">{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            <div className="flex gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Essas transações impactarão relatórios e histórico, mas{' '}
                <strong>não alterarão o saldo inicial das contas</strong>. O saldo atual de cada conta
                passará a refletir as transações importadas.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={isImporting || activeRows.length === 0}>
                {isImporting ? 'Importando…' : `Confirmar importação (${activeRows.length})`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Result ────────────────────────────────────────────── */}
        {step === 'result' && importResult && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-800">Importação concluída</p>
              <p className="text-sm text-slate-500">
                {importResult.imported} transação{importResult.imported !== 1 ? 'ções' : ''} importada{importResult.imported !== 1 ? 's' : ''} com sucesso.
              </p>
              {importResult.skipped > 0 && (
                <p className="text-xs text-slate-400">
                  {importResult.skipped} linha{importResult.skipped !== 1 ? 's' : ''} ignorada{importResult.skipped !== 1 ? 's' : ''} ou com erro.
                </p>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <details className="text-left w-full">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                  Ver erros ({importResult.errors.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-rose-600">
                  {importResult.errors.slice(0, 20).map((e) => (
                    <li key={e.index}>Linha {e.index + 1}: {e.message}</li>
                  ))}
                  {importResult.errors.length > 20 && (
                    <li className="text-slate-400">… e mais {importResult.errors.length - 20}</li>
                  )}
                </ul>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={() => { onSuccess(); onClose() }}>
                <FileText className="w-4 h-4" />
                Ver transações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
