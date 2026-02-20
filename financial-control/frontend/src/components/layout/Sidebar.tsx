import { NavLink, useNavigate } from 'react-router-dom'
import {
  TrendingUp, LayoutDashboard, ArrowLeftRight, Tag, Landmark,
  LogOut, X, BarChart3, Repeat2, FileBarChart, AlertCircle, HeartPulse,
  CalendarClock, Target, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

const navGroups = [
  {
    label: 'Visão Geral',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/financial-health', icon: HeartPulse, label: 'Saúde Financeira' },
      { to: '/reports', icon: FileBarChart, label: 'Relatórios' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { to: '/forecast', icon: CalendarClock, label: 'Previsão' },
      { to: '/goals',    icon: Target,        label: 'Metas' },
    ],
  },
  {
    label: 'Finanças',
    items: [
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
      { to: '/recurring', icon: Repeat2, label: 'Recorrências' },
      { to: '/accounts', icon: Landmark, label: 'Contas' },
    ],
  },
  {
    label: 'Patrimônio',
    items: [
      { to: '/investments', icon: BarChart3, label: 'Investimentos' },
      { to: '/liabilities', icon: AlertCircle, label: 'Passivos' },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/categories', icon: Tag, label: 'Categorias' },
      { to: '/settings',   icon: Settings, label: 'Minha Conta' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm dark:shadow-primary/20">
            <TrendingUp className="w-4 h-4 text-white dark:text-primary-foreground" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Fintrack</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
