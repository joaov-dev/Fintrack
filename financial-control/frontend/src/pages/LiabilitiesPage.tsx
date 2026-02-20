import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertCircle, Calendar, Percent, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LiabilityModal } from '@/components/liabilities/LiabilityModal'
import { useLiabilities } from '@/hooks/useLiabilities'
import { useToast } from '@/hooks/use-toast'
import { Liability, LIABILITY_TYPE_LABELS, LIABILITY_TYPE_COLORS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function LiabilitiesPage() {
  const { liabilities, isLoading, create, update, remove } = useLiabilities()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Liability | null>(null)
  const { toast } = useToast()

  const totalLiabilities = liabilities.reduce((s, l) => s + l.currentBalance, 0)

  const handleSave = async (data: unknown) => {
    try {
      if (editing) {
        await update(editing.id, data)
        toast({ title: 'Passivo atualizado' })
      } else {
        await create(data)
        toast({ title: 'Passivo adicionado' })
      }
    } catch {
      toast({ title: 'Erro ao salvar passivo', variant: 'destructive' })
    }
  }

  const handleDelete = async (liability: Liability) => {
    if (!confirm(`Excluir "${liability.name}"?`)) return
    try {
      await remove(liability.id)
      toast({ title: 'Passivo excluído' })
    } catch {
      toast({ title: 'Erro ao excluir passivo', variant: 'destructive' })
    }
  }

  const openEdit = (liability: Liability) => {
    setEditing(liability)
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Passivos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dívidas e obrigações financeiras</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Passivo
        </Button>
      </div>

      {/* Summary card */}
      <Card className="border-rose-100 bg-rose-50">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-rose-600 font-medium">Total de Passivos</p>
                <p className="text-2xl font-bold text-rose-700">{formatCurrency(totalLiabilities)}</p>
              </div>
            </div>
            <p className="text-xs text-rose-400">{liabilities.length} {liabilities.length === 1 ? 'passivo' : 'passivos'}</p>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : liabilities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Nenhum passivo cadastrado</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Registre suas dívidas e financiamentos para calcular seu patrimônio líquido</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar primeiro passivo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liabilities.map((liability) => (
            <LiabilityCard
              key={liability.id}
              liability={liability}
              onEdit={() => openEdit(liability)}
              onDelete={() => handleDelete(liability)}
            />
          ))}
        </div>
      )}

      <LiabilityModal
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        liability={editing}
      />
    </div>
  )
}

function LiabilityCard({
  liability,
  onEdit,
  onDelete,
}: {
  liability: Liability
  onEdit: () => void
  onDelete: () => void
}) {
  const isOverdue = liability.dueDate && new Date(liability.dueDate) < new Date()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', LIABILITY_TYPE_COLORS[liability.type])}>
                {LIABILITY_TYPE_LABELS[liability.type]}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 truncate">{liability.name}</h3>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-2xl font-bold text-rose-600 mb-3">
          {formatCurrency(liability.currentBalance)}
        </p>

        <div className="space-y-1.5">
          {liability.installments != null ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CreditCard className="w-3 h-3" />
              <span>
                {liability.installments}× de{' '}
                <span className="font-semibold text-slate-700">
                  {formatCurrency(liability.currentBalance / liability.installments)}
                </span>
                /mês
              </span>
            </div>
          ) : liability.interestRate != null ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Percent className="w-3 h-3" />
              <span>{(liability.interestRate * 100).toFixed(2)}% ao mês</span>
            </div>
          ) : null}
          {liability.dueDate && (
            <div className={cn('flex items-center gap-1.5 text-xs', isOverdue ? 'text-rose-500 font-medium' : 'text-slate-500')}>
              <Calendar className="w-3 h-3" />
              <span>
                {isOverdue ? 'Vencido em ' : 'Vence em '}
                {new Date(liability.dueDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          {liability.notes && (
            <p className="text-xs text-slate-400 truncate">{liability.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
