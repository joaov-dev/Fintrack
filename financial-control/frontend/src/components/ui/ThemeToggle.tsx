import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
        'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
        'dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-white/8',
        className,
      )}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  )
}
