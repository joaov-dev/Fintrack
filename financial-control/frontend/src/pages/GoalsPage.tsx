import { useState } from 'react'
import { Plus, Target, Pencil, Trash2, Loader2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GoalModal } from '@/components/goals/GoalModal'
import { useGoals } from '@/hooks/useGoals'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/use-toast'
import { GoalProgress, GoalStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GoalStatus, { label: string; badge: string; bar: string }> = {
  COMPLETED:  { label: 'Concluída',    badge: 'bg-violet-100 text-violet-700',  bar: 'bg-violet-500' },
  ON_TRACK:   { label: 'No prazo',     badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  BEHIND:     { label: 'Atrasada',     badge: 'bg-amber-100 text-amber-700',    bar: 'bg-amber-500' },
  VERY_BEHIND:{ label: 'Muito atrasada', badge: 'bg-rose-100 text-rose-700',     bar: 'bg-rose-500' },
}

function formatMonthYear(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${MONTHS[month - 1]} ${year}`
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

// ─── Goal card ─────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: GoalProgress
  onEdit: () => void
  onDelete: () => void
}

function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const cfg = STATUS_CONFIG[goal.status]
  const pct = Math.round(goal.progress * 100)

  const projectionText = (() => {
    if (goal.status === 'COMPLETED') return 'Meta atingida!'
    if (!goal.linkedAccountId) return 'Vincule uma conta para acompanhar o progresso automaticamente.'
    if (!goal.estimatedCompletion) return 'Sem aportes recentes — a meta não será atingida no ritmo atual.'
    const eta = formatMonthYear(goal.estimatedCompletion)
    if (!goal.targetDate) return `Nesse ritmo você chega em ${eta}.`
    const onTrack = goal.status === 'ON_TRACK'
    return onTrack
      ? `No prazo — estimativa de conclusão: ${eta}.`
      : `Atrasada — nesse ritmo você só chegaria em ${eta}.`
  })()

  return (
    <Card className="border-slate-200 group">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{goal.name}</p>
            {goal.targetDate && (
              <p className="text-xs text-slate-400 mt-0.5">Prazo: {formatDate(goal.targetDate)}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', cfg.badge)}>
              {cfg.label}
            </span>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary" onClick={onEdit}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-600" onClick={onDelete}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Amount progress */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(goal.currentAmount)}</span>
            <span className="text-sm text-slate-400">de {formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', cfg.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{pct}% concluído</p>
        </div>

        {/* Monthly contribution */}
        {goal.monthlyContribution > 0 && goal.status !== 'COMPLETED' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Aporte médio mensal: <span className="font-medium text-slate-600">{formatCurrency(goal.monthlyContribution)}</span></span>
          </div>
        )}

        {/* Projection text */}
        <p className={cn(
          'text-xs',
          goal.status === 'COMPLETED'    ? 'text-violet-600 font-medium' :
          goal.status === 'ON_TRACK'     ? 'text-emerald-600' :
          goal.status === 'BEHIND'       ? 'text-amber-600' :
          'text-rose-600',
        )}>
          {projectionText}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GoalProgress | null>(null)

  const { toast } = useToast()
  const { goals, isLoading, create, update, remove } = useGoals()
  const { accounts } = useAccounts()

  const handleSave = async (data: unknown) => {
    try {
      if (editing) {
        await update(editing.id, data)
        toast({ title: 'Meta atualizada' })
      } else {
        await create(data)
        toast({ title: 'Meta criada' })
      }
    } catch {
      toast({ title: 'Erro ao salvar meta', variant: 'destructive' })
      throw new Error('save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmar exclusão da meta?')) return
    try {
      await remove(id)
      toast({ title: 'Meta excluída' })
    } catch {
      toast({ title: 'Erro ao excluir meta', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Metas Financeiras</h1>
          <p className="text-slate-500 text-sm mt-0.5">Defina objetivos e acompanhe o progresso automaticamente</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <Target className="w-7 h-7 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-700 font-semibold">Nenhuma meta criada</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Crie uma meta financeira e vincule a uma conta para acompanhar o progresso automaticamente.
              </p>
            </div>
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="w-4 h-4" /> Criar primeira meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => { setEditing(goal); setModalOpen(true) }}
              onDelete={() => handleDelete(goal.id)}
            />
          ))}
        </div>
      )}

      <GoalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        goal={editing}
        accounts={accounts}
      />
    </div>
  )
}
