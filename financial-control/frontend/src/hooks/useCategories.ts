import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Category } from '@/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/categories')
      setCategories(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload: unknown) => {
    const { data } = await api.post('/categories', payload)
    await fetch()
    return data
  }

  const update = async (id: string, payload: unknown) => {
    const { data } = await api.put(`/categories/${id}`, payload)
    await fetch()
    return data
  }

  const remove = async (id: string) => {
    await api.delete(`/categories/${id}`)
    await fetch()
  }

  return { categories, isLoading, refetch: fetch, create, update, remove }
}
