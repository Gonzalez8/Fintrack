import client from './client'
import type { Transaction, Dividend, Interest, PaginatedResponse } from '@/types'

export const transactionsApi = {
  list: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Transaction>>('/transactions/', { params }),
  create: (data: Partial<Transaction>) =>
    client.post<Transaction>('/transactions/', data),
  update: (id: string, data: Partial<Transaction>) =>
    client.patch<Transaction>(`/transactions/${id}/`, data),
  delete: (id: string) => client.delete(`/transactions/${id}/`),
}

export const dividendsApi = {
  list: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Dividend>>('/dividends/', { params }),
  create: (data: Partial<Dividend>) =>
    client.post<Dividend>('/dividends/', data),
  update: (id: string, data: Partial<Dividend>) =>
    client.patch<Dividend>(`/dividends/${id}/`, data),
  delete: (id: string) => client.delete(`/dividends/${id}/`),
}

export const interestsApi = {
  list: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Interest>>('/interests/', { params }),
  create: (data: Partial<Interest>) =>
    client.post<Interest>('/interests/', data),
  update: (id: string, data: Partial<Interest>) =>
    client.patch<Interest>(`/interests/${id}/`, data),
  delete: (id: string) => client.delete(`/interests/${id}/`),
}
