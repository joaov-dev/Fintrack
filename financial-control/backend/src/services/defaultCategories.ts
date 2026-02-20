import { CategoryType } from '@prisma/client'
import { prisma } from './prisma'

const defaultCategories = [
  { name: 'Alimentação', type: CategoryType.EXPENSE, color: '#f97316', icon: 'utensils' },
  { name: 'Transporte', type: CategoryType.EXPENSE, color: '#3b82f6', icon: 'car' },
  { name: 'Saúde', type: CategoryType.EXPENSE, color: '#ec4899', icon: 'heart' },
  { name: 'Lazer', type: CategoryType.EXPENSE, color: '#8b5cf6', icon: 'gamepad-2' },
  { name: 'Moradia', type: CategoryType.EXPENSE, color: '#14b8a6', icon: 'home' },
  { name: 'Educação', type: CategoryType.EXPENSE, color: '#f59e0b', icon: 'graduation-cap' },
  { name: 'Vestuário', type: CategoryType.EXPENSE, color: '#06b6d4', icon: 'shirt' },
  { name: 'Outros', type: CategoryType.EXPENSE, color: '#94a3b8', icon: 'tag' },
  { name: 'Salário', type: CategoryType.INCOME, color: '#22c55e', icon: 'briefcase' },
  { name: 'Freelance', type: CategoryType.INCOME, color: '#10b981', icon: 'laptop' },
  { name: 'Investimentos', type: CategoryType.INCOME, color: '#84cc16', icon: 'trending-up' },
  { name: 'Outros', type: CategoryType.INCOME, color: '#6ee7b7', icon: 'plus-circle' },
  { name: 'Transferência', type: CategoryType.INCOME, color: '#a78bfa', icon: 'arrow-left-right' },
]

export async function createDefaultCategories(userId: string) {
  await prisma.category.createMany({
    data: defaultCategories.map((cat) => ({
      ...cat,
      userId,
      isDefault: true,
    })),
  })
}
