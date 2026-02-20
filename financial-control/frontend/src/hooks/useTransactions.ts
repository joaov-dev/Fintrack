import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Transaction } from '@/types'

interface Filters {
  month?: number
  year?: number
  type?: string
  categoryId?: string
  accountId?: string
  search?: string
  isRecurring?: boolean
  startDate?: string
  endDate?: string
}

export function useTransactions(filters: Filters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/transactions', { params: filters })
      setTransactions(data)
    } finally {
      setIsLoading(false)
    }
  }, [JSON.stringify(filters)]) // eslint-disable-line

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/transactions', payload)
    await fetch()
    return data
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/transactions/${id}`, payload)
    await fetch()
    return data
  }

  const remove = async (id: string) => {
    await api.delete(`/transactions/${id}`)
    await fetch()
  }

  return { transactions, isLoading, refetch: fetch, create, update, remove }
}
