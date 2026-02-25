import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import AuthPage from '@/pages/AuthPage'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import TransactionsPage from '@/pages/TransactionsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import AccountsPage from '@/pages/AccountsPage'
import InvestmentsPage from '@/pages/InvestmentsPage'
import RecurringPage from '@/pages/RecurringPage'
import ReportsPage from '@/pages/ReportsPage'
import LiabilitiesPage from '@/pages/LiabilitiesPage'
import FinancialHealthPage from '@/pages/FinancialHealthPage'
import ForecastPage from '@/pages/ForecastPage'
import GoalsPage from '@/pages/GoalsPage'
import SettingsPage from '@/pages/SettingsPage'
import CreditCardsPage from '@/pages/CreditCardsPage'
import CreditCardDetailPage from '@/pages/CreditCardDetailPage'
import InsightsPage from '@/pages/InsightsPage'
import RulesPage from '@/pages/RulesPage'

/** Shows LandingPage to visitors; redirects authenticated users to dashboard. */
function RootRoute() {
  const { token } = useAuthStore()
  if (token) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

/** Redirects authenticated users away from auth pages. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (token) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Redirects unauthenticated users to login. */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Show a full-page spinner while the silent refresh is in progress
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<RootRoute />} />

        {/* Auth */}
        <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />

        {/* Protected app routes */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/liabilities" element={<LiabilitiesPage />} />
          <Route path="/financial-health" element={<FinancialHealthPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/credit-cards" element={<CreditCardsPage />} />
          <Route path="/credit-cards/:id" element={<CreditCardDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
