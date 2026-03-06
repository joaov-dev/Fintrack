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
import PricingPage from '@/pages/PricingPage'
import BillingPage from '@/pages/BillingPage'
import UpgradePage from '@/pages/UpgradePage'
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage'
import CheckoutCanceledPage from '@/pages/CheckoutCanceledPage'
import { FeatureRoute } from '@/components/billing/FeatureRoute'
import AdminApp from '@/admin/AdminApp'

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
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/canceled" element={<CheckoutCanceledPage />} />

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
          <Route path="/recurring" element={<FeatureRoute feature="RECURRING_TRANSACTIONS"><RecurringPage /></FeatureRoute>} />
          <Route path="/reports" element={<FeatureRoute feature="REPORTS_ADVANCED"><ReportsPage /></FeatureRoute>} />
          <Route path="/liabilities" element={<FeatureRoute feature="LIABILITIES"><LiabilitiesPage /></FeatureRoute>} />
          <Route path="/financial-health" element={<FeatureRoute feature="FINANCIAL_HEALTH"><FinancialHealthPage /></FeatureRoute>} />
          <Route path="/forecast" element={<FeatureRoute feature="FORECAST"><ForecastPage /></FeatureRoute>} />
          <Route path="/goals" element={<FeatureRoute feature="GOALS"><GoalsPage /></FeatureRoute>} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/credit-cards" element={<FeatureRoute feature="CREDIT_CARDS"><CreditCardsPage /></FeatureRoute>} />
          <Route path="/credit-cards/:id" element={<FeatureRoute feature="CREDIT_CARDS"><CreditCardDetailPage /></FeatureRoute>} />
          <Route path="/insights" element={<FeatureRoute feature="INSIGHTS"><InsightsPage /></FeatureRoute>} />
          <Route path="/rules" element={<FeatureRoute feature="RULES_AUTOCATEGORIZATION"><RulesPage /></FeatureRoute>} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/investments" element={<FeatureRoute feature="INVESTMENTS_ADVANCED"><InvestmentsPage /></FeatureRoute>} />
        </Route>

        {/* Admin panel — isolated, no link from main Sidebar */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
