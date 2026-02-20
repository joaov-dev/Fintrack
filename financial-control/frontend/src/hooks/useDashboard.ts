import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { DashboardData } from '@/types'

export function useDashboard(month: number, year: number) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: res } = await api.get('/dashboard/summary', {
        params: { month, year },
      })
      setData(res)
    } catch {
      setError('Erro ao carregar dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, isLoading, error, refetch: fetch }
}
