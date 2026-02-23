import { useState } from 'react'
import { Plus, Pencil, Archive, CreditCard as CreditCardIcon, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCardModal } from '@/components/creditCards/CreditCardModal'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useToast } from '@/hooks/use-toast'
import { CreditCard } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function CreditCardsPage() {
  const { cards, isLoading, create, update, archive } = useCreditCards()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const { toast } = useToast()

  const totalOpenBalance = cards.reduce((s, c) => s + c.openBalance, 0)
  const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0)

  const handleSave = async (data: unknown) => {
    try {
      if (editing) {
        await update(editing.id, data)
        toast({ title: 'Cartão atualizado' })
      } else {
        await create(data)
        toast({ title: 'Cartão adicionado' })
      }
    } catch {
      toast({ title: 'Erro ao salvar cartão', variant: 'destructive' })
    }
  }

  const handleArchive = async (card: CreditCard) => {
    if (!confirm(`Arquivar o cartão "${card.name}"? Ele não aparecerá mais nas listas.`)) return
    try {
      await archive(card.id)
      toast({ title: 'Cartão arquivado' })
    } catch {
      toast({ title: 'Erro ao arquivar cartão', variant: 'destructive' })
    }
  }

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (card: CreditCard) => { setEditing(card); setModalOpen(true) }
  const handleClose = () => { setModalOpen(false); setEditing(null) }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cartões de Crédito</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie seus cartões e faturas</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Cartão
        </Button>
      </div>

      {/* Summary */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-slate-500 mb-1">Total em Aberto</p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalOpenBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-slate-500 mb-1">Limite Total</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalLimit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-slate-500 mb-1">Disponível</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalLimit - totalOpenBalance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <CreditCardIcon className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Nenhum cartão cadastrado</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Adicione seus cartões para acompanhar faturas e limites</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar primeiro cartão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <CreditCardCard
              key={card.id}
              card={card}
              onEdit={() => openEdit(card)}
              onArchive={() => handleArchive(card)}
            />
          ))}
        </div>
      )}

      <CreditCardModal
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        card={editing}
      />
    </div>
  )
}

function CreditCardCard({
  card,
  onEdit,
  onArchive,
}: {
  card: CreditCard
  onEdit: () => void
  onArchive: () => void
}) {
  const utilizationPct = Math.min(card.utilizationPercent * 100, 100)
  const isHigh = card.utilizationPercent >= 0.80
  const isCritical = card.utilizationPercent >= 0.90

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      {/* Color stripe */}
      <div className="h-1.5 w-full" style={{ background: card.color }} />

      <CardContent className="pt-4">
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: card.color + '20' }}>
                <CreditCardIcon className="w-3.5 h-3.5" style={{ color: card.color }} />
              </div>
              <h3 className="font-semibold text-slate-900 truncate">{card.name}</h3>
            </div>
            {card.brand && <p className="text-xs text-slate-400 ml-8">{card.brand}</p>}
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onArchive}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Balance */}
        <p className={cn('text-xl font-bold mb-1', card.openBalance > 0 ? 'text-rose-600' : 'text-slate-900')}>
          {formatCurrency(card.openBalance)}
          <span className="text-xs text-slate-400 font-normal ml-1">em aberto</span>
        </p>

        {/* Utilization bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Utilização {utilizationPct.toFixed(0)}%</span>
            <span>Limite {formatCurrency(card.creditLimit)}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Fecha dia {card.statementClosingDay} · Vence dia {card.dueDay}</span>
          {card.nextDueDate && card.openBalance > 0 && (
            <span className={cn('font-medium', new Date(card.nextDueDate) < new Date() ? 'text-rose-500' : 'text-slate-600')}>
              Vence {new Date(card.nextDueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>

        {isHigh && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3" />
            <span>{isCritical ? 'Limite crítico' : 'Limite elevado'}</span>
          </div>
        )}

        {/* Detail link */}
        <Link
          to={`/credit-cards/${card.id}`}
          className="mt-3 flex items-center justify-center w-full text-xs text-primary font-medium hover:underline"
        >
          Ver faturas →
        </Link>
      </CardContent>
    </Card>
  )
}
