/**
 * stripe-sync.ts
 *
 * Creates Stripe products and prices for every paid plan in the database
 * and writes the resulting IDs back to the Price records.
 *
 * Run once after setting STRIPE_SECRET_KEY in .env:
 *   npm run stripe:sync
 *
 * The script is idempotent — existing Stripe IDs in the DB are never
 * overwritten. You can safely re-run it if something was interrupted.
 */

import 'dotenv/config'
import Stripe from 'stripe'
import { PrismaClient, BillingCycle } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Plan display metadata ────────────────────────────────────────────────────
const PLAN_DESCRIPTIONS: Record<string, string> = {
  PRO:      'Plano Pro — controle total das suas finanças pessoais',
  BUSINESS: 'Plano Business — gestão patrimonial e investimentos avançados',
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.error('\n❌  STRIPE_SECRET_KEY não encontrada no .env\n')
    console.error('   Adicione a chave secreta do Stripe e tente novamente.')
    console.error('   Exemplo: STRIPE_SECRET_KEY=sk_test_...\n')
    process.exit(1)
  }

  const isTestMode = stripeKey.startsWith('sk_test_')
  console.log(`\n🔄  Stripe Sync — modo: ${isTestMode ? 'TEST' : 'LIVE'}`)
  console.log('─'.repeat(50))

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

  // Load paid plans with their prices from the DB
  const plans = await prisma.plan.findMany({
    where: { code: { in: ['PRO', 'BUSINESS'] }, isActive: true },
    include: { prices: { where: { isActive: true }, orderBy: { billingCycle: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  })

  if (plans.length === 0) {
    console.error('\n❌  Nenhum plano encontrado no banco. Execute primeiro: npm run db:seed\n')
    process.exit(1)
  }

  let created = 0
  let skipped = 0

  for (const plan of plans) {
    console.log(`\n📦  Plano: ${plan.name} (${plan.code})`)

    // ── Stripe Product ──────────────────────────────────────────────────────
    // Re-use product ID if any price already has one stored
    let stripeProductId: string | null =
      plan.prices.find((p) => p.stripeProductId)?.stripeProductId ?? null

    if (stripeProductId) {
      console.log(`   Product ✓ (já existente): ${stripeProductId}`)
    } else {
      const product = await stripe.products.create({
        name: `DominaHub ${plan.name}`,
        description: PLAN_DESCRIPTIONS[plan.code] ?? `Plano ${plan.name}`,
        metadata: {
          planCode: plan.code,
          planId:   plan.id,
          source:   'dominahub',
        },
      })
      stripeProductId = product.id
      console.log(`   Product ✓ (criado):      ${stripeProductId}`)
      created++
    }

    // ── Stripe Prices ───────────────────────────────────────────────────────
    for (const price of plan.prices) {
      const label = price.billingCycle === BillingCycle.MONTHLY ? 'Mensal' : 'Anual '

      // Already synced → skip price, but patch productId if missing
      if (price.stripePriceId) {
        if (!price.stripeProductId && stripeProductId) {
          await prisma.price.update({
            where: { id: price.id },
            data: { stripeProductId },
          })
        }
        console.log(`   Price  ${label} ✓ (já existente): ${price.stripePriceId}`)
        skipped++
        continue
      }

      // Stripe prices are immutable; create a new one
      const interval = price.billingCycle === BillingCycle.MONTHLY ? 'month' : 'year'
      const stripePrice = await stripe.prices.create({
        product:   stripeProductId,
        currency:  price.currency.toLowerCase(),
        unit_amount: price.amountCents,
        recurring: { interval },
        metadata: {
          planCode:    plan.code,
          billingCycle: price.billingCycle,
          priceId:     price.id,
          source:      'dominahub',
        },
      })

      // Save IDs back to DB
      await prisma.price.update({
        where: { id: price.id },
        data: {
          stripePriceId:   stripePrice.id,
          stripeProductId,
        },
      })

      console.log(`   Price  ${label} ✓ (criado):      ${stripePrice.id}`)
      created++
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log(`✅  Concluído — ${created} item(s) criado(s), ${skipped} já existia(m)\n`)

  console.log('📋  Próximos passos:')
  console.log()
  console.log('  1. Configure o Webhook no Stripe Dashboard')
  console.log('     https://dashboard.stripe.com/webhooks')
  console.log()
  console.log('     URL do endpoint:')
  console.log('       https://SEU_DOMINIO/api/billing/webhook/stripe')
  console.log()
  console.log('     Eventos a escutar:')
  console.log('       • customer.subscription.created')
  console.log('       • customer.subscription.updated')
  console.log('       • customer.subscription.deleted')
  console.log('       • checkout.session.completed')
  console.log('       • invoice.payment_failed')
  console.log()
  console.log('  2. Copie o "Signing secret" do webhook e adicione ao .env:')
  console.log('       STRIPE_WEBHOOK_SECRET=whsec_...')
  console.log()
  console.log('  3. Para testes locais, use o Stripe CLI:')
  console.log('       stripe listen --forward-to localhost:3333/api/billing/webhook/stripe')
  console.log()
  if (isTestMode) {
    console.log('  ⚠️   Você está usando chaves de TESTE.')
    console.log('       Quando for ao ar, substitua por chaves LIVE e rode este script novamente.')
    console.log()
  }
}

main()
  .catch((err) => {
    console.error('\n❌  Erro durante a sincronização:')
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
