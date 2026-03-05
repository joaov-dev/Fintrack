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
  /** Max records to fetch per page (server cap: 100). Default: 100. */
  limit?: number
  page?: number
}

interface PaginatedMeta {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export function useTransactions(filters: Filters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState<PaginatedMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/transactions', { params: filters })
      // Support both paginated { data, meta } and legacy flat array responses
      if (Array.isArray(data)) {
        setTransactions(data)
        setMeta(null)
      } else {
        setTransactions(data.data ?? [])
        setMeta(data.meta ?? null)
      }
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

  return { transactions, meta, isLoading, refetch: fetch, create, update, remove }
}
