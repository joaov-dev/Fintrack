import {
  PrismaClient,
  CategoryType,
  PlanCode,
  BillingCycle,
  FeatureKey,
} from '@prisma/client'

const prisma = new PrismaClient()

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

async function seedBilling() {
  const plans = [
    { code: PlanCode.FREE, name: 'Free', description: 'Plano gratuito', sortOrder: 1 },
    { code: PlanCode.PRO, name: 'Pro', description: 'Plano Pro', sortOrder: 2 },
    { code: PlanCode.BUSINESS, name: 'Business', description: 'Plano Business', sortOrder: 3 },
  ]

  const createdPlans: Record<PlanCode, string> = {
    FREE: '',
    PRO: '',
    BUSINESS: '',
  }

  for (const p of plans) {
    const row = await prisma.plan.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description, isActive: true, sortOrder: p.sortOrder },
      create: { code: p.code, name: p.name, description: p.description, isActive: true, sortOrder: p.sortOrder },
    })
    createdPlans[p.code] = row.id
  }

  await prisma.price.upsert({
    where: { planId_billingCycle: { planId: createdPlans.PRO, billingCycle: BillingCycle.MONTHLY } },
    update: { amountCents: 1900, currency: 'BRL', isActive: true },
    create: { planId: createdPlans.PRO, billingCycle: BillingCycle.MONTHLY, amountCents: 1900, currency: 'BRL', isActive: true },
  })
  await prisma.price.upsert({
    where: { planId_billingCycle: { planId: createdPlans.PRO, billingCycle: BillingCycle.YEARLY } },
    update: { amountCents: 15960, currency: 'BRL', isActive: true },
    create: { planId: createdPlans.PRO, billingCycle: BillingCycle.YEARLY, amountCents: 15960, currency: 'BRL', isActive: true },
  })
  await prisma.price.upsert({
    where: { planId_billingCycle: { planId: createdPlans.BUSINESS, billingCycle: BillingCycle.MONTHLY } },
    update: { amountCents: 4900, currency: 'BRL', isActive: true },
    create: { planId: createdPlans.BUSINESS, billingCycle: BillingCycle.MONTHLY, amountCents: 4900, currency: 'BRL', isActive: true },
  })
  await prisma.price.upsert({
    where: { planId_billingCycle: { planId: createdPlans.BUSINESS, billingCycle: BillingCycle.YEARLY } },
    update: { amountCents: 41160, currency: 'BRL', isActive: true },
    create: { planId: createdPlans.BUSINESS, billingCycle: BillingCycle.YEARLY, amountCents: 41160, currency: 'BRL', isActive: true },
  })

  const featureMap: Record<PlanCode, Array<{ featureKey: FeatureKey; enabled: boolean; limitPerMonth?: number | null }>> = {
    FREE: [
      { featureKey: 'BASIC_DASHBOARD', enabled: true },
      { featureKey: 'ACCOUNTS_LIMIT', enabled: true, limitPerMonth: 2 },
      { featureKey: 'CREDIT_CARDS_LIMIT', enabled: true, limitPerMonth: 2 },
      { featureKey: 'TRANSACTIONS_MONTHLY_LIMIT', enabled: true, limitPerMonth: 200 },
    ],
    PRO: [
      { featureKey: 'BASIC_DASHBOARD', enabled: true },
      { featureKey: 'RECURRING_TRANSACTIONS', enabled: true },
      { featureKey: 'GOALS', enabled: true },
      { featureKey: 'LIABILITIES', enabled: true },
      { featureKey: 'CREDIT_CARDS', enabled: true },
      { featureKey: 'CSV_IMPORT', enabled: true },
      { featureKey: 'RULES_AUTOCATEGORIZATION', enabled: true },
      { featureKey: 'INSIGHTS', enabled: true },
      { featureKey: 'FINANCIAL_HEALTH', enabled: true },
      { featureKey: 'FORECAST', enabled: true },
      { featureKey: 'ACCOUNTS_LIMIT', enabled: true, limitPerMonth: 10 },
      { featureKey: 'CREDIT_CARDS_LIMIT', enabled: true, limitPerMonth: 10 },
      { featureKey: 'TRANSACTIONS_MONTHLY_LIMIT', enabled: true, limitPerMonth: 5000 },
    ],
    BUSINESS: [
      { featureKey: 'BASIC_DASHBOARD', enabled: true },
      { featureKey: 'RECURRING_TRANSACTIONS', enabled: true },
      { featureKey: 'GOALS', enabled: true },
      { featureKey: 'LIABILITIES', enabled: true },
      { featureKey: 'CREDIT_CARDS', enabled: true },
      { featureKey: 'CSV_IMPORT', enabled: true },
      { featureKey: 'RULES_AUTOCATEGORIZATION', enabled: true },
      { featureKey: 'INSIGHTS', enabled: true },
      { featureKey: 'FINANCIAL_HEALTH', enabled: true },
      { featureKey: 'FORECAST', enabled: true },
      { featureKey: 'REPORTS_ADVANCED', enabled: true },
      { featureKey: 'INVESTMENTS_ADVANCED', enabled: true },
      { featureKey: 'INVESTMENT_ALLOCATION', enabled: true },
      { featureKey: 'EXPORT_DATA', enabled: true },
      { featureKey: 'ACCOUNTS_LIMIT', enabled: true, limitPerMonth: null },
      { featureKey: 'CREDIT_CARDS_LIMIT', enabled: true, limitPerMonth: null },
      { featureKey: 'TRANSACTIONS_MONTHLY_LIMIT', enabled: true, limitPerMonth: null },
    ],
  }

  for (const [planCode, features] of Object.entries(featureMap) as Array<[PlanCode, typeof featureMap[PlanCode]]>) {
    const planId = createdPlans[planCode]
    for (const f of features) {
      await prisma.featureGate.upsert({
        where: { planId_featureKey: { planId, featureKey: f.featureKey } },
        update: { enabled: f.enabled, limitPerMonth: f.limitPerMonth ?? null },
        create: {
          planId,
          featureKey: f.featureKey,
          enabled: f.enabled,
          limitPerMonth: f.limitPerMonth ?? null,
        },
      })
    }
  }
}

async function main() {
  await seedBilling()
  console.log('Seed completed (billing seeded; categories are created on user registration)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
