/**
 * Minimal CSV parser — no external dependencies.
 * Handles quoted fields, escaped quotes (""), CRLF/LF line endings.
 */

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = splitLine(lines[0]).map((h) => h.trim())

  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? ''
    })
    return row
  })

  return { headers, rows }
}

function splitLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  result.push(current)
  return result
}

// ─── Column auto-detection ────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  date:        ['date', 'data', 'dt', 'dia', 'data_lancamento'],
  description: ['description', 'descricao', 'descrição', 'desc', 'memo', 'historico', 'histórico', 'lancamento', 'lançamento'],
  amount:      ['amount', 'valor', 'value', 'quantia', 'montante', 'preco', 'preço'],
  type:        ['type', 'tipo', 'natureza'],
  account:     ['account', 'conta', 'account_name', 'nome_conta'],
  category:    ['category', 'categoria', 'cat', 'grupo'],
}

/** Try to auto-map CSV headers to expected field names. Returns null for unmapped fields. */
export function autoDetectMapping(headers: string[]): Record<string, string | null> {
  const lower = headers.map((h) => h.toLowerCase().trim())
  const mapping: Record<string, string | null> = {}

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = headers.find((_, i) => aliases.includes(lower[i]))
    mapping[field] = found ?? null
  }

  return mapping
}

/** Returns true when all 6 required fields are mapped */
export function isMappingComplete(mapping: Record<string, string | null>): boolean {
  const required = ['date', 'description', 'amount', 'type', 'account', 'category']
  return required.every((f) => mapping[f] != null)
}

// ─── CSV template generator ───────────────────────────────────────────────────

export function downloadCSVTemplate() {
  const header = 'date,description,amount,type,account,category'
  const rows = [
    '2024-01-05,Salário,5000.00,INCOME,Conta Corrente,Salário',
    '2024-01-10,Supermercado,350.45,EXPENSE,Conta Corrente,Alimentação',
    '2024-01-15,Aluguel,1200.00,EXPENSE,Conta Corrente,Moradia',
  ]
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'fintrack_template.csv'
  link.click()
  URL.revokeObjectURL(url)
}
