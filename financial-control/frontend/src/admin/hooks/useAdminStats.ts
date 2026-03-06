import { useState, useEffect, useCallback } from 'react'
import adminApi from '../services/adminApi'

export interface AdminStats {
  totals: {
    users: number
    activeUsers: number
    mauUsers: number
    proSubscribers: number
    businessSubscribers: number
    mrrCents: number
    conversionFreeToPaid: number
    churnThisPeriod: number
  }
  timeseries: {
    newUsers: { date: string; count: number }[]
  }
  planDistribution: { plan: string; count: number }[]
  recentSignups: { id: string; name: string; email: string; currentPlan: string; createdAt: string }[]
  recentSubEvents: { id: string; eventType: string; userId: string | null; userEmail: string | null; createdAt: string }[]
  period: { from: string; to: string }
}

export function useAdminStats(days: 7 | 30 | 90 = 30) {
  const [data, setData] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
      const { data: res } = await adminApi.get('/stats', {
        params: { from: from.toISOString(), to: to.toISOString() },
      })
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
