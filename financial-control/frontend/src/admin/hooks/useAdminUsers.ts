import { useState, useEffect, useCallback } from 'react'
import adminApi from '../services/adminApi'

export interface AdminUserRow {
  id: string
  name: string
  email: string
  currentPlan: string
  subscriptionStatus: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  lastLoginAt: string | null
}

export interface AdminUsersMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Filters {
  q?: string
  plan?: string
  status?: string
  page: number
  limit: number
  sortBy?: string
  sortDir?: string
}

export function useAdminUsers(filters: Filters) {
  const [data, setData] = useState<AdminUserRow[]>([])
  const [meta, setMeta] = useState<AdminUsersMeta>({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = { ...filters }
      // Remove empty values
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
      const { data: res } = await adminApi.get('/users', { params })
      setData(res.data)
      setMeta(res.meta)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  return { data, meta, loading, error, refetch: fetch }
}
