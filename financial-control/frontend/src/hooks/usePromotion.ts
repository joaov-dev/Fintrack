import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'

export interface ActivePromotion {
  discountPct: number
  expiresAt: string
  shownAt: string | null
}

export function usePromotion() {
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/billing/promotion')
      setPromotion(data ?? null)
    } catch {
      setPromotion(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markSeen = useCallback(async () => {
    try {
      await api.post('/billing/promotion/seen')
      setPromotion((prev) => prev ? { ...prev, shownAt: new Date().toISOString() } : prev)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => { load() }, [load])

  return { promotion, isLoading, refetch: load, markSeen }
}
