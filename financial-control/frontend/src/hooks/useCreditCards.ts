import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { CreditCard } from '@/types'

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/credit-cards')
      setCards(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/credit-cards', payload)
    await fetch()
    return data as CreditCard
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.patch(`/credit-cards/${id}`, payload)
    await fetch()
    return data as CreditCard
  }

  const archive = async (id: string) => {
    await api.post(`/credit-cards/${id}/archive`)
    await fetch()
  }

  return { cards, isLoading, refetch: fetch, create, update, archive }
}
