import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { MonthlyProjection } from '@/types'

export function useMonthlyProjection() {
  const [data, setData] = useState<MonthlyProjection | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/analytics/monthly-projection')
      setData(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, isLoading, refetch: fetch }
}
