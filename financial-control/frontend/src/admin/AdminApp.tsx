import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAdminAuthStore } from './store/adminAuth.store'
import { AdminLayout } from './components/layout/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminUserDetailPage from './pages/AdminUserDetailPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminAbandonedCheckoutsPage from './pages/AdminAbandonedCheckoutsPage'

/** Guard: redirects to /admin/login if not authenticated. */
function AdminPrivateRoute({ children }: { children: React.ReactNode }) {
  const { admin, isInitialized } = useAdminAuthStore()

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!admin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

export default function AdminApp() {
  const { fetchMe } = useAdminAuthStore()

  // Verify session on mount (reads admin_session cookie server-side)
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <Routes>
      {/* Public */}
      <Route path="login" element={<AdminLoginPage />} />

      {/* Protected */}
      <Route
        element={
          <AdminPrivateRoute>
            <AdminLayout />
          </AdminPrivateRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="abandoned-checkouts" element={<AdminAbandonedCheckoutsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Fallback inside /admin/* */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
