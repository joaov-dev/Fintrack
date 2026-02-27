export type CategoryType = 'INCOME' | 'EXPENSE'
export type TransactionType = 'INCOME' | 'EXPENSE'
export type PaymentMethod = 'CASH' | 'DEBIT' | 'PIX' | 'CREDIT_CARD' | 'TRANSFER'
export type CardStatementStatus = 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE'
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'CASH'
export type RecurrenceType = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LAST_DAY' | 'BUSINESS_DAYS'
export type InvestmentPositionType = 'STOCK' | 'FUND' | 'FIXED_INCOME' | 'REAL_ESTATE' | 'CRYPTO' | 'OTHER'
export type InvestmentMovementType = 'CONTRIBUTION' | 'WITHDRAWAL' | 'DIVIDEND' | 'JCP' | 'INTEREST' | 'BONUS' | 'SPLIT'
export type LiabilityType = 'LOAN' | 'FINANCING' | 'CREDIT_CARD' | 'OTHER'
export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  createdAt: string
  mfaEnabled?: boolean
  // Financial preferences
  currency?: string
  locale?: string
  timezone?: string
  dateFormat?: string
  closingDay?: number
  // Notification preferences
  notifBudget?: boolean
  notifGoals?: boolean
  notifDue?: boolean
  notifInsights?: boolean
  emailBudget?: boolean
  emailGoals?: boolean
  emailDue?: boolean
  emailInsights?: boolean
}

export interface Session {
  id: string
  deviceName: string | null
  ipAddress: string | null
  createdAt: string
  lastUsedAt: string
  isCurrent: boolean
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
  parentId?: string | null
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

export interface Tag {
  id: string
  name: string
}

export interface TransactionAttachment {
  id: string
  transactionId: string
  filename: string
  mimeType: string
  size: number
  dataUrl?: string   // present only when fetched via GET .../attachments/:aid
  createdAt: string
}

export interface CategorizationRule {
  id: string
  userId: string
  name: string
  pattern: string
  matchType: 'CONTAINS' | 'STARTS_WITH' | 'EQUALS'
  categoryId: string
  accountId: string | null
  isActive: boolean
  priority: number
  appliedCount: number
  createdAt: string
  updatedAt: string
  category: Pick<Category, 'id' | 'name' | 'color' | 'type'>
  account:  Pick<Account, 'id' | 'name'> | null
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
  paymentMethod?: PaymentMethod | null
  creditCardId?: string | null
  statementId?: string | null
  isCardPayment?: boolean
  installmentPlanId?: string | null
  installmentNumber?: number | null
  splitId?: string | null
  isPaused?: boolean
  isSkipped?: boolean
  createdAt: string
  category: Category
  account: Account | null
  tags: Tag[]
  attachments: Pick<TransactionAttachment, 'id' | 'filename' | 'mimeType' | 'size'>[]
}

export interface InvestmentMovement {
  id: string
  positionId: string
  userId: string
  type: InvestmentMovementType
  amount: number
  quantity: number | null
  unitPrice: number | null
  date: string
  description: string | null
  createdAt: string
  position?: { name: string; ticker: string | null; type: InvestmentPositionType; accountId?: string }
}

export interface AllocationTarget {
  id: string
  userId: string
  type: InvestmentPositionType
  targetPct: number
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
  // Legacy
  totalYields: number
  transactions: Pick<Transaction, 'id' | 'amount' | 'date' | 'description' | 'type'>[]
  // New
  movements: InvestmentMovement[]
  totalContributions: number
  totalWithdrawals: number
  totalIncome: number
  costBasis: number
  unrealizedGain: number
  unrealizedGainPct: number
  realizedGain: number
  totalPnL: number
  totalReturnPct: number
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

export interface LiabilityPayment {
  id: string
  liabilityId: string
  installmentsPaid: number | null
  grossAmount: number
  discountType: DiscountType | null
  discountValue: number | null
  discountAmount: number
  paidAmount: number
  accountId: string | null
  categoryId: string | null
  transactionId: string | null
  notes: string | null
  paidAt: string
  createdAt: string
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

export interface CreditCard {
  id: string
  userId: string
  name: string
  brand: string | null
  creditLimit: number
  statementClosingDay: number
  dueDay: number
  color: string
  isArchived: boolean
  openBalance: number
  availableLimit: number
  utilizationPercent: number
  nextDueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CardStatement {
  id: string
  cardId: string
  userId: string
  periodStart: string
  periodEnd: string
  closingDate: string
  dueDate: string
  status: CardStatementStatus
  totalSpent: number
  totalPaid: number
  openBalance: number
  createdAt: string
}

export interface CardStatementDetail extends CardStatement {
  transactions: Transaction[]
  payments: Transaction[]
}

export interface CreditCardSummary {
  totalOpenBalance: number
  totalCreditLimit: number
  totalAvailableLimit: number
  nextDueStatement: { cardName: string; dueDate: string; openBalance: number } | null
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
  creditCards: CreditCardSummary | null
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
  WEEKLY:        'Semanal',
  MONTHLY:       'Mensal',
  YEARLY:        'Anual',
  LAST_DAY:      'Último dia do mês',
  BUSINESS_DAYS: '1º dia útil do mês',
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

// Hex colors for charts (recharts)
export const INVESTMENT_TYPE_HEX: Record<InvestmentPositionType, string> = {
  STOCK:        '#7c3aed',
  FUND:         '#2563eb',
  FIXED_INCOME: '#059669',
  REAL_ESTATE:  '#d97706',
  CRYPTO:       '#ea580c',
  OTHER:        '#64748b',
}

export const INVESTMENT_MOVEMENT_TYPE_LABELS: Record<InvestmentMovementType, string> = {
  CONTRIBUTION: 'Aporte',
  WITHDRAWAL:   'Resgate',
  DIVIDEND:     'Dividendo',
  JCP:          'JCP',
  INTEREST:     'Rendimento',
  BONUS:        'Bonificação',
  SPLIT:        'Desdobramento',
}

export const INVESTMENT_MOVEMENT_TYPE_COLORS: Record<InvestmentMovementType, string> = {
  CONTRIBUTION: 'bg-blue-100 text-blue-700',
  WITHDRAWAL:   'bg-rose-100 text-rose-700',
  DIVIDEND:     'bg-emerald-100 text-emerald-700',
  JCP:          'bg-teal-100 text-teal-700',
  INTEREST:     'bg-green-100 text-green-700',
  BONUS:        'bg-purple-100 text-purple-700',
  SPLIT:        'bg-amber-100 text-amber-700',
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

/** 'up' always means the metric improved from the user's perspective */
export type PillarTrend = 'up' | 'down' | 'stable' | 'unknown'

export interface FinancialHealthPillar {
  /** Raw computed value (ratio or months) */
  value: number
  /** Discrete score: 0, 25, 50, 75, or 100 */
  score: number
  /** Trend vs. the previous 3-month period */
  trend: PillarTrend
  /** Previous period value for delta display, null if no prior data */
  previousValue: number | null
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

export type InsightStatus = 'ACTIVE' | 'DISMISSED' | 'SNOOZED' | 'RESOLVED'

export type InsightType =
  | 'OUTLIER_SPEND'
  | 'NEW_SUBSCRIPTION'
  | 'CATEGORY_SPIKE'
  | 'DUE_PAYMENT'
  | 'BUDGET_AT_RISK'
  | 'MICRO_GOAL_AT_RISK'
  | 'MICRO_GOAL_BREACHED'
  | 'NEGATIVE_CASHFLOW'
  | 'HIGH_FIXED_COSTS'
  | 'STAGNANT_NET_WORTH'
  | 'LOW_EMERGENCY_RESERVE'
  | 'HIGH_CREDIT_DEPENDENCY'
  | 'HIGH_CC_UTILIZATION'

export interface InsightCTA {
  label: string
  route: string
  params?: Record<string, string>
}

export interface Insight {
  id: string
  type: InsightType
  severity: InsightSeverity
  status: InsightStatus
  title: string
  message: string
  explanation?: string | null
  suggestedAction: string
  cta?: InsightCTA | null
  dataContext?: Record<string, unknown>
  snoozedUntil?: string | null
  createdAt: string
}

export type MicroGoalStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED'
export type MicroGoalScopeType = 'CATEGORY' | 'TOTAL_SPEND'

export interface MicroGoal {
  id: string
  userId: string
  name: string
  scopeType: MicroGoalScopeType
  scopeRefId: string | null
  limitAmount: number
  startDate: string
  endDate: string
  status: MicroGoalStatus
  currentAmount: number
  expectedPace: number
  createdAt: string
}

export interface InsightsAlerts {
  budgetExceeded: boolean
  overdueLiabilities: number
  negativeBalanceProjection: boolean
}

export interface InsightsResponse {
  insights: Insight[]
  microGoals: MicroGoal[]
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

export interface ProjectionItem {
  label: string
  amount: number
}

export interface ForecastPremise {
  label: string
  included: boolean
}

export interface ForecastScenario {
  id: 'optimistic' | 'base' | 'conservative'
  name: string
  description: string
  projectedIncome: number
  projectedExpense: number
  expectedBalance: number
  premises: ForecastPremise[]
}

export interface AccountProjection {
  accountId: string
  accountName: string
  accountColor: string
  currentBalance: number
  futureInflow: number
  futureOutflow: number
  projectedBalance: number
}

export interface MonthlyProjection {
  expectedBalance: number
  projectedIncome: number
  projectedExpense: number
  fixedExpenses: number
  variableExpenses: number
  dailyVariableAvg: number
  daysRemaining: number
  // Scenario fields
  confirmedIncome: number
  confirmedExpense: number
  estimatedVariableExpense: number
  scenarios: ForecastScenario[]
  accountProjections: AccountProjection[]
  calendarDays: CalendarDay[]
  incomeBreakdown: {
    realizedItems: ProjectionItem[]
    recurringItems: ProjectionItem[]
  }
  expenseBreakdown: {
    fixedRealizedItems: ProjectionItem[]
    recurringItems: ProjectionItem[]
    liabilityItems: ProjectionItem[]
    ccItems: ProjectionItem[]
  }
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
  /** True when a matching transaction already exists in the database */
  isDuplicate?: boolean
}
