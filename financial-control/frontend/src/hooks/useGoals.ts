import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { GoalProgress } from '@/types'

export function useGoals() {
  const [goals, setGoals] = useState<GoalProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/goals')
      setGoals(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/goals', payload)
    await fetch()
    return data
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/goals/${id}`, payload)
    await fetch()
    return data
  }

  const remove = async (id: string) => {
    await api.delete(`/goals/${id}`)
    await fetch()
  }

  return { goals, isLoading, refetch: fetch, create, update, remove }
}
