import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { CategorizationRule } from '@/types'

export function useRules() {
  const [rules, setRules] = useState<CategorizationRule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/categorization-rules')
      setRules(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/categorization-rules', payload)
    await fetch()
    return data as CategorizationRule
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/categorization-rules/${id}`, payload)
    await fetch()
    return data as CategorizationRule
  }

  const remove = async (id: string) => {
    await api.delete(`/categorization-rules/${id}`)
    await fetch()
  }

  return { rules, isLoading, refetch: fetch, create, update, remove }
}
