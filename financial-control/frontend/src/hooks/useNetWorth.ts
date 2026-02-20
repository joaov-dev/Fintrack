import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { NetWorthSnapshot, NetWorthPoint } from '@/types'

export function useNetWorth(historyMonths = 12) {
  const [snapshot, setSnapshot] = useState<NetWorthSnapshot | null>(null)
  const [history, setHistory] = useState<NetWorthPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const [snapshotRes, historyRes] = await Promise.all([
        api.get('/analytics/net-worth'),
        api.get('/analytics/net-worth/history', { params: { months: historyMonths } }),
      ])
      setSnapshot(snapshotRes.data)
      setHistory(historyRes.data)
    } finally {
      setIsLoading(false)
    }
  }, [historyMonths])

  useEffect(() => { fetch() }, [fetch])

  return { snapshot, history, isLoading, refetch: fetch }
}
