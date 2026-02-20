import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Account } from '@/types'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/accounts')
      setAccounts(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/accounts', payload)
    await fetch()
    return data
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/accounts/${id}`, payload)
    await fetch()
    return data
  }

  const remove = async (id: string) => {
    await api.delete(`/accounts/${id}`)
    await fetch()
  }

  return { accounts, isLoading, refetch: fetch, create, update, remove }
}
