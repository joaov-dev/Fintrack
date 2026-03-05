import { Request, Response } from 'express'
import Stripe from 'stripe'
import { z } from 'zod'
import { BillingCycle, PlanCode, SubscriptionStatus } from '@prisma/client'
import { prisma } from '../services/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'
import { getStripeClient, hasStripeConfig } from '../services/stripe.service'
import { resolveEntitlements } from '../services/billing.service'

const checkoutSchema = z.object({
  priceId: z.string().optional(),
  planCode: z.enum(['PRO', 'BUSINESS']).optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing': return 'TRIALING'
    case 'active': return 'ACTIVE'
    case 'past_due': return 'PAST_DUE'
    case 'canceled': return 'CANCELED'
    case 'incomplete': return 'INCOMPLETE'
    case 'incomplete_expired': return 'INCOMPLETE_EXPIRED'
    case 'unpaid': return 'UNPAID'
    default: return 'ACTIVE'
  }
}

async function getOrCreateBillingCustomer(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuário não encontrado')

  const existing = await prisma.billingCustomer.findUnique({ where: { userId } })
  if (existing) return existing

  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  })

  const billingCustomer = await prisma.billingCustomer.create({
    data: {
      userId,
      stripeCustomerId: customer.id,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { billingCustomerId: billingCustomer.id },
  })

  return billingCustomer
}

export async function getPlans(_req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      prices: { where: { isActive: true }, orderBy: { billingCycle: 'asc' } },
      featureGates: { orderBy: { featureKey: 'asc' } },
    },
  })
  return res.json(plans)
}

export async function getCurrentSubscription(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentPlan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      graceUntil: true,
      subscriptions: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: { plan: true, price: true },
      },
    },
  })

  return res.json({
    user,
    subscription: user?.subscriptions?.[0] ?? null,
  })
}

export async function getEntitlements(req: AuthRequest, res: Response) {
  const ent = await resolveEntitlements(req.userId!)
  return res.json(ent)
}

export async function createCheckoutSession(req: AuthRequest, res: Response) {
  if (!hasStripeConfig()) {
    return res.status(503).json({ error: 'Stripe não configurado no servidor' })
  }

  const payload = checkoutSchema.parse(req.body)
  const userId = req.userId!

  let price = null
  if (payload.priceId) {
    price = await prisma.price.findUnique({ where: { id: payload.priceId }, include: { plan: true } })
  } else if (payload.planCode && payload.billingCycle) {
    price = await prisma.price.findFirst({
      where: {
        billingCycle: payload.billingCycle,
        isActive: true,
        plan: { code: payload.planCode, isActive: true },
      },
      include: { plan: true },
    })
  }

  if (!price || !price.stripePriceId) {
    return res.status(400).json({ error: 'Preço inválido ou não configurado no Stripe' })
  }

  // ── Detect existing active subscription and perform upgrade if needed ────────
  const existingSub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } },
    include: { plan: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (existingSub?.stripeSubscriptionId) {
    if (existingSub.plan.code === price.plan.code) {
      return res.status(400).json({ error: 'Você já possui este plano ativo' })
    }

    // Different plan → upgrade/downgrade by swapping the price on the existing subscription
    const stripeClient = getStripeClient()
    const stripeSub = await stripeClient.subscriptions.retrieve(existingSub.stripeSubscriptionId)
    const existingItem = stripeSub.items.data[0]
    const updatedSub = await stripeClient.subscriptions.update(existingSub.stripeSubscriptionId, {
      items: [{ id: existingItem.id, price: price.stripePriceId }],
      proration_behavior: 'create_prorations',
      metadata: { userId, planCode: price.plan.code, priceId: price.id },
    })
    await persistFromStripeSubscription(updatedSub)
    return res.json({ upgraded: true })
  }

  const billingCustomer = await getOrCreateBillingCustomer(userId)
  const stripe = getStripeClient()

  const isProMonthly = price.plan.code === 'PRO' && price.billingCycle === 'MONTHLY'
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: billingCustomer.stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [{ price: price.stripePriceId, quantity: 1 }],
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    subscription_data: {
      metadata: {
        userId,
        planCode: price.plan.code,
        priceId: price.id,
      },
      trial_period_days: isProMonthly ? 7 : undefined,
    },
    metadata: {
      userId,
      planCode: price.plan.code,
      priceId: price.id,
    },
  })

  return res.status(201).json({ url: session.url, id: session.id })
}

export async function createPortalSession(req: AuthRequest, res: Response) {
  if (!hasStripeConfig()) {
    return res.status(503).json({ error: 'Stripe não configurado no servidor' })
  }

  const { returnUrl } = z.object({ returnUrl: z.string().url() }).parse(req.body)
  const billingCustomer = await prisma.billingCustomer.findUnique({ where: { userId: req.userId! } })
  if (!billingCustomer) {
    return res.status(404).json({ error: 'Cliente de billing não encontrado' })
  }

  const stripe = getStripeClient()
  const portal = await stripe.billingPortal.sessions.create({
    customer: billingCustomer.stripeCustomerId,
    return_url: returnUrl,
  })

  return res.json({ url: portal.url })
}

export async function cancelSubscription(req: AuthRequest, res: Response) {
  if (!hasStripeConfig()) {
    return res.status(503).json({ error: 'Stripe não configurado no servidor' })
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: req.userId!, status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } },
    orderBy: { updatedAt: 'desc' },
  })

  if (!sub?.stripeSubscriptionId) {
    return res.status(404).json({ error: 'Assinatura ativa não encontrada' })
  }

  const stripe = getStripeClient()
  await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true })

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  })

  return res.json(updated)
}

export async function resumeSubscription(req: AuthRequest, res: Response) {
  if (!hasStripeConfig()) {
    return res.status(503).json({ error: 'Stripe não configurado no servidor' })
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: req.userId!, status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } },
    orderBy: { updatedAt: 'desc' },
  })

  if (!sub?.stripeSubscriptionId) {
    return res.status(404).json({ error: 'Assinatura ativa não encontrada' })
  }

  const stripe = getStripeClient()
  await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false })

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: false },
  })

  return res.json(updated)
}

async function persistFromStripeSubscription(subscription: Stripe.Subscription) {
  const userId = String(subscription.metadata?.userId ?? '')
  if (!userId) return

  const planCode = String(subscription.metadata?.planCode ?? '') as PlanCode
  const priceId = String(subscription.metadata?.priceId ?? '')

  const plan = await prisma.plan.findFirst({ where: { code: planCode || 'PRO' } })
  if (!plan) return

  const dbPrice = priceId
    ? await prisma.price.findUnique({ where: { id: priceId } })
    : await prisma.price.findFirst({ where: { planId: plan.id, stripePriceId: subscription.items.data[0]?.price?.id ?? '' } })

  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const billingCustomer = await prisma.billingCustomer.findFirst({ where: { stripeCustomerId: customer } })

  const status = mapStripeStatus(subscription.status)
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null

  const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } })
  const data = {
    userId,
    planId: plan.id,
    priceId: dbPrice?.id ?? null,
    billingCustomerId: billingCustomer?.id ?? null,
    status,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    trialEndsAt,
    graceUntil: status === 'PAST_DUE' ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
  }

  if (existing) {
    await prisma.subscription.update({ where: { id: existing.id }, data })
  } else {
    await prisma.subscription.create({ data })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentPlan: plan.code,
      subscriptionStatus: status,
      subscriptionEndsAt: periodEnd,
      trialEndsAt,
      graceUntil: status === 'PAST_DUE' ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
      billingCustomerId: billingCustomer?.id ?? undefined,
    },
  })
}

export async function stripeWebhook(req: Request, res: Response) {
  if (!hasStripeConfig() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook Stripe não configurado' })
  }

  const signature = req.headers['stripe-signature']
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Assinatura Stripe ausente' })
  }

  const stripe = getStripeClient()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    return res.status(400).json({ error: 'Webhook inválido', details: String(err) })
  }

  const existing = await prisma.subscriptionEvent.findFirst({
    where: { source: 'stripe', externalEventId: event.id },
  })
  if (existing) return res.json({ received: true, duplicate: true })

  const eventType = event.type
  const eventPayload = event.data.object as Stripe.Event.Data.Object

  let userId: string | null = null
  let subscriptionId: string | null = null

  if (eventType.startsWith('customer.subscription.')) {
    const subscription = eventPayload as Stripe.Subscription
    userId = String(subscription.metadata?.userId ?? '') || null
    const dbSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } })
    subscriptionId = dbSub?.id ?? null

    await persistFromStripeSubscription(subscription)
  }

  if (eventType === 'checkout.session.completed') {
    const session = eventPayload as Stripe.Checkout.Session
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    userId = String(session.metadata?.userId ?? '') || null

    if (subId) {
      const subscription = await stripe.subscriptions.retrieve(subId)
      await persistFromStripeSubscription(subscription)
      const dbSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } })
      subscriptionId = dbSub?.id ?? null
    }
  }

  if (eventType === 'invoice.payment_failed') {
    const invoice = eventPayload as Stripe.Invoice
    const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
    if (subId) {
      const dbSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } })
      if (dbSub) {
        subscriptionId = dbSub.id
        userId = dbSub.userId
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: 'PAST_DUE', graceUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        })
        await prisma.user.update({
          where: { id: dbSub.userId },
          data: { subscriptionStatus: 'PAST_DUE', graceUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        })
      }
    }
  }

  await prisma.subscriptionEvent.create({
    data: {
      source: 'stripe',
      eventType,
      externalEventId: event.id,
      userId,
      subscriptionId,
      payload: event as unknown as object,
    },
  })

  return res.json({ received: true })
}
