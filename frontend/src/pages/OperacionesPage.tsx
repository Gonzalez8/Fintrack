import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions'
import { portfolioApi } from '@/api/portfolio'
import { assetsApi, accountsApi } from '@/api/assets'
import { DataTable, type Column } from '@/components/app/DataTable'
import { MoneyCell } from '@/components/app/MoneyCell'
import { NewAssetForm } from '@/components/app/NewAssetForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Pencil, Trash2, ShoppingCart, TrendingDown, Gift } from 'lucide-react'
import { formatQty } from '@/lib/utils'
import type { Transaction } from '@/types'
import axios from 'axios'

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const TYPE_BADGE: Record<string, string> = {
  BUY: 'bg-green-100 text-green-800',
  SELL: 'bg-red-100 text-red-800',
  GIFT: 'bg-yellow-100 text-yellow-800',
}

const TYPE_LABELS: Record<string, string> = {
  BUY: 'Compra',
  SELL: 'Venta',
  GIFT: 'Regalo',
}

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

export function OperacionesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, filters],
    queryFn: () => transactionsApi.list({ ...filters, page: String(page) }).then((r) => r.data),
  })
  const { data: assetsData } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.list({ page_size: '500' }).then((r) => r.data),
  })
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => accountsApi.list().then((r) => r.data),
  })
  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => portfolioApi.get().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: Record<string, string>) => transactionsApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setDialogOpen(false)
      setError('')
    },
    onError: (err) => setError(formatErrors(err)),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      transactionsApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setDialogOpen(false)
      setEditingId(null)
      setError('')
    },
    onError: (err) => setError(formatErrors(err)),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  const columns: Column<Transaction>[] = [
    { header: 'Fecha', accessor: 'date' },
    {
      header: 'Tipo',
      accessor: (r) => <Badge className={TYPE_BADGE[r.type] ?? ''} variant="secondary">{r.type}</Badge>,
    },
    {
      header: 'Activo',
      accessor: (r) => (
        <div>
          <span className="font-medium">{r.asset_name}</span>
          {r.asset_ticker && <span className="ml-1 text-xs text-muted-foreground">{r.asset_ticker}</span>}
        </div>
      ),
    },
    { header: 'Cuenta', accessor: 'account_name' },
    { header: 'Cantidad', accessor: (r) => formatQty(r.quantity), className: 'text-right' },
    { header: 'Precio', accessor: (r) => <MoneyCell value={r.price} />, className: 'text-right' },
    { header: 'Comision', accessor: (r) => <MoneyCell value={r.commission} />, className: 'text-right' },
    {
      header: '',
      accessor: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
    },
  ]

  const totalPages = data ? Math.ceil(data.count / 50) : 1

  const today = new Date().toISOString().slice(0, 10)
  const isSell = form.type === 'SELL'

  // Map asset_id -> position for sell mode
  const positionMap = new Map(
    (portfolioData?.positions ?? []).map((p) => [p.asset_id, p])
  )

  // Assets available in sell mode: only those with positions
  const assetOptions = isSell
    ? (assetsData?.results ?? []).filter((a) => positionMap.has(a.id))
    : (assetsData?.results ?? [])

  // Current selected position (for sell limits)
  const selectedPosition = isSell && form.asset ? positionMap.get(form.asset) : null

  const handleAssetChange = (assetId: string) => {
    const updates: Record<string, string> = { asset: assetId }
    if (isSell) {
      const pos = positionMap.get(assetId)
      if (pos) {
        updates.price = pos.current_price
        if (pos.account_id) updates.account = pos.account_id
      }
    } else {
      const asset = (assetsData?.results ?? []).find((a) => a.id === assetId)
      if (asset?.current_price) {
        updates.price = asset.current_price
      }
    }
    setForm((f) => ({ ...f, ...updates }))
  }

  const openNew = (type: 'BUY' | 'SELL' | 'GIFT') => {
    setEditingId(null)
    setForm({ date: today, type })
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setForm({
      date: tx.date,
      type: tx.type,
      asset: tx.asset,
      account: tx.account,
      quantity: tx.quantity,
      price: tx.price ?? '',
      commission: tx.commission,
    })
    setError('')
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Operaciones</h2>
        <div className="flex gap-2">
          <a href="/api/export/transactions.csv" target="_blank" rel="noopener">
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />CSV</Button>
          </a>
          <Button size="sm" onClick={() => openNew('BUY')}>
            <ShoppingCart className="mr-2 h-4 w-4" />Compra
          </Button>
          <Button size="sm" variant="destructive" onClick={() => openNew('SELL')}>
            <TrendingDown className="mr-2 h-4 w-4" />Venta
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openNew('GIFT')}>
            <Gift className="mr-2 h-4 w-4" />Regalo
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Desde fecha" type="date"
          onChange={(e) => { setFilters((f) => ({ ...f, from_date: e.target.value })); setPage(1) }}
        />
        <Input
          placeholder="Hasta fecha" type="date"
          onChange={(e) => { setFilters((f) => ({ ...f, to_date: e.target.value })); setPage(1) }}
        />
        <Select onValueChange={(v) => { setFilters((f) => ({ ...f, type: v === 'ALL' ? '' : v })); setPage(1) }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="BUY">Compra</SelectItem>
            <SelectItem value="SELL">Venta</SelectItem>
            <SelectItem value="GIFT">Regalo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.results ?? []} loading={isLoading} page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Operación' : `Nueva ${TYPE_LABELS[form.type] ?? 'Operación'}`}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              if (editingId) {
                updateMut.mutate({ id: editingId, data: form })
              } else {
                createMut.mutate(form)
              }
            }}
          >
            <Input type="date" required value={form.date ?? ''} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />

            {editingId && (
              <select className={selectClass} value={form.type ?? ''} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} required>
                <option value="BUY">Compra</option>
                <option value="SELL">Venta</option>
                <option value="GIFT">Regalo</option>
              </select>
            )}

            <div className="space-y-1">
              <select className={selectClass} value={form.asset ?? ''} onChange={(e) => handleAssetChange(e.target.value)} required>
                <option value="" disabled>Activo</option>
                {assetOptions.map((a) => {
                  const pos = positionMap.get(a.id)
                  const suffix = isSell && pos ? ` — ${formatQty(pos.quantity)} uds` : ''
                  return (
                    <option key={a.id} value={a.id}>{a.name} {a.ticker ? `(${a.ticker})` : ''}{suffix}</option>
                  )
                })}
              </select>
              {!isSell && !editingId && <NewAssetForm onCreated={(id) => setForm((f) => ({ ...f, asset: id }))} />}
            </div>

            {!isSell && (
              <select className={selectClass} value={form.account ?? ''} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))} required>
                <option value="" disabled>Cuenta</option>
                {accountsData?.results.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            <div className="space-y-1">
              <Input
                type="number" step="any" placeholder="Cantidad" required
                value={form.quantity ?? ''}
                max={selectedPosition ? selectedPosition.quantity : undefined}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              {selectedPosition && (
                <p className="text-xs text-muted-foreground">
                  Disponible: <strong>{formatQty(selectedPosition.quantity)}</strong> uds
                </p>
              )}
            </div>
            <Input type="number" step="any" placeholder="Precio" value={form.price ?? ''} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <Input type="number" step="any" placeholder="Comision" value={form.commission ?? '0'} onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))} />

            {form.quantity && form.price && (() => {
              const qty = parseFloat(form.quantity) || 0
              const price = parseFloat(form.price) || 0
              const comm = parseFloat(form.commission) || 0
              const total = qty * price + comm
              return (
                <p className="text-sm text-muted-foreground">
                  Total: <strong>{total.toFixed(2)} €</strong>
                  <span className="ml-2 text-xs">({qty} × {price} + {comm})</span>
                </p>
              )
            })()}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
