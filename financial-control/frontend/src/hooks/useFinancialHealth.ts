import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { FinancialHealthData } from '@/types'

export function useFinancialHealth() {
  const [data, setData] = useState<FinancialHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/analytics/financial-health')
      setData(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, isLoading, refetch: fetch }
}
