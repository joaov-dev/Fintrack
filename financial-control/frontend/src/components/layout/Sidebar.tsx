import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  TrendingUp, LayoutDashboard, ArrowLeftRight, Tag, Landmark,
  LogOut, X, BarChart3, Repeat2, FileBarChart, AlertCircle, HeartPulse,
  CalendarClock, Target, Settings, ChevronDown, CreditCard, Lightbulb, Wand2,
  Crown, Receipt, Lock,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'
import { useEntitlements } from '@/hooks/useBilling'
import type { FeatureKey } from '@/types'

const navGroups = [
  {
    label: 'Visão Geral',
    items: [
      { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/insights',         icon: Lightbulb,       label: 'Insights',          feature: 'INSIGHTS'          as FeatureKey },
      { to: '/financial-health', icon: HeartPulse,      label: 'Saúde Financeira',  feature: 'FINANCIAL_HEALTH'  as FeatureKey },
      { to: '/reports',          icon: FileBarChart,    label: 'Relatórios',        feature: 'REPORTS_ADVANCED'  as FeatureKey },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { to: '/forecast', icon: CalendarClock, label: 'Fluxo Mensal', feature: 'FORECAST' as FeatureKey },
      { to: '/goals',    icon: Target,        label: 'Metas',        feature: 'GOALS'    as FeatureKey },
    ],
  },
  {
    label: 'Finanças',
    items: [
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
      { to: '/recurring',    icon: Repeat2,        label: 'Recorrências', feature: 'RECURRING_TRANSACTIONS' as FeatureKey },
      { to: '/accounts',     icon: Landmark,       label: 'Contas' },
      { to: '/credit-cards', icon: CreditCard,     label: 'Cartões',      feature: 'CREDIT_CARDS'           as FeatureKey },
    ],
  },
  {
    label: 'Patrimônio',
    items: [
      { to: '/investments', icon: BarChart3,   label: 'Investimentos', feature: 'INVESTMENTS_ADVANCED' as FeatureKey },
      { to: '/liabilities', icon: AlertCircle, label: 'Passivos',      feature: 'LIABILITIES'          as FeatureKey },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/categories', icon: Tag,      label: 'Categorias' },
      { to: '/rules',      icon: Wand2,    label: 'Regras Auto', feature: 'RULES_AUTOCATEGORIZATION' as FeatureKey },
      { to: '/settings',   icon: Settings, label: 'Minha Conta' },
      { to: '/upgrade',    icon: Crown,    label: 'Upgrade' },
      { to: '/billing',    icon: Receipt,  label: 'Assinatura' },
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
  const [isDesktop, setIsDesktop] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const { data: entitlements } = useEntitlements()

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleGroup = (label: string) => {
    if (!isDesktop) return
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isLocked = (feature?: FeatureKey) => {
    if (!feature || !entitlements) return false
    return !entitlements.features[feature]?.enabled
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
          'fixed left-0 top-0 z-30 h-full w-64 flex flex-col transition-transform duration-300 ease-in-out',
          'bg-white/90 dark:bg-[#0F0F14]/80 backdrop-blur-2xl',
          'border-r border-black/[0.08] dark:border-white/[0.08]',
          'shadow-[4px_0_32px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_32px_rgba(0,0,0,0.4)]',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-black/[0.07] dark:border-white/[0.07]">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm dark:shadow-black/30">
            <TrendingUp className="w-4 h-4 text-white dark:text-primary-foreground" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">DominaHub</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {navGroups.map((group) => {
              const isCollapsed = isDesktop && collapsed.has(group.label)
              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      'flex items-center w-full px-3 mb-1 gap-1',
                      isDesktop ? 'cursor-pointer group' : 'cursor-default',
                    )}
                  >
                    <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                      {group.label}
                    </span>
                    {isDesktop && (
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 text-slate-400 transition-transform duration-200',
                          isCollapsed && 'rotate-180',
                        )}
                      />
                    )}
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-in-out',
                      isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
                    )}
                  >
                    <div className="overflow-hidden space-y-0.5">
                      {group.items.map(({ to, icon: Icon, label, feature }) => {
                        const locked = isLocked(feature)
                        return (
                          <NavLink
                            key={to}
                            to={to}
                            end={to === '/dashboard'}
                            onClick={onClose}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                isActive
                                  ? locked
                                    ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600'
                                    : 'bg-primary/10 text-primary'
                                  : locked
                                  ? 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-100',
                              )
                            }
                          >
                            <Icon className={cn('w-4 h-4 shrink-0', locked && 'opacity-60')} />
                            <span className={cn('flex-1 truncate', locked && 'opacity-70')}>
                              {label}
                            </span>
                            {locked && (
                              <Lock className="w-3 h-3 shrink-0 opacity-50" />
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-black/[0.07] dark:border-white/[0.07]">
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
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
