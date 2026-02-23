import { useState, useCallback } from 'react'
import { api } from '@/services/api'
import { CardStatement, CardStatementDetail } from '@/types'

export function useCardStatements(cardId: string) {
  const [statements, setStatements] = useState<CardStatement[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!cardId) return
    setIsLoading(true)
    try {
      const { data } = await api.get(`/credit-cards/${cardId}/statements`)
      setStatements(data)
    } finally {
      setIsLoading(false)
    }
  }, [cardId])

  const getDetail = async (statementId: string): Promise<CardStatementDetail> => {
    const { data } = await api.get(`/credit-cards/${cardId}/statements/${statementId}`)
    return data
  }

  const pay = async (
    statementId: string,
    payload: { amount: number; fromAccountId: string; date: string; categoryId: string },
  ) => {
    const { data } = await api.post(
      `/credit-cards/${cardId}/statements/${statementId}/pay`,
      payload,
    )
    await fetch()
    return data
  }

  return { statements, isLoading, refetch: fetch, getDetail, pay }
}
