import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Liability } from '@/types'

export function useLiabilities() {
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/liabilities')
      setLiabilities(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/liabilities', payload)
    await fetch()
    return data as Liability
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/liabilities/${id}`, payload)
    await fetch()
    return data as Liability
  }

  const remove = async (id: string) => {
    await api.delete(`/liabilities/${id}`)
    await fetch()
  }

  return { liabilities, isLoading, refetch: fetch, create, update, remove }
}
