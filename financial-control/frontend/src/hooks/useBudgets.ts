import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Budget } from '@/types'

export function useBudgets(month: number, year: number) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/budgets', { params: { month, year } })
      setBudgets(data)
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetch() }, [fetch])

  const upsert = async (payload: unknown) => {
    const { data } = await api.post('/budgets', payload)
    await fetch()
    return data
  }

  const remove = async (id: string) => {
    await api.delete(`/budgets/${id}`)
    await fetch()
  }

  return { budgets, isLoading, refetch: fetch, upsert, remove }
}
