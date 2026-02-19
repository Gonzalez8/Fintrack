import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dividendsApi } from '@/api/transactions'
import { assetsApi } from '@/api/assets'
import { DataTable, type Column } from '@/components/app/DataTable'
import { MoneyCell } from '@/components/app/MoneyCell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Plus, Trash2 } from 'lucide-react'
import { NewAssetForm } from '@/components/app/NewAssetForm'
import { formatQty } from '@/lib/utils'
import type { Dividend } from '@/types'
import axios from 'axios'

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

function formatErrors(err: unknown): string {
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

export function DividendosPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['dividends', page, filters],
    queryFn: () => dividendsApi.list({ ...filters, page: String(page) }).then((r) => r.data),
  })
  const { data: assetsData } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.list({ page_size: '500' }).then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: Record<string, string>) => dividendsApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dividends'] })
      setDialogOpen(false)
      setError('')
    },
    onError: (err) => setError(formatErrors(err)),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => dividendsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dividends'] }),
  })

  const columns: Column<Dividend>[] = [
    { header: 'Fecha', accessor: 'date' },
    {
      header: 'Activo',
      accessor: (r) => (
        <div>
          <span className="font-medium">{r.asset_name}</span>
          {r.asset_ticker && <span className="ml-1 text-xs text-muted-foreground">{r.asset_ticker}</span>}
        </div>
      ),
    },
    { header: 'Acciones', accessor: (r) => formatQty(r.shares), className: 'text-right' },
    { header: 'Bruto', accessor: (r) => <MoneyCell value={r.gross} />, className: 'text-right' },
    { header: 'Impuesto', accessor: (r) => <MoneyCell value={r.tax} />, className: 'text-right' },
    { header: 'Neto', accessor: (r) => <MoneyCell value={r.net} />, className: 'text-right' },
    {
      header: '% Retencion',
      accessor: (r) => r.withholding_rate ? `${(parseFloat(r.withholding_rate) * 100).toFixed(2)}%` : '-',
      className: 'text-right',
    },
    {
      header: '',
      accessor: (r) => (
        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ),
    },
  ]

  const totalPages = data ? Math.ceil(data.count / 50) : 1
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const today = new Date().toISOString().slice(0, 10)

  const openDialog = () => {
    setForm({ date: today })
    setError('')
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dividendos</h2>
        <div className="flex gap-2">
          <a href="/api/export/dividends.csv" target="_blank" rel="noopener">
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />CSV</Button>
          </a>
          <Button size="sm" onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />Nuevo
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Select onValueChange={(v) => { setFilters((f) => ({ ...f, year: v === 'ALL' ? '' : v })); setPage(1) }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.results ?? []} loading={isLoading} page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Dividendo</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault()
            setError('')
            const net = parseFloat(form.net || '0')
            const tax = parseFloat(form.tax || '0')
            const gross = net + tax
            const withholding = gross > 0 ? (tax / gross) : 0
            createMut.mutate({
              ...form,
              gross: gross.toFixed(2),
              net: net.toFixed(2),
              tax: tax.toFixed(2),
              withholding_rate: withholding.toFixed(4),
            })
          }}>
            <Input type="date" required onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />

            <div className="space-y-1">
              <select className={selectClass} value={form.asset ?? ''} onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))} required>
                <option value="" disabled>Activo</option>
                {assetsData?.results.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} {a.ticker ? `(${a.ticker})` : ''}</option>
                ))}
              </select>
              <NewAssetForm onCreated={(id) => setForm((f) => ({ ...f, asset: id }))} />
            </div>

            <Input type="number" step="any" placeholder="Numero de acciones" value={form.shares ?? ''} required onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))} />
            <Input type="number" step="any" placeholder="Total recibido (neto)" value={form.net ?? ''} required onChange={(e) => setForm((f) => ({ ...f, net: e.target.value }))} />
            <Input type="number" step="any" placeholder="Impuestos retenidos" value={form.tax ?? ''} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} />

            {form.net && (() => {
              const net = parseFloat(form.net || '0')
              const tax = parseFloat(form.tax || '0')
              const gross = net + tax
              const shares = parseFloat(form.shares || '0')
              return (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Bruto: {gross.toFixed(2)} EUR {shares > 0 && <span>({(gross / shares).toFixed(4)} EUR/accion)</span>}</div>
                  {tax > 0 && gross > 0 && <div>Retencion: {((tax / gross) * 100).toFixed(2)}%</div>}
                </div>
              )
            })()}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={createMut.isPending}>
              {createMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
