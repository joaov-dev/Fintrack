import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { InvestmentPosition } from '@/types'

export function useInvestmentPositions(accountId: string | null) {
  const [positions, setPositions] = useState<InvestmentPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!accountId) { setPositions([]); return }
    setIsLoading(true)
    try {
      const { data } = await api.get('/investment-positions', { params: { accountId } })
      setPositions(data)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/investment-positions', payload)
    await fetch()
    return data as InvestmentPosition
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/investment-positions/${id}`, payload)
    await fetch()
    return data as InvestmentPosition
  }

  const remove = async (id: string) => {
    await api.delete(`/investment-positions/${id}`)
    await fetch()
  }

  const addYield = async (id: string, payload: { amount: number; date: string; description?: string }) => {
    const { data } = await api.post(`/investment-positions/${id}/yield`, payload)
    await fetch()
    return data
  }

  return { positions, isLoading, refetch: fetch, create, update, remove, addYield }
}
