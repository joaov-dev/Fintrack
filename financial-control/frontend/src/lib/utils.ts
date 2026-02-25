import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatter config singleton ─────────────────────────────────────────────────
// Mutated by auth.store whenever user data loads. All formatters below read from
// this object so the 30+ call sites across the app need zero changes.

interface FormatterConfig {
  locale: string
  currency: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
}

let _config: FormatterConfig = {
  locale: 'pt-BR',
  currency: 'BRL',
  dateFormat: 'DD/MM/YYYY',
}

export function setFormatterConfig(patch: Partial<FormatterConfig>): void {
  _config = { ..._config, ...patch }
}

// ── Formatters ─────────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(_config.locale, {
    style: 'currency',
    currency: _config.currency,
  }).format(value)
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = String(d.getFullYear())

  switch (_config.dateFormat) {
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`
    case 'DD/MM/YYYY':
    default:           return `${day}/${month}/${year}`
  }
}

export function getMonthYear(date?: Date) {
  const d = date || new Date()
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString(_config.locale, {
    month: 'long',
    year: 'numeric',
  })
}
