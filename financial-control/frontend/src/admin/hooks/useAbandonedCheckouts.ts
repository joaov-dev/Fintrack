import { useState, useEffect, useCallback } from 'react'
import adminApi from '../services/adminApi'

export type CouponStatus = 'NONE' | 'PENDING' | 'REDEEMED' | 'EXPIRED'

export interface AbandonedCheckoutRow {
  userId:             string
  userName:           string
  userEmail:          string
  planCode:           string
  billingCycle:       string
  attemptedAt:        string
  couponStatus:       CouponStatus
  promotionId:        string | null
  promotionExpiresAt: string | null
}

export interface AbandonedCheckoutsMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
}

interface Filters { days: number; page: number; limit: number }

export function useAbandonedCheckouts(filters: Filters) {
  const [data, setData]       = useState<AbandonedCheckoutRow[]>([])
  const [meta, setMeta]       = useState<AbandonedCheckoutsMeta>({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await adminApi.get('/abandoned-checkouts', { params: filters })
      setData(res.data)
      setMeta(res.meta)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err?.response?.data?.error ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [filters.days, filters.page, filters.limit]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  return { data, meta, loading, error, refetch: fetch }
}
