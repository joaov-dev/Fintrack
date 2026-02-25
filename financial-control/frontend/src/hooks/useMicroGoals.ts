import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { MicroGoal } from '@/types'

interface CreateMicroGoalPayload {
  name: string
  scopeType: 'CATEGORY' | 'TOTAL_SPEND'
  scopeRefId?: string | null
  limitAmount: number
  startDate: string
  endDate: string
}

interface UpdateMicroGoalPayload {
  name?: string
  limitAmount?: number
  endDate?: string
}

export function useMicroGoals() {
  const [microGoals, setMicroGoals] = useState<MicroGoal[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/micro-goals')
      setMicroGoals(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (payload: CreateMicroGoalPayload) => {
    await api.post('/micro-goals', payload)
    await fetch()
  }, [fetch])

  const update = useCallback(async (id: string, payload: UpdateMicroGoalPayload) => {
    await api.patch(`/micro-goals/${id}`, payload)
    await fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/micro-goals/${id}`)
    await fetch()
  }, [fetch])

  return { microGoals, isLoading, refetch: fetch, create, update, remove }
}
