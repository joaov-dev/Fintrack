import { api } from '@/services/api'
import { TransferResult } from '@/types'

interface CreateTransferPayload {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description?: string
}

export function useTransfers() {
  const create = async (payload: CreateTransferPayload): Promise<TransferResult> => {
    const { data } = await api.post('/transfers', payload)
    return data
  }

  const remove = async (transferId: string): Promise<void> => {
    await api.delete(`/transfers/${transferId}`)
  }

  return { create, remove }
}
