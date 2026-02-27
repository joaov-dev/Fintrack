import { useState, useCallback } from 'react'
import { InvestmentMovement, InvestmentMovementType } from '@/types'
import { api } from '@/services/api'

export interface AddMovementPayload {
  type: InvestmentMovementType
  amount: number
  quantity?: number | null
  unitPrice?: number | null
  date: string
  description?: string | null
}

export function useInvestmentMovements() {
  const [movements, setMovements] = useState<InvestmentMovement[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAll = useCallback(async (params?: {
    positionId?: string
    type?: string
    from?: string
    to?: string
  }) => {
    setIsLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.positionId) query.set('positionId', params.positionId)
      if (params?.type)       query.set('type', params.type)
      if (params?.from)       query.set('from', params.from)
      if (params?.to)         query.set('to', params.to)
      const { data } = await api.get<InvestmentMovement[]>(`/investment-movements?${query}`)
      setMovements(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addMovement = useCallback(async (positionId: string, payload: AddMovementPayload) => {
    const { data } = await api.post<InvestmentMovement>(
      `/investment-positions/${positionId}/movements`,
      payload,
    )
    return data
  }, [])

  const deleteMovement = useCallback(async (positionId: string, movementId: string) => {
    await api.delete(`/investment-positions/${positionId}/movements/${movementId}`)
  }, [])

  return { movements, isLoading, fetchAll, addMovement, deleteMovement }
}
