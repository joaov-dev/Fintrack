import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { InsightsResponse, InsightStatus } from '@/types'

export function useInsights(status?: InsightStatus) {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = status ? { status } : {}
      const res = await api.get('/analytics/insights', { params })
      setData(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => { fetch() }, [fetch])

  const dismiss = useCallback(async (id: string) => {
    await api.post(`/analytics/insights/${id}/dismiss`)
    await fetch()
  }, [fetch])

  const snooze = useCallback(async (id: string, days = 7) => {
    await api.post(`/analytics/insights/${id}/snooze`, { days })
    await fetch()
  }, [fetch])

  const reactivate = useCallback(async (id: string) => {
    await api.post(`/analytics/insights/${id}/reactivate`)
    await fetch()
  }, [fetch])

  return { data, isLoading, refetch: fetch, dismiss, snooze, reactivate }
}
