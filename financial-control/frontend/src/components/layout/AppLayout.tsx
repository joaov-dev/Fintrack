import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { PromoModal } from '@/components/PromoModal'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Ambient glass orbs — very subtle depth for backdrop-filter ── */}
      <div className="fixed inset-0 pointer-events-none z-[1] dark:block hidden">
        <div
          className="absolute -top-40 -right-20 w-[680px] h-[680px] rounded-full blur-[140px]"
          style={{ background: 'hsl(var(--primary) / 0.025)' }}
        />
        <div
          className="absolute -bottom-40 -left-20 w-[580px] h-[580px] rounded-full blur-[130px]"
          style={{ background: 'hsl(var(--warning) / 0.02)' }}
        />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-[2] flex-1 flex flex-col overflow-hidden">
        {/* Mobile header — glass */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b
          bg-white/80 dark:bg-[#0F0F14]/75 backdrop-blur-xl
          border-black/[0.08] dark:border-white/[0.08]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-slate-900">DominaHub</span>
          <ThemeToggle className="ml-auto" />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <PromoModal />
    </div>
  )
}
