import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Settings, LogOut, ShieldCheck, RefreshCw } from 'lucide-react'
import { useAdminAuthStore } from '../../store/adminAuth.store'

const links = [
  { to: '/admin',                     label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/admin/users',               label: 'Usuários',       icon: Users },
  { to: '/admin/abandoned-checkouts', label: 'Recuperação',   icon: RefreshCw },
  { to: '/admin/settings',            label: 'Configurações', icon: Settings },
]

export function AdminSidebar() {
  const { admin, logout } = useAdminAuthStore()

  const initials = admin?.username
    ? admin.username.slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <aside
      className="w-[220px] min-h-screen flex flex-col border-r border-white/[0.06]"
      style={{ background: '#0a0b0f' }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white text-sm font-semibold tracking-tight">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">
          Menu
        </p>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group ${
                isActive
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-300'}`} />
                {label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-violet-700/30 border border-violet-500/30 flex items-center justify-center text-[11px] font-bold text-violet-300 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{admin?.username}</p>
            <p className="text-[10px] text-slate-600">{admin?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all border border-transparent"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
