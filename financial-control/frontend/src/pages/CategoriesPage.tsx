import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryModal } from '@/components/categories/CategoryModal'
import { BudgetModal } from '@/components/categories/BudgetModal'
import { useCategories } from '@/hooks/useCategories'
import { useBudgets } from '@/hooks/useBudgets'
import { useToast } from '@/hooks/use-toast'
import { Category, Budget } from '@/types'
import { formatCurrency, monthLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function CategoriesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { categories, isLoading, create, update, remove } = useCategories()
  const { budgets, upsert: upsertBudget, remove: removeBudget } = useBudgets(month, year)
  const [modalOpen, setModalOpen] = useState(false)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [budgetCategory, setBudgetCategory] = useState<Category | null>(null)
  const { toast } = useToast()

  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  const getBudget = (catId: string): Budget | undefined =>
    budgets.find((b) => b.categoryId === catId)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === now.getMonth() + 1 && year === now.getFullYear()) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const handleSave = async (data: unknown) => {
    try {
      if (editing) { await update(editing.id, data); toast({ title: 'Categoria atualizada' }) }
      else { await create(data); toast({ title: 'Categoria criada' }) }
    } catch { toast({ title: 'Erro ao salvar categoria', variant: 'destructive' }) }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Excluir categoria "${cat.name}"?`)) return
    try {
      await remove(cat.id); toast({ title: 'Categoria excluída' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir'
      toast({ title: msg, variant: 'destructive' })
    }
  }

  const handleSaveBudget = async (data: unknown) => {
    try { await upsertBudget(data); toast({ title: 'Orçamento salvo' }) }
    catch { toast({ title: 'Erro ao salvar orçamento', variant: 'destructive' }) }
  }

  const handleRemoveBudget = async (id: string) => {
    try { await removeBudget(id); toast({ title: 'Orçamento removido' }) }
    catch { toast({ title: 'Erro ao remover orçamento', variant: 'destructive' }) }
  }

  const CategoryGrid = ({ items, label, showBudget }: { items: Category[]; label: string; showBudget?: boolean }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((cat) => {
          const budget = showBudget ? getBudget(cat.id) : undefined
          const pct = budget ? Math.min(budget.percentage, 100) : 0
          const isOver = budget ? budget.percentage > 100 : false

          return (
            <Card key={cat.id} className="group hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cat.color + '20' }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{cat.name}</p>
                    <Badge variant={cat.type === 'INCOME' ? 'income' : 'expense'} className="text-xs mt-0.5">
                      {cat.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </div>
                </div>

                {showBudget && (
                  <div className="mb-3">
                    {budget ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className={cn(isOver ? 'text-rose-600 font-medium' : 'text-slate-500')}>
                            {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                          </span>
                          <span className={cn('font-medium', isOver ? 'text-rose-600' : 'text-slate-400')}>
                            {budget.percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', isOver ? 'bg-rose-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <button onClick={() => handleRemoveBudget(budget.id)} className="text-xs text-slate-300 hover:text-rose-500 transition-colors">
                          Remover orçamento
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setBudgetCategory(cat); setBudgetModalOpen(true) }}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                      >
                        <Target className="w-3 h-3" /> Definir orçamento
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-slate-500 hover:text-primary" onClick={() => { setEditing(cat); setModalOpen(true) }}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  {showBudget && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 text-slate-400 hover:text-primary" onClick={() => { setBudgetCategory(cat); setBudgetModalOpen(true) }} title="Orçamento">
                      <Target className="w-3 h-3" />
                    </Button>
                  )}
                  {!cat.isDefault && (
                    <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-slate-500 hover:text-rose-600" onClick={() => handleDelete(cat)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
          <p className="text-slate-500 text-sm mt-0.5">Organize suas receitas, despesas e orçamentos</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" /> Nova Categoria
        </Button>
      </div>

      {/* Month selector for budgets */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 mr-1">Orçamentos de</span>
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center capitalize">{monthLabel(month, year)}</span>
        <Button variant="outline" size="icon" onClick={nextMonth} disabled={month === now.getMonth() + 1 && year === now.getFullYear()}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <CategoryGrid items={expenseCategories} label="Despesas" showBudget />
          <CategoryGrid items={incomeCategories} label="Receitas" />
        </>
      )}

      <CategoryModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} category={editing} />
      {budgetCategory && (
        <BudgetModal
          open={budgetModalOpen}
          onClose={() => { setBudgetModalOpen(false); setBudgetCategory(null) }}
          onSave={handleSaveBudget}
          category={budgetCategory}
          existing={getBudget(budgetCategory.id)}
          month={month}
          year={year}
        />
      )}
    </div>
  )
}
