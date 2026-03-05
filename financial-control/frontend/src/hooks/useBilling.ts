import { useCallback, useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Entitlements, BillingCycle, PlanCode } from '@/types'

export interface PlanPrice {
  id: string
  billingCycle: BillingCycle
  amountCents: number
  currency: string
}

export interface BillingPlan {
  id: string
  code: PlanCode
  name: string
  description: string | null
  prices: PlanPrice[]
}

export function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/billing/entitlements')
      setData(res.data as Entitlements)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  return { data, isLoading, reload: load }
}

export function useBillingPlans() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/billing/plans')
      setPlans(res.data as BillingPlan[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  return { plans, isLoading, reload: load }
}

export async function startCheckout(
  planCode: PlanCode,
  billingCycle: BillingCycle,
): Promise<{ upgraded?: boolean; url?: string; id?: string }> {
  const origin = window.location.origin
  const { data } = await api.post('/billing/checkout-session', {
    planCode,
    billingCycle,
    successUrl: `${origin}/checkout/success`,
    cancelUrl: `${origin}/checkout/canceled`,
  })

  if (data?.url) {
    window.location.href = data.url
  }

  return data ?? {}
}

export async function openBillingPortal() {
  const { data } = await api.post('/billing/portal-session', {
    returnUrl: `${window.location.origin}/billing`,
  })

  if (data?.url) {
    window.location.href = data.url
  }
}

export async function cancelSubscription() {
  await api.post('/billing/cancel')
}

export async function resumeSubscription() {
  await api.post('/billing/resume')
}
