import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Loader2,
  Landmark, PiggyBank, CreditCard, TrendingUp, Wallet, ArrowLeftRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AccountModal } from '@/components/accounts/AccountModal'
import { AccountTransferModal } from '@/components/accounts/AccountTransferModal'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransfers } from '@/hooks/useTransfers'
import { useToast } from '@/hooks/use-toast'
import { Account, ACCOUNT_TYPE_LABELS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ACCOUNT_ICONS: Record<Account['type'], React.ElementType> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CREDIT: CreditCard,
  INVESTMENT: TrendingUp,
  CASH: Wallet,
}

export default function AccountsPage() {
  const { accounts, isLoading, create, update, remove, refetch } = useAccounts()
  const { create: createTransfer } = useTransfers()
  const [modalOpen, setModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const { toast } = useToast()

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const handleSave = async (data: unknown) => {
    try {
      if (editing) {
        await update(editing.id, data)
        toast({ title: 'Conta atualizada' })
      } else {
        await create(data)
        toast({ title: 'Conta criada' })
      }
    } catch {
      toast({ title: 'Erro ao salvar conta', variant: 'destructive' })
    }
  }

  const handleTransfer = async (data: Parameters<typeof createTransfer>[0]) => {
    await createTransfer(data)
    await refetch()
    toast({ title: 'Transferência realizada com sucesso' })
  }

  const handleDelete = async (acc: Account) => {
    if (!confirm(`Excluir conta "${acc.name}"?`)) return
    try {
      await remove(acc.id)
      toast({ title: 'Conta excluída' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir'
      toast({ title: msg, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie suas carteiras e contas bancárias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferModalOpen(true)} disabled={accounts.length < 2}>
            <ArrowLeftRight className="w-4 h-4" />
            Transferir
          </Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* Patrimônio total */}
      {accounts.length > 0 && (
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-6 text-white">
          <p className="text-violet-200 text-sm font-medium">Patrimônio Total</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
          <p className="text-violet-300 text-xs mt-2">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} registrada{accounts.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm">Nenhuma conta cadastrada</p>
            <Button variant="outline" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="w-4 h-4" /> Adicionar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const Icon = ACCOUNT_ICONS[acc.type]
            const isNegative = acc.balance < 0
            return (
              <Card key={acc.id} className="group hover:shadow-md transition-all overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: acc.color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: acc.color + '18' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: acc.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{acc.name}</p>
                        <p className="text-xs text-slate-400">{ACCOUNT_TYPE_LABELS[acc.type]}</p>
                      </div>
                    </div>
                  </div>

                  <p className={cn(
                    'text-2xl font-bold tracking-tight',
                    isNegative ? 'text-rose-600' : 'text-slate-900',
                  )}>
                    {formatCurrency(acc.balance)}
                  </p>
                  {acc.initialBalance !== 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Saldo inicial: {formatCurrency(acc.initialBalance)}
                    </p>
                  )}

                  <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="sm"
                      className="flex-1 h-8 text-xs text-slate-500 hover:text-primary"
                      onClick={() => { setEditing(acc); setModalOpen(true) }}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="flex-1 h-8 text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => handleDelete(acc)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AccountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        account={editing}
      />

      <AccountTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onTransfer={handleTransfer}
        accounts={accounts}
      />
    </div>
  )
}
