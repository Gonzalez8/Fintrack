import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interestsApi } from '@/api/transactions'
import { accountsApi } from '@/api/assets'
import { DataTable, type Column } from '@/components/app/DataTable'
import { MoneyCell } from '@/components/app/MoneyCell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Interest } from '@/types'
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

export function InteresesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [newAccountName, setNewAccountName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['interests', page, filters],
    queryFn: () => interestsApi.list({ ...filters, page: String(page) }).then((r) => r.data),
  })
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => accountsApi.list().then((r) => r.data),
  })

  const createAccountMut = useMutation({
    mutationFn: (name: string) => accountsApi.create({ name, type: 'AHORRO' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accounts-all'] })
      setForm((f) => ({ ...f, account: res.data.id }))
      setNewAccountName('')
    },
  })

  const createMut = useMutation({
    mutationFn: (data: Record<string, string>) => interestsApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] })
      setDialogOpen(false)
      setError('')
    },
    onError: (err) => setError(formatErrors(err)),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      interestsApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] })
      setDialogOpen(false)
      setEditingId(null)
      setError('')
    },
    onError: (err) => setError(formatErrors(err)),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => interestsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interests'] }),
  })

  const columns: Column<Interest>[] = [
    { header: 'Fecha', accessor: 'date' },
    { header: 'Cuenta', accessor: 'account_name' },
    { header: 'Bruto', accessor: (r) => <MoneyCell value={r.gross} />, className: 'text-right' },
    { header: 'Neto', accessor: (r) => <MoneyCell value={r.net} />, className: 'text-right' },
    { header: 'Saldo', accessor: (r) => <MoneyCell value={r.balance} />, className: 'text-right' },
    {
      header: '% Anual',
      accessor: (r) => r.annual_rate ? `${(parseFloat(r.annual_rate) * 100).toFixed(2)}%` : '-',
      className: 'text-right',
    },
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
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const today = new Date().toISOString().slice(0, 10)

  const openDialog = () => {
    setEditingId(null)
    setForm({ date: today })
    setError('')
    setNewAccountName('')
    setDialogOpen(true)
  }

  const openEdit = (row: Interest) => {
    setEditingId(row.id)
    setForm({
      date: row.date,
      account: row.account,
      gross: row.gross,
      net: row.net,
      balance: row.balance ?? '',
      annual_rate: row.annual_rate ?? '',
    })
    setError('')
    setNewAccountName('')
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Intereses</h2>
        <div className="flex gap-2">
          <a href="/api/export/interests.csv" target="_blank" rel="noopener">
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
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Interés' : 'Nuevo Interes'}</DialogTitle>
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

            <div className="space-y-1">
              <select className={selectClass} value={form.account ?? ''} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))} required>
                <option value="" disabled>Cuenta</option>
                {accountsData?.results.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <Input placeholder="Nueva cuenta" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="text-xs" />
                <Button type="button" variant="outline" size="sm" disabled={!newAccountName.trim()} onClick={() => createAccountMut.mutate(newAccountName.trim())}>+</Button>
              </div>
            </div>

            <Input type="number" step="any" placeholder="Bruto" required value={form.gross ?? ''} onChange={(e) => setForm((f) => ({ ...f, gross: e.target.value }))} />
            <Input type="number" step="any" placeholder="Neto" required value={form.net ?? ''} onChange={(e) => setForm((f) => ({ ...f, net: e.target.value }))} />

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
