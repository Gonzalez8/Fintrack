import client from './client'
import type { Asset, Account, Settings, PaginatedResponse } from '@/types'

export const assetsApi = {
  list: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Asset>>('/assets/', { params }),
  get: (id: string) => client.get<Asset>(`/assets/${id}/`),
  create: (data: Partial<Asset>) => client.post<Asset>('/assets/', data),
  update: (id: string, data: Partial<Asset>) => client.patch<Asset>(`/assets/${id}/`, data),
  delete: (id: string) => client.delete(`/assets/${id}/`),
  updatePrices: () => client.post<{
    updated: number
    errors: string[]
    prices: Array<{ ticker: string; name: string; price: string }>
  }>('/assets/update-prices/'),
}

export const accountsApi = {
  list: () => client.get<PaginatedResponse<Account>>('/accounts/'),
  create: (data: Partial<Account>) => client.post<Account>('/accounts/', data),
  update: (id: string, data: Partial<Account>) => client.patch<Account>(`/accounts/${id}/`, data),
  delete: (id: string) => client.delete(`/accounts/${id}/`),
}

export const settingsApi = {
  get: () => client.get<Settings>('/settings/'),
  update: (data: Partial<Settings>) => client.put<Settings>('/settings/', data),
}
