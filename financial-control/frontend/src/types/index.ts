export type CategoryType = 'INCOME' | 'EXPENSE'
export type TransactionType = 'INCOME' | 'EXPENSE'
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'CASH'
export type RecurrenceType = 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type InvestmentPositionType = 'STOCK' | 'FUND' | 'FIXED_INCOME' | 'REAL_ESTATE' | 'CRYPTO' | 'OTHER'
export type LiabilityType = 'LOAN' | 'FINANCING' | 'CREDIT_CARD' | 'OTHER'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  createdAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  type: AccountType
  color: string
  initialBalance: number
  balance: number
  createdAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  type: CategoryType
  color: string
  icon: string
  isDefault: boolean
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string
  amount: number
  spent: number
  remaining: number
  percentage: number
}

export interface Transaction {
  id: string
  userId: string
  categoryId: string
  accountId: string | null
  type: TransactionType
  amount: number
  description: string
  date: string
  notes?: string | null
  isRecurring: boolean
  recurrenceType?: RecurrenceType | null
  recurrenceEnd?: string | null
  parentId?: string | null
  transferId?: string | null
  positionId?: string | null
  createdAt: string
  category: Category
  account: Account | null
}

export interface InvestmentPosition {
  id: string
  userId: string
  accountId: string
  name: string
  ticker: string | null
  type: InvestmentPositionType
  quantity: number | null
  avgPrice: number | null
  currentValue: number
  notes: string | null
  totalYields: number
  transactions: Pick<Transaction, 'id' | 'amount' | 'date' | 'description' | 'type'>[]
  createdAt: string
  updatedAt: string
}

export interface TransferResult {
  from: Transaction
  to: Transaction
  transferId: string
}

export interface Liability {
  id: string
  userId: string
  name: string
  type: LiabilityType
  currentBalance: number
  installments: number | null
  interestRate: number | null
  dueDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardSummary {
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface CategoryExpense {
  name: string
  color: string
  amount: number
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export interface DashboardData {
  summary: DashboardSummary
  byCategory: CategoryExpense[]
  monthlyData: MonthlyData[]
  recentTransactions: Transaction[]
  accounts: Account[]
  totalBalance: number
  totalLiabilities: number
  netWorth: number
  budgets: Budget[]
}

export interface NetWorthSnapshot {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  byAccountType: Partial<Record<AccountType, number>>
  byLiabilityType: Partial<Record<LiabilityType, number>>
}

export interface NetWorthPoint {
  month: string
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Poupança',
  CREDIT: 'Cartão de Crédito',
  INVESTMENT: 'Investimentos',
  CASH: 'Dinheiro',
}

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
}

export const INVESTMENT_POSITION_TYPE_LABELS: Record<InvestmentPositionType, string> = {
  STOCK: 'Ações',
  FUND: 'Fundos',
  FIXED_INCOME: 'Renda Fixa',
  REAL_ESTATE: 'FIIs',
  CRYPTO: 'Cripto',
  OTHER: 'Outros',
}

export const INVESTMENT_POSITION_TYPE_COLORS: Record<InvestmentPositionType, string> = {
  STOCK: 'bg-violet-100 text-violet-700',
  FUND: 'bg-blue-100 text-blue-700',
  FIXED_INCOME: 'bg-emerald-100 text-emerald-700',
  REAL_ESTATE: 'bg-amber-100 text-amber-700',
  CRYPTO: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-slate-100 text-slate-600',
}

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  LOAN: 'Empréstimo',
  FINANCING: 'Financiamento',
  CREDIT_CARD: 'Cartão de Crédito',
  OTHER: 'Outros',
}

export const LIABILITY_TYPE_COLORS: Record<LiabilityType, string> = {
  LOAN: 'bg-rose-100 text-rose-700',
  FINANCING: 'bg-orange-100 text-orange-700',
  CREDIT_CARD: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-slate-100 text-slate-600',
}

// ─── Financial Health ─────────────────────────────────────────────────────────

export interface FinancialHealthPillar {
  /** Raw computed value (ratio or months) */
  value: number
  /** Discrete score: 0, 25, 50, 75, or 100 */
  score: number
}

export interface FinancialHealthData {
  /** 0–100 weighted average */
  score: number
  /** 'Crítica' | 'Atenção' | 'Saudável' | 'Excelente' */
  classification: string
  /** False when there is no transaction/account/liability data to evaluate */
  hasEnoughData: boolean
  pillars: {
    savingsRate: FinancialHealthPillar
    incomeCommitment: FinancialHealthPillar
    creditDependency: FinancialHealthPillar
    emergencyReserve: FinancialHealthPillar
  }
}

// ─── Insights & Alerts ────────────────────────────────────────────────────────

export type InsightSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  message: string
  suggestedAction: string
  dataContext?: Record<string, unknown>
}

export interface InsightsAlerts {
  budgetExceeded: boolean
  overdueLiabilities: number
  negativeBalanceProjection: boolean
}

export interface InsightsResponse {
  insights: Insight[]
  alerts: InsightsAlerts
  /** False when the user has no financial activity to evaluate */
  hasEnoughData: boolean
  evaluatedAt: string
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

/** One row as resolved by the frontend (accounts/categories matched to IDs) */
export interface ImportRowPayload {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  accountId: string
  categoryId: string
  notes?: string
}

/** Backend response after processing the import */
export interface ImportResult {
  imported: number
  skipped: number
  errors: { index: number; message: string }[]
}

// ─── Monthly Projection ───────────────────────────────────────────────────────

export interface CalendarDayEvent {
  label: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  isLiability: boolean
}

export interface CalendarDay {
  date: string
  isPast: boolean
  isToday: boolean
  events: CalendarDayEvent[]
  netFlow: number
}

export interface MonthlyProjection {
  expectedBalance: number
  projectedIncome: number
  projectedExpense: number
  fixedExpenses: number
  variableExpenses: number
  dailyVariableAvg: number
  daysRemaining: number
  calendarDays: CalendarDay[]
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export type GoalStatus = 'ON_TRACK' | 'BEHIND' | 'VERY_BEHIND' | 'COMPLETED'

export interface Goal {
  id: string
  userId: string
  name: string
  targetAmount: number
  targetDate: string | null
  linkedAccountId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface GoalProgress extends Goal {
  currentAmount: number
  progress: number
  estimatedCompletion: string | null
  monthlyContribution: number
  status: GoalStatus
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

/** Client-side representation of one parsed CSV row during preview */
export interface ImportPreviewRow {
  /** Stable row identifier for React key */
  _id: string
  /** Raw values from the CSV (after column mapping) */
  date: string
  description: string
  amount: string
  type: string
  accountName: string
  categoryName: string
  /** Resolved IDs (null = not matched) */
  accountId: string | null
  categoryId: string | null
  /** Validation errors for this row */
  errors: string[]
  /** Whether the user has toggled this row to be excluded */
  ignored: boolean
  /** Overrides applied by the user in the preview step */
  overrideType?: 'INCOME' | 'EXPENSE'
  overrideAccountId?: string
  overrideCategoryId?: string
}
