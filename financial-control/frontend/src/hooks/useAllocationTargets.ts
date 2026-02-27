import { useState, useEffect, useCallback } from 'react'
import { AllocationTarget, InvestmentPositionType } from '@/types'
import { api } from '@/services/api'

export function useAllocationTargets() {
  const [targets, setTargets] = useState<AllocationTarget[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<AllocationTarget[]>('/investment-allocation-targets')
      setTargets(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (newTargets: { type: InvestmentPositionType; targetPct: number }[]) => {
    const { data } = await api.post<AllocationTarget[]>('/investment-allocation-targets', newTargets)
    setTargets(data)
    return data
  }, [])

  const getTarget = useCallback(
    (type: InvestmentPositionType) => targets.find((t) => t.type === type)?.targetPct ?? 0,
    [targets],
  )

  return { targets, isLoading, refetch: fetch, save, getTarget }
}
