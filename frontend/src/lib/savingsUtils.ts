import type { MonthlySavingsPoint } from '@/types'

export type Range = '3M' | '6M' | '1A' | '2A' | 'MAX'

export const RANGES: { key: Range; label: string }[] = [
  { key: '3M',  label: '3M' },
  { key: '6M',  label: '6M' },
  { key: '1A',  label: '1A' },
  { key: '2A',  label: '2A' },
  { key: 'MAX', label: 'MAX' },
]

export const RANGE_LABELS: Record<Range, string> = {
  '3M':  'últimos 3 meses',
  '6M':  'últimos 6 meses',
  '1A':  'último año',
  '2A':  'últimos 2 años',
  'MAX': 'historial completo',
}

export function filterByRange(months: MonthlySavingsPoint[], range: Range): MonthlySavingsPoint[] {
  if (!months.length || range === 'MAX') return months
  const n = { '3M': 3, '6M': 6, '1A': 12, '2A': 24 }[range]
  return months.slice(-n)
}
