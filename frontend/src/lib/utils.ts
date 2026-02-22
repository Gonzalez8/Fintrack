import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import axios from 'axios'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const moneyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || value === '') return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return moneyFormatter.format(num)
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value == null || value === '') return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function formatQty(value: string | number | null | undefined): string {
  if (value == null || value === '') return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return num.toLocaleString('es-ES', { maximumFractionDigits: 6 })
}

export function formatErrors(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data
    if (typeof data === 'string') return data
    if (typeof data.detail === 'string') return data.detail
    const messages: string[] = []
    for (const [field, errs] of Object.entries(data)) {
      const list = Array.isArray(errs) ? errs.join(', ') : String(errs)
      messages.push(`${field}: ${list}`)
    }
    return messages.join(' | ')
  }
  return 'Error desconocido'
}
