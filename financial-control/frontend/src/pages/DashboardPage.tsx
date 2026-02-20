import { useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Loader2, AlertCircle, Scale } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useInsights } from '@/hooks/useInsights'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'
import { ExpenseChart } from '@/components/dashboard/ExpenseChart'
import { MonthlyChart } from '@/components/dashboard/MonthlyChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { AccountsWidget } from '@/components/dashboard/AccountsWidget'
import { BudgetProgress } from '@/components/dashboard/BudgetProgress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { monthLabel, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data, isLoading } = useDashboard(month, year)
  const { data: insightsData } = useInsights()
  const { user } = useAuthStore()

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Aqui está o resumo das suas finanças</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center capitalize">
            {monthLabel(month, year)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Insights & Alerts — shown when there is something actionable */}
      {insightsData && <InsightsPanel data={insightsData} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard title="Saldo do Mês" value={data.summary.balance} icon={Wallet} variant="balance" />
            <SummaryCard title="Total Receitas" value={data.summary.totalIncome} icon={TrendingUp} variant="income" />
            <SummaryCard title="Total Despesas" value={data.summary.totalExpense} icon={TrendingDown} variant="expense" />
          </div>

          {/* Net worth strip — always visible */}
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ativos</p>
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrency(data.totalBalance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Passivos</p>
                    <p className="text-sm font-semibold text-rose-600">
                      {data.totalLiabilities > 0 ? `−${formatCurrency(data.totalLiabilities)}` : formatCurrency(0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:ml-auto">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Patrimônio Líquido</p>
                    <p className={`text-sm font-bold ${data.netWorth >= 0 ? 'text-violet-700' : 'text-rose-600'}`}>
                      {formatCurrency(data.netWorth)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounts + Budgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AccountsWidget accounts={data.accounts} totalBalance={data.totalBalance} />
            <BudgetProgress budgets={data.budgets} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonthlyChart data={data.monthlyData} />
            <ExpenseChart data={data.byCategory} />
          </div>

          {/* Recent transactions */}
          <RecentTransactions transactions={data.recentTransactions} />
        </>
      ) : null}
    </div>
  )
}
