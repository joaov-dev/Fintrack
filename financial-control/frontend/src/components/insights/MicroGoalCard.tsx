import { Target, Pencil, Trash2 } from 'lucide-react'
import { MicroGoal, MicroGoalStatus } from '@/types'

const STATUS_STYLES: Record<MicroGoalStatus, { badge: string; bar: string; label: string }> = {
  ON_TRACK:  { badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500', label: 'Em dia' },
  AT_RISK:   { badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',         bar: 'bg-amber-500',   label: 'Em risco' },
  BREACHED:  { badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',             bar: 'bg-rose-500',    label: 'Ultrapassada' },
  COMPLETED: { badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',            bar: 'bg-slate-400',   label: 'Concluída' },
}

interface MicroGoalCardProps {
  goal: MicroGoal
  categoryName?: string
  onEdit: (goal: MicroGoal) => void
  onDelete: (id: string) => void
}

export function MicroGoalCard({ goal, categoryName, onEdit, onDelete }: MicroGoalCardProps) {
  const styles = STATUS_STYLES[goal.status]
  const progress = goal.limitAmount > 0 ? Math.min(goal.currentAmount / goal.limitAmount, 1) : 0
  const expectedProgress = goal.limitAmount > 0 ? Math.min(goal.expectedPace / goal.limitAmount, 1) : 0

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{goal.name}</p>
            {categoryName && (
              <p className="text-[11px] text-muted-foreground">{categoryName}</p>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${styles.badge}`}>
          {styles.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{fmt(goal.currentAmount)}</span>
          <span>limite {fmt(goal.limitAmount)}</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          {/* Expected pace marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400/60 dark:bg-slate-500/60 z-10"
            style={{ left: `${expectedProgress * 100}%` }}
            title={`Ritmo esperado: ${fmt(goal.expectedPace)}`}
          />
          {/* Actual progress */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Ritmo esperado: {fmt(goal.expectedPace)}</span>
          <span>{formatDate(goal.startDate)} – {formatDate(goal.endDate)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1 pt-0.5">
        <button
          onClick={() => onEdit(goal)}
          className="p-1.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="p-1.5 rounded text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
