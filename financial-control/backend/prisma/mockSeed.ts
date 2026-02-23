/**
 * Mock seed script — 6 months of retroactive data for joaovplsantos@gmail.com
 * Run with: npx tsx prisma/mockSeed.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const UID = 'cmltf8ukp0000xvm7uwk1e5h1'

// Existing category IDs (created on registration)
const C = {
  alim:     'cmlvg48fj0000ler04lhjx711',
  trans:    'cmlvg48fj0001ler0c7g9haec',
  saude:    'cmlvg48fj0002ler0sch8ohfn',
  lazer:    'cmlvg48fj0003ler0133h31kp',
  morad:    'cmlvg48fj0004ler0thhzeza5',
  educ:     'cmlvg48fj0005ler0qebwqu2a',
  vest:     'cmlvg48fj0006ler0vm2p0x3k',
  outros:   'cmlvg48fj0007ler0gnu4rg6q',
  salario:  'cmlvg48fj0008ler0uij2icmp',
  freela:   'cmlvg48fj0009ler09fszdoby',
  invest:   'cmlvg48fj000aler0wsvbw3in',
  outroInc: 'cmlvg48fj000bler0mn752w0v',
}

/** Helper: create a Date at noon */
function d(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day, 12, 0, 0)
}

async function main() {
  console.log('🚀 Starting mock seed...\n')

  // ─── 0. CLEANUP ───────────────────────────────────────────────────────────
  console.log('🧹 Cleaning existing mock data...')
  await prisma.budget.deleteMany({ where: { userId: UID } })
  await prisma.transaction.deleteMany({ where: { userId: UID } })
  await prisma.installmentPlan.deleteMany({ where: { userId: UID } })
  await prisma.cardStatement.deleteMany({ where: { userId: UID } })
  await prisma.creditCard.deleteMany({ where: { userId: UID } })
  await prisma.account.deleteMany({ where: { userId: UID } })
  await prisma.liability.deleteMany({ where: { userId: UID } })
  await prisma.investmentPosition.deleteMany({ where: { userId: UID } })
  await prisma.goal.deleteMany({ where: { userId: UID } })
  console.log('   ✓ Cleanup done\n')

  // ─── 1. ACCOUNTS ──────────────────────────────────────────────────────────
  console.log('📊 Creating accounts...')
  const [accChecking, accSavings, accInvest, accCash] = await Promise.all([
    prisma.account.create({ data: { userId: UID, name: 'Nubank Conta', type: 'CHECKING', color: '#8B5CF6', initialBalance: 5000 } }),
    prisma.account.create({ data: { userId: UID, name: 'Poupança Caixa', type: 'SAVINGS',  color: '#22c55e', initialBalance: 8000 } }),
    prisma.account.create({ data: { userId: UID, name: 'XP Investimentos', type: 'INVESTMENT', color: '#f59e0b', initialBalance: 0 } }),
    prisma.account.create({ data: { userId: UID, name: 'Carteira',   type: 'CASH',       color: '#64748b', initialBalance: 300 } }),
  ])
  console.log('   ✓ 4 accounts created')

  // ─── 2. LIABILITIES ───────────────────────────────────────────────────────
  console.log('💳 Creating liabilities...')
  await Promise.all([
    prisma.liability.create({ data: { userId: UID, name: 'Financiamento Honda Civic', type: 'FINANCING', currentBalance: 28500, installments: 36, interestRate: 0.0099, dueDate: d(2027, 8, 10), notes: '36x de R$ 892,00 — parcela no dia 10' } }),
    prisma.liability.create({ data: { userId: UID, name: 'Empréstimo Pessoal Nubank', type: 'LOAN',      currentBalance: 6200,  installments: 12, interestRate: 0.0179, dueDate: d(2026, 12, 5) } }),
  ])
  console.log('   ✓ 2 liabilities created')

  // ─── 3. INVESTMENT POSITIONS ──────────────────────────────────────────────
  console.log('📈 Creating investment positions...')
  const [posPertr4, posSelic, posBova11] = await Promise.all([
    prisma.investmentPosition.create({ data: { userId: UID, accountId: accInvest.id, name: 'PETR4', ticker: 'PETR4', type: 'STOCK', quantity: 100, avgPrice: 38.50, currentValue: 4180, notes: 'Comprado em mar/25' } }),
    prisma.investmentPosition.create({ data: { userId: UID, accountId: accInvest.id, name: 'Tesouro SELIC 2027', type: 'FIXED_INCOME', currentValue: 18540, notes: 'Aplicação automática' } }),
    prisma.investmentPosition.create({ data: { userId: UID, accountId: accInvest.id, name: 'BOVA11', ticker: 'BOVA11', type: 'FUND', quantity: 45, avgPrice: 120.00, currentValue: 5940 } }),
  ])
  console.log('   ✓ 3 investment positions created')

  // ─── 4. GOALS ─────────────────────────────────────────────────────────────
  console.log('🎯 Creating goals...')
  await Promise.all([
    prisma.goal.create({ data: { userId: UID, name: 'Reserva de Emergência', targetAmount: 30000, linkedAccountId: accSavings.id, notes: '6x as despesas mensais médias' } }),
    prisma.goal.create({ data: { userId: UID, name: 'Viagem Europa 2027', targetAmount: 22000, targetDate: d(2027, 6, 1), notes: 'Lisboa, Porto e Madrid — jun/27' } }),
    prisma.goal.create({ data: { userId: UID, name: 'Troca de Carro', targetAmount: 60000, targetDate: d(2028, 3, 1) } }),
  ])
  console.log('   ✓ 3 goals created')

  // ─── 5. CREDIT CARDS ──────────────────────────────────────────────────────
  console.log('💳 Creating credit cards...')
  const [cardNu, cardItau] = await Promise.all([
    prisma.creditCard.create({ data: { userId: UID, name: 'Nubank Ultravioleta', brand: 'Mastercard', creditLimit: 8000,  statementClosingDay: 7,  dueDay: 15, color: '#8B5CF6' } }),
    prisma.creditCard.create({ data: { userId: UID, name: 'Itaú Gold',           brand: 'Visa',       creditLimit: 15000, statementClosingDay: 20, dueDay: 5,  color: '#F97316' } }),
  ])
  console.log('   ✓ 2 credit cards created')

  // ─── 6. CARD STATEMENTS ───────────────────────────────────────────────────
  // Nubank: closes day 7, due day 15 → 7 statements (Sep25–Mar26)
  // Itaú:   closes day 20, due day 5  → 6 statements (Sep25–Feb26)
  console.log('📋 Creating card statements...')

  const [snuSep, snuOct, snuNov, snuDec, snuJan, snuFeb, snuMar] = await Promise.all([
    // NUBANK statements — PAID (past)
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2025,8,8),  periodEnd: d(2025,9,7),  closingDate: d(2025,9,7),  dueDate: d(2025,9,15),  status: 'PAID',   totalSpent: 389.20, totalPaid: 389.20 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2025,9,8),  periodEnd: d(2025,10,7), closingDate: d(2025,10,7), dueDate: d(2025,10,15), status: 'PAID',   totalSpent: 833.00, totalPaid: 833.00 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2025,10,8), periodEnd: d(2025,11,7), closingDate: d(2025,11,7), dueDate: d(2025,11,15), status: 'PAID',   totalSpent: 993.00, totalPaid: 993.00 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2025,11,8), periodEnd: d(2025,12,7), closingDate: d(2025,12,7), dueDate: d(2025,12,15), status: 'PAID',   totalSpent: 1069.10, totalPaid: 1069.10 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2025,12,8), periodEnd: d(2026,1,7),  closingDate: d(2026,1,7),  dueDate: d(2026,1,15),  status: 'PAID',   totalSpent: 1425.10, totalPaid: 1425.10 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2026,1,8),  periodEnd: d(2026,2,7),  closingDate: d(2026,2,7),  dueDate: d(2026,2,15),  status: 'PAID',   totalSpent: 1191.70, totalPaid: 1191.70 } }),
    // NUBANK current — OPEN
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardNu.id, periodStart: d(2026,2,8),  periodEnd: d(2026,3,7),  closingDate: d(2026,3,7),  dueDate: d(2026,3,15),  status: 'OPEN',   totalSpent: 671.60,  totalPaid: 0 } }),
  ])

  const [siSep, siOct, siNov, siDec, siJan, siFeb] = await Promise.all([
    // ITAÚ statements — PAID (past)
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardItau.id, periodStart: d(2025,8,21), periodEnd: d(2025,9,20),  closingDate: d(2025,9,20),  dueDate: d(2025,10,5),  status: 'PAID',   totalSpent: 1734.80, totalPaid: 1734.80 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardItau.id, periodStart: d(2025,9,21), periodEnd: d(2025,10,20), closingDate: d(2025,10,20), dueDate: d(2025,11,5),  status: 'PAID',   totalSpent: 2367.60, totalPaid: 2367.60 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardItau.id, periodStart: d(2025,10,21),periodEnd: d(2025,11,20), closingDate: d(2025,11,20), dueDate: d(2025,12,5),  status: 'PAID',   totalSpent: 4055.70, totalPaid: 4055.70 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardItau.id, periodStart: d(2025,11,21),periodEnd: d(2025,12,20), closingDate: d(2025,12,20), dueDate: d(2026,1,5),   status: 'PAID',   totalSpent: 6114.50, totalPaid: 6114.50 } }),
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardItau.id, periodStart: d(2025,12,21),periodEnd: d(2026,1,20),  closingDate: d(2026,1,20),  dueDate: d(2026,2,5),   status: 'PAID',   totalSpent: 2568.10, totalPaid: 2568.10 } }),
    // ITAÚ Feb — CLOSED (partial payment, dueDate=Mar 5)
    prisma.cardStatement.create({ data: { userId: UID, cardId: cardItau.id, periodStart: d(2026,1,21), periodEnd: d(2026,2,20),  closingDate: d(2026,2,20),  dueDate: d(2026,3,5),   status: 'CLOSED', totalSpent: 2422.20, totalPaid: 1000.00 } }),
  ])
  console.log('   ✓ 13 card statements created')

  // ─── 7. INSTALLMENT PLAN (TV Sony 55") on Itaú ────────────────────────────
  const installPlan = await prisma.installmentPlan.create({
    data: { userId: UID, creditCardId: cardItau.id, description: 'TV Sony 55" Bravia', totalAmount: 2400, totalInstallments: 3, installmentAmount: 800, startDate: d(2025,10,5) },
  })

  // ─── 8. TRANSACTIONS ──────────────────────────────────────────────────────
  console.log('💰 Creating transactions (6 months)...')

  // Helper: transfer pair
  let tfIdx = 0
  const transfers: [Date, number, string, string][] = [
    [d(2025,9,20),  1500, 'tf-1', 'Set'],
    [d(2025,10,20), 2000, 'tf-2', 'Out'],
    [d(2025,11,20), 1200, 'tf-3', 'Nov'],
    [d(2025,12,20), 3000, 'tf-4', 'Dez'],
    [d(2026,1,20),  1000, 'tf-5', 'Jan'],
    [d(2026,2,15),   800, 'tf-6', 'Fev'],
  ]

  const txData: Parameters<typeof prisma.transaction.createMany>[0]['data'] = []

  // ── Monthly regular transactions ──────────────────────────────────────────
  type TxRow = {
    userId: string; categoryId: string; type: 'INCOME'|'EXPENSE'
    amount: number; description: string; date: Date
    accountId?: string|null; notes?: string|null
    isRecurring?: boolean; recurrenceType?: 'MONTHLY'|null
    transferId?: string|null; paymentMethod?: 'PIX'|'DEBIT'|'CASH'|null
    isCardPayment?: boolean; creditCardId?: string|null; statementId?: string|null
    installmentPlanId?: string|null; installmentNumber?: number|null
  }

  const txRows: TxRow[] = [
    // ═══════════════════ SEPTEMBER 2025 ═══════════════════
    // Income
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'Salário Set/25',         date:d(2025,9,5),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY' },
    { userId:UID, categoryId:C.freela,  type:'INCOME',  amount:2000,   description:'Freelance — Site E-commerce', date:d(2025,9,18), accountId:accChecking.id },
    // Fixed expenses
    { userId:UID, categoryId:C.morad,   type:'EXPENSE', amount:2200,   description:'Aluguel Set/25',          date:d(2025,9,1),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'PIX' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:185,    description:'Conta de Luz/Água',        date:d(2025,9,10), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:95,     description:'Internet Vivo Fibra',      date:d(2025,9,10), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:120,    description:'Academia Smart Fit',       date:d(2025,9,14), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.educ,    type:'EXPENSE', amount:380,    description:'Curso Inglês CNA',         date:d(2025,9,8),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    // Variable
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:320,    description:'Supermercado Extra',       date:d(2025,9,15), accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:280,    description:'Supermercado Carrefour',   date:d(2025,9,30), accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.trans,   type:'EXPENSE', amount:220,    description:'Combustível Posto BR',     date:d(2025,9,22), accountId:accChecking.id, paymentMethod:'DEBIT' },

    // ═══════════════════ OCTOBER 2025 ═══════════════════
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'Salário Out/25',           date:d(2025,10,5), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY' },
    { userId:UID, categoryId:C.freela,  type:'INCOME',  amount:3200,   description:'Freelance — App Mobile',   date:d(2025,10,21),accountId:accChecking.id },
    { userId:UID, categoryId:C.morad,   type:'EXPENSE', amount:2200,   description:'Aluguel Out/25',           date:d(2025,10,1), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'PIX' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:195,    description:'Conta de Luz/Água',        date:d(2025,10,10),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:95,     description:'Internet Vivo Fibra',      date:d(2025,10,10),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:120,    description:'Academia Smart Fit',       date:d(2025,10,14),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.educ,    type:'EXPENSE', amount:380,    description:'Curso Inglês CNA',         date:d(2025,10,8), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:380,    description:'Supermercado Extra',       date:d(2025,10,28),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.trans,   type:'EXPENSE', amount:190,    description:'Combustível',              date:d(2025,10,22),accountId:accChecking.id, paymentMethod:'DEBIT' },

    // ═══════════════════ NOVEMBER 2025 ═══════════════════
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'Salário Nov/25',           date:d(2025,11,5), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY' },
    { userId:UID, categoryId:C.morad,   type:'EXPENSE', amount:2200,   description:'Aluguel Nov/25',           date:d(2025,11,1), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'PIX' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:178,    description:'Conta de Luz/Água',        date:d(2025,11,12),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:95,     description:'Internet Vivo Fibra',      date:d(2025,11,12),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:120,    description:'Academia Smart Fit',       date:d(2025,11,14),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.educ,    type:'EXPENSE', amount:380,    description:'Curso Inglês CNA',         date:d(2025,11,10),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:410,    description:'Supermercado Pão de Açúcar',date:d(2025,11,22),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.trans,   type:'EXPENSE', amount:210,    description:'Combustível',              date:d(2025,11,20),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:280,    description:'Consulta Médica',          date:d(2025,11,25),accountId:accChecking.id, paymentMethod:'PIX' },

    // ═══════════════════ DECEMBER 2025 ═══════════════════
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'Salário Dez/25',           date:d(2025,12,5), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY' },
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'13º Salário Dez/25',       date:d(2025,12,5), accountId:accChecking.id },
    { userId:UID, categoryId:C.morad,   type:'EXPENSE', amount:2200,   description:'Aluguel Dez/25',           date:d(2025,12,1), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'PIX' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:245,    description:'Conta de Luz/Água',        date:d(2025,12,12),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:95,     description:'Internet Vivo Fibra',      date:d(2025,12,12),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:120,    description:'Academia Smart Fit',       date:d(2025,12,14),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.educ,    type:'EXPENSE', amount:380,    description:'Curso Inglês CNA',         date:d(2025,12,10),accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:580,    description:'Supermercado (Natal)',      date:d(2025,12,22),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:420,    description:'Supermercado Extra',       date:d(2025,12,28),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.trans,   type:'EXPENSE', amount:250,    description:'Combustível',              date:d(2025,12,20),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:145,    description:'Farmácia',                 date:d(2025,12,18),accountId:accChecking.id, paymentMethod:'DEBIT' },

    // ═══════════════════ JANUARY 2026 ═══════════════════
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'Salário Jan/26',           date:d(2026,1,5),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY' },
    { userId:UID, categoryId:C.morad,   type:'EXPENSE', amount:2200,   description:'Aluguel Jan/26',           date:d(2026,1,1),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'PIX' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:198,    description:'Conta de Luz/Água',        date:d(2026,1,10), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:95,     description:'Internet Vivo Fibra',      date:d(2026,1,10), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:120,    description:'Academia Smart Fit',       date:d(2026,1,14), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.educ,    type:'EXPENSE', amount:380,    description:'Curso Inglês CNA',         date:d(2026,1,10), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:450,    description:'Supermercado Carrefour',   date:d(2026,1,24), accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.trans,   type:'EXPENSE', amount:185,    description:'Combustível',              date:d(2026,1,18), accountId:accChecking.id, paymentMethod:'DEBIT' },

    // ═══════════════════ FEBRUARY 2026 (current, partial) ═══════════════════
    { userId:UID, categoryId:C.salario, type:'INCOME',  amount:8500,   description:'Salário Fev/26',           date:d(2026,2,5),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY' },
    { userId:UID, categoryId:C.morad,   type:'EXPENSE', amount:2200,   description:'Aluguel Fev/26',           date:d(2026,2,1),  accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'PIX' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:187,    description:'Conta de Luz/Água',        date:d(2026,2,10), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.outros,  type:'EXPENSE', amount:95,     description:'Internet Vivo Fibra',      date:d(2026,2,12), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:120,    description:'Academia Smart Fit',       date:d(2026,2,14), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.educ,    type:'EXPENSE', amount:380,    description:'Curso Inglês CNA',         date:d(2026,2,14), accountId:accChecking.id, isRecurring:true, recurrenceType:'MONTHLY', paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.alim,    type:'EXPENSE', amount:420,    description:'Supermercado Pão de Açúcar',date:d(2026,2,18),accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.trans,   type:'EXPENSE', amount:195,    description:'Combustível',              date:d(2026,2,16), accountId:accChecking.id, paymentMethod:'DEBIT' },
    { userId:UID, categoryId:C.saude,   type:'EXPENSE', amount:350,    description:'Dentista',                 date:d(2026,2,12), accountId:accChecking.id, paymentMethod:'PIX' },

    // ═══════════════════ CC NUBANK — Sep statement (Aug 8 – Sep 7) — PAID ═══
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',             date:d(2025,8,25), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuSep.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:87.50,  description:'iFood',               date:d(2025,8,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuSep.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:145.00, description:'Restaurante Madero',  date:d(2025,9,3),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuSep.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:21.90,  description:'Spotify',             date:d(2025,9,5),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuSep.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:89.90,  description:'Farmácia Ultrafarma', date:d(2025,9,6),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuSep.id },
    // Payment: Nubank Sep
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:389.20, description:'Pgto Fatura Nubank — Set/25', date:d(2025,9,12), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardNu.id, statementId:snuSep.id },

    // ═══════════════════ CC NUBANK — Oct statement (Sep 8 – Oct 7) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:132.00, description:'iFood',               date:d(2025,9,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',             date:d(2025,9,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.vest,   type:'EXPENSE', amount:289.90, description:'Shein',               date:d(2025,9,20), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:178.50, description:'Restaurante Outback', date:d(2025,9,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:67.80,  description:'Farmácia',            date:d(2025,10,2), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:21.90,  description:'Spotify',             date:d(2025,10,5), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:98.00,  description:'iFood',               date:d(2025,10,7), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuOct.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:833.00, description:'Pgto Fatura Nubank — Out/25', date:d(2025,10,12), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardNu.id, statementId:snuOct.id },

    // ═══════════════════ CC NUBANK — Nov statement (Oct 8 – Nov 7) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:156.00, description:'iFood',              date:d(2025,10,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',            date:d(2025,10,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:312.40, description:'Shopee',             date:d(2025,10,22), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:189.00, description:'Restaurante',        date:d(2025,10,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:156.80, description:'Farmácia',           date:d(2025,11,1),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:21.90,  description:'Spotify',            date:d(2025,11,3),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:112.00, description:'iFood',              date:d(2025,11,5),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuNov.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:993.00, description:'Pgto Fatura Nubank — Nov/25', date:d(2025,11,12), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardNu.id, statementId:snuNov.id },

    // ═══════════════════ CC NUBANK — Dec statement (Nov 8 – Dec 7) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:198.00, description:'iFood',              date:d(2025,11,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',            date:d(2025,11,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:189.90, description:'Steam — jogos',      date:d(2025,11,22), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:145.50, description:'iFood',              date:d(2025,11,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:89.90,  description:'Farmácia',           date:d(2025,12,2),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:21.90,  description:'Spotify',            date:d(2025,12,3),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:267.00, description:'Restaurante',        date:d(2025,12,5),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:112.00, description:'iFood',              date:d(2025,12,6),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuDec.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:1069.10,description:'Pgto Fatura Nubank — Dez/25', date:d(2025,12,12), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardNu.id, statementId:snuDec.id },

    // ═══════════════════ CC NUBANK — Jan statement (Dec 8 – Jan 7) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:234.00, description:'iFood',                 date:d(2025,12,10), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',               date:d(2025,12,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:389.90, description:'Amazon — Presente de Natal',date:d(2025,12,15),accountId:null,paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:178.50, description:'iFood',                 date:d(2025,12,22), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:156.00, description:'iFood',                 date:d(2025,12,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:98.90,  description:'Farmácia',              date:d(2026,1,2),   accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:21.90,  description:'Spotify',               date:d(2026,1,3),   accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:189.00, description:'Restaurante',           date:d(2026,1,5),   accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:112.00, description:'iFood',                 date:d(2026,1,7),   accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuJan.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:1425.10,description:'Pgto Fatura Nubank — Jan/26', date:d(2026,1,12), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardNu.id, statementId:snuJan.id },

    // ═══════════════════ CC NUBANK — Feb statement (Jan 8 – Feb 7) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:189.00, description:'iFood',              date:d(2026,1,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',            date:d(2026,1,15), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:234.50, description:'Amazon',             date:d(2026,1,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:156.00, description:'Restaurante',        date:d(2026,1,22), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:123.50, description:'iFood',              date:d(2026,1,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:78.90,  description:'Farmácia',           date:d(2026,2,2),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:21.90,  description:'Spotify',            date:d(2026,2,3),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:145.00, description:'iFood',              date:d(2026,2,5),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:198.00, description:'Restaurante',        date:d(2026,2,6),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuFeb.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:1191.70,description:'Pgto Fatura Nubank — Fev/26', date:d(2026,2,12), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardNu.id, statementId:snuFeb.id },

    // ═══════════════════ CC NUBANK — Mar statement (Feb 8 – Mar 7) — OPEN ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:134.00, description:'iFood',              date:d(2026,2,9),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuMar.id },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:44.90,  description:'Netflix',            date:d(2026,2,11), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuMar.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:189.90, description:'Shopee',             date:d(2026,2,13), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuMar.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:167.50, description:'Restaurante',        date:d(2026,2,15), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuMar.id },
    { userId:UID, categoryId:C.saude,  type:'EXPENSE', amount:45.80,  description:'Farmácia',           date:d(2026,2,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuMar.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:89.50,  description:'iFood',              date:d(2026,2,19), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardNu.id, statementId:snuMar.id },

    // ═══════════════════ CC ITAÚ — Sep statement (Aug 21 – Sep 20) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:487.90, description:'Supermercado Pão de Açúcar', date:d(2025,8,25), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siSep.id },
    { userId:UID, categoryId:C.trans,  type:'EXPENSE', amount:180.00, description:'Posto Shell',               date:d(2025,9,5),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siSep.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:312.00, description:'Restaurante Outback',       date:d(2025,9,10), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siSep.id },
    { userId:UID, categoryId:C.vest,   type:'EXPENSE', amount:398.50, description:'Renner',                    date:d(2025,9,15), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siSep.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:356.40, description:'Supermercado Extra',        date:d(2025,9,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siSep.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:1734.80,description:'Pgto Fatura Itaú — Set/25', date:d(2025,10,3), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardItau.id, statementId:siSep.id },

    // ═══════════════════ CC ITAÚ — Oct statement (Sep 21 – Oct 20) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:521.30, description:'Supermercado',              date:d(2025,9,25), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siOct.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:349.00, description:'Amazon — Fone JBL',         date:d(2025,10,2), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siOct.id },
    // Installment plan parcela 1
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:800.00, description:'TV Sony 55" Bravia (1/3)',  date:d(2025,10,5), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siOct.id, installmentPlanId:installPlan.id, installmentNumber:1 },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:287.50, description:'Restaurante Fogo de Chão', date:d(2025,10,8), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siOct.id },
    { userId:UID, categoryId:C.trans,  type:'EXPENSE', amount:175.00, description:'Posto BR',                  date:d(2025,10,12),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siOct.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:234.80, description:'Americanas',                date:d(2025,10,15),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siOct.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:2367.60,description:'Pgto Fatura Itaú — Out/25', date:d(2025,11,3), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardItau.id, statementId:siOct.id },

    // ═══════════════════ CC ITAÚ — Nov statement (Oct 21 – Nov 20) — PAID ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:567.80, description:'Supermercado',              date:d(2025,10,24),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siNov.id },
    // Installment plan parcela 2
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:800.00, description:'TV Sony 55" Bravia (2/3)',  date:d(2025,10,25),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siNov.id, installmentPlanId:installPlan.id, installmentNumber:2 },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:1890.00,description:'Mag. Luiza — Geladeira Brastemp', date:d(2025,11,2),accountId:null,paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siNov.id },
    { userId:UID, categoryId:C.trans,  type:'EXPENSE', amount:165.00, description:'Posto Shell',               date:d(2025,11,5), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siNov.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:345.00, description:'Restaurante',               date:d(2025,11,8), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siNov.id },
    { userId:UID, categoryId:C.vest,   type:'EXPENSE', amount:287.90, description:'Roupas C&A',                date:d(2025,11,15),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siNov.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:4055.70,description:'Pgto Fatura Itaú — Nov/25', date:d(2025,12,3), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardItau.id, statementId:siNov.id },

    // ═══════════════════ CC ITAÚ — Dec statement (Nov 21 – Dec 20) — PAID ═══
    // Installment plan parcela 3
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:800.00, description:'TV Sony 55" Bravia (3/3)',  date:d(2025,11,24),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id, installmentPlanId:installPlan.id, installmentNumber:3 },
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:2340.00,description:'Passagens Aéreas — Natal',  date:d(2025,11,28),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:456.80, description:'Mercado Livre',             date:d(2025,12,2), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id },
    { userId:UID, categoryId:C.trans,  type:'EXPENSE', amount:195.00, description:'Posto BR',                  date:d(2025,12,5), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:589.00, description:'Confraternização',          date:d(2025,12,10),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id },
    { userId:UID, categoryId:C.vest,   type:'EXPENSE', amount:1245.80,description:'Shopping — presentes',      date:d(2025,12,15),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id },
    { userId:UID, categoryId:C.vest,   type:'EXPENSE', amount:487.90, description:'Zara',                      date:d(2025,12,18),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siDec.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:6114.50,description:'Pgto Fatura Itaú — Dez/25', date:d(2026,1,3),  accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardItau.id, statementId:siDec.id },

    // ═══════════════════ CC ITAÚ — Jan statement (Dec 21 – Jan 20) — PAID ═══
    { userId:UID, categoryId:C.lazer,  type:'EXPENSE', amount:1240.00,description:'Passagem Natal / Viagem',   date:d(2025,12,24),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:389.60, description:'Mercado Extra',             date:d(2025,12,28),accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:345.00, description:'Restaurante',               date:d(2026,1,3),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siJan.id },
    { userId:UID, categoryId:C.trans,  type:'EXPENSE', amount:170.00, description:'Posto',                     date:d(2026,1,8),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siJan.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:189.50, description:'Americanas',                date:d(2026,1,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siJan.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:234.00, description:'Restaurante',               date:d(2026,1,15), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siJan.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:2568.10,description:'Pgto Fatura Itaú — Jan/26', date:d(2026,2,3),  accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardItau.id, statementId:siJan.id },

    // ═══════════════════ CC ITAÚ — Feb statement (Jan 21 – Feb 20) — CLOSED ═══
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:498.70, description:'Supermercado Pão de Açúcar', date:d(2026,1,23), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:267.50, description:'Restaurante',                date:d(2026,1,28), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    { userId:UID, categoryId:C.trans,  type:'EXPENSE', amount:165.00, description:'Posto BR',                   date:d(2026,2,1),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    { userId:UID, categoryId:C.vest,   type:'EXPENSE', amount:389.90, description:'Renner',                     date:d(2026,2,5),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:234.80, description:'Amazon',                     date:d(2026,2,8),  accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:345.00, description:'Restaurante',                date:d(2026,2,12), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    { userId:UID, categoryId:C.alim,   type:'EXPENSE', amount:521.30, description:'Supermercado Extra',         date:d(2026,2,18), accountId:null, paymentMethod:'CREDIT_CARD', creditCardId:cardItau.id, statementId:siFeb.id },
    // Partial payment Feb 15
    { userId:UID, categoryId:C.outros, type:'EXPENSE', amount:1000.00,description:'Pgto Parcial Fatura Itaú — Fev/26', date:d(2026,2,15), accountId:accChecking.id, paymentMethod:'PIX', isCardPayment:true, creditCardId:cardItau.id, statementId:siFeb.id },

    // ═══════════════════ INVESTMENT YIELDS ═══════════════════
    { userId:UID, categoryId:C.invest, type:'INCOME', amount:180.00, description:'Dividendos PETR4 — Dez/25',   date:d(2025,12,15), accountId:accInvest.id },
    { userId:UID, categoryId:C.invest, type:'INCOME', amount:120.00, description:'Rendimento BOVA11 — Jan/26',  date:d(2026,1,10),  accountId:accInvest.id },
    { userId:UID, categoryId:C.invest, type:'INCOME', amount:340.00, description:'Rendimento Tesouro SELIC — Dez/25', date:d(2025,12,1), accountId:accInvest.id },
    { userId:UID, categoryId:C.invest, type:'INCOME', amount:320.00, description:'Rendimento Tesouro SELIC — Jan/26', date:d(2026,1,1),  accountId:accInvest.id },
    { userId:UID, categoryId:C.invest, type:'INCOME', amount:310.00, description:'Rendimento Tesouro SELIC — Fev/26', date:d(2026,2,1),  accountId:accInvest.id },
  ]

  // ─── Transfers (checking → savings) ──────────────────────────────────────
  for (const [date, amount, tfId, label] of transfers) {
    txRows.push({ userId:UID, categoryId:C.outros,  type:'EXPENSE', amount, description:`Transferência p/ Poupança — ${label}`, date, accountId:accChecking.id, transferId:tfId, paymentMethod:'PIX' })
    txRows.push({ userId:UID, categoryId:C.outroInc, type:'INCOME', amount, description:`Transferência recebida — ${label}`,     date, accountId:accSavings.id,  transferId:tfId })
  }

  // Create all transactions in batches
  await prisma.transaction.createMany({ data: txRows as any })
  console.log(`   ✓ ${txRows.length} transactions created`)

  // ─── 9. BUDGETS (current month Feb 2026 + Dec 2025) ──────────────────────
  console.log('📊 Creating budgets...')
  const budgetData = [
    // Feb 2026
    { userId:UID, categoryId:C.alim,   month:2, year:2026, amount:1500 },
    { userId:UID, categoryId:C.trans,  month:2, year:2026, amount:500  },
    { userId:UID, categoryId:C.saude,  month:2, year:2026, amount:400  },
    { userId:UID, categoryId:C.lazer,  month:2, year:2026, amount:600  },
    { userId:UID, categoryId:C.morad,  month:2, year:2026, amount:2500 },
    { userId:UID, categoryId:C.educ,   month:2, year:2026, amount:400  },
    { userId:UID, categoryId:C.vest,   month:2, year:2026, amount:500  },
    { userId:UID, categoryId:C.outros, month:2, year:2026, amount:400  },
    // Dec 2025
    { userId:UID, categoryId:C.alim,   month:12, year:2025, amount:1500 },
    { userId:UID, categoryId:C.morad,  month:12, year:2025, amount:2500 },
    { userId:UID, categoryId:C.lazer,  month:12, year:2025, amount:800  },
    { userId:UID, categoryId:C.vest,   month:12, year:2025, amount:1000 },
    // Jan 2026
    { userId:UID, categoryId:C.alim,   month:1, year:2026, amount:1200 },
    { userId:UID, categoryId:C.trans,  month:1, year:2026, amount:400  },
    { userId:UID, categoryId:C.morad,  month:1, year:2026, amount:2500 },
    { userId:UID, categoryId:C.saude,  month:1, year:2026, amount:300  },
    { userId:UID, categoryId:C.educ,   month:1, year:2026, amount:400  },
  ]
  await prisma.budget.createMany({ data: budgetData })
  console.log('   ✓ Budgets created')

  console.log('\n✅ Mock seed complete!')
  console.log('   Accounts: 4 | Liabilities: 2 | Investment positions: 3')
  console.log('   Goals: 3 | Credit cards: 2 | Statements: 13')
  console.log(`   Transactions: ${txRows.length} | Budgets: ${budgetData.length}`)
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
