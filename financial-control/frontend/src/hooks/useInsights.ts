import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { InsightsResponse } from '@/types'

export function useInsights() {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/analytics/insights')
      setData(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, isLoading, refetch: fetch }
}
