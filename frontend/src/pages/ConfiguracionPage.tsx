import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, assetsApi, accountsApi } from '@/api/assets'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { MoneyCell } from '@/components/app/MoneyCell'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import type { Settings } from '@/types'

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  OPERATIVA: 'bg-blue-100 text-blue-800',
  AHORRO: 'bg-green-100 text-green-800',
  INVERSION: 'bg-orange-100 text-orange-800',
  DEPOSITOS: 'bg-purple-100 text-purple-800',
  ALTERNATIVOS: 'bg-yellow-100 text-yellow-800',
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  OPERATIVA: 'Operativa',
  AHORRO: 'Ahorro',
  INVERSION: 'Inversión',
  DEPOSITOS: 'Depósitos',
  ALTERNATIVOS: 'Alternativos',
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  })
  const { data: assetsData } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.list({ page_size: '500' }).then((r) => r.data),
  })
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => accountsApi.list().then((r) => r.data),
  })

  const [settingsSaved, setSettingsSaved] = useState(false)
  const settingsMut = useMutation({
    mutationFn: (data: Partial<Settings>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setForm({})
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    },
  })
  const assetMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ ticker: string }> }) =>
      assetsApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets-all'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
  const updatePricesMut = useMutation({
    mutationFn: () => assetsApi.updatePrices().then((r) => r.data),
    onSuccess: (result) => {
      setPriceResult({ updated: result.updated, errors: result.errors })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['assets-all'] })
    },
    onError: () => {
      setPriceResult({ updated: 0, errors: ['Error al conectar con Yahoo Finance'] })
    },
  })
  const deleteAssetMut = useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets-all'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: (err) => {
      const msg = (err as any)?.response?.data?.detail ?? 'Error al eliminar activo'
      alert(msg)
    },
  })
  const accountMut = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: string }) =>
      accountsApi.update(id, { balance } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-all'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
  const createAccountMut = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      accountsApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-all'] })
      setNewAccount({ name: '', type: 'OPERATIVA' })
      setShowNewAccount(false)
    },
  })
  const deleteAccountMut = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-all'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: (err) => {
      const msg = (err as any)?.response?.data?.detail ?? 'Error al eliminar cuenta'
      alert(msg)
    },
  })

  const [form, setForm] = useState<Partial<Settings>>({})
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [editingAccount, setEditingAccount] = useState<Record<string, string>>({})
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', type: 'OPERATIVA' })
  const [priceResult, setPriceResult] = useState<{ updated: number; errors: string[] } | null>(null)

  const current = { ...settings, ...form }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuracion</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajustes Generales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 max-w-xl">
            <div>
              <label className="text-sm font-medium">Moneda base</label>
              <Input value={current.base_currency ?? 'EUR'} onChange={(e) => setForm((f) => ({ ...f, base_currency: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Metodo coste</label>
              <Select value={current.cost_basis_method} onValueChange={(v) => setForm((f) => ({ ...f, cost_basis_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAC">WAC (Media Ponderada)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Coste regalos</label>
              <Select value={current.gift_cost_mode} onValueChange={(v) => setForm((f) => ({ ...f, gift_cost_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZERO">Coste cero</SelectItem>
                  <SelectItem value="MARKET">Precio mercado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Decimales dinero</label>
              <Input type="number" value={current.rounding_money ?? 2} onChange={(e) => setForm((f) => ({ ...f, rounding_money: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Decimales cantidad</label>
              <Input type="number" value={current.rounding_qty ?? 6} onChange={(e) => setForm((f) => ({ ...f, rounding_qty: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Actualizar precios cada</label>
              <Select value={String(current.price_update_interval ?? 0)} onValueChange={(v) => setForm((f) => ({ ...f, price_update_interval: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Manual</SelectItem>
                  <SelectItem value="5">5 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="360">6 horas</SelectItem>
                  <SelectItem value="1440">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => settingsMut.mutate(form)} disabled={Object.keys(form).length === 0 || settingsMut.isPending}>
              {settingsMut.isPending ? 'Guardando...' : 'Guardar ajustes'}
            </Button>
            {settingsSaved && <span className="text-sm text-green-600">Ajustes guardados correctamente</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cuentas</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowNewAccount(true)} disabled={showNewAccount}>
            <Plus className="mr-1 h-4 w-4" />Nueva cuenta
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showNewAccount && (
                <TableRow>
                  <TableCell>
                    <Input
                      className="w-44"
                      placeholder="Nombre"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      className={selectClass + ' w-36'}
                      value={newAccount.type}
                      onChange={(e) => setNewAccount((p) => ({ ...p, type: e.target.value }))}
                    >
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" disabled={!newAccount.name.trim()} onClick={() => createAccountMut.mutate({ name: newAccount.name.trim(), type: newAccount.type })}>
                        OK
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowNewAccount(false); setNewAccount({ name: '', type: 'OPERATIVA' }) }}>X</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {accountsData?.results.map((account) => {
                const ed = editingAccount[account.id]
                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <Badge className={ACCOUNT_TYPE_COLORS[account.type] ?? ''} variant="secondary">
                        {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ed !== undefined ? (
                        <Input
                          type="number"
                          step="any"
                          className="w-36 ml-auto"
                          value={ed}
                          onChange={(e) => setEditingAccount((p) => ({ ...p, [account.id]: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <MoneyCell value={account.balance} />
                      )}
                    </TableCell>
                    <TableCell>
                      {ed !== undefined ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => {
                            accountMut.mutate({ id: account.id, balance: ed })
                            setEditingAccount((p) => { const n = { ...p }; delete n[account.id]; return n })
                          }}>OK</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingAccount((p) => { const n = { ...p }; delete n[account.id]; return n })}>X</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingAccount((p) => ({ ...p, [account.id]: account.balance ?? '0' }))}>Editar</Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Eliminar cuenta ${account.name}?`)) deleteAccountMut.mutate(account.id) }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Cotizaciones</CardTitle>
            <p className="text-xs text-muted-foreground">Precios obtenidos de Yahoo Finance. Solo activos con ticker.</p>
          </div>
          <div className="flex items-center gap-3">
            {priceResult && (
              <span className="text-sm text-muted-foreground">
                {priceResult.updated} actualizados
                {priceResult.errors.length > 0 && (
                  <span className="text-destructive ml-1">({priceResult.errors.length} errores)</span>
                )}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPriceResult(null); updatePricesMut.mutate() }}
              disabled={updatePricesMut.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${updatePricesMut.isPending ? 'animate-spin' : ''}`} />
              {updatePricesMut.isPending ? 'Actualizando...' : 'Actualizar precios'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Precio Actual</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetsData?.results.filter((a) => a.ticker).map((asset) => {
                const ed = editing[asset.id]
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      {ed !== undefined ? (
                        <Input
                          className="w-28"
                          value={ed}
                          onChange={(e) => setEditing((p) => ({ ...p, [asset.id]: e.target.value }))}
                          placeholder="Ticker"
                          autoFocus
                        />
                      ) : (
                        asset.ticker ?? '-'
                      )}
                    </TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell className="text-right">
                      <MoneyCell value={asset.current_price} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {ed !== undefined ? (
                          <>
                            <Button size="sm" onClick={() => {
                              assetMut.mutate({ id: asset.id, data: { ticker: ed || undefined } })
                              setEditing((p) => { const n = { ...p }; delete n[asset.id]; return n })
                            }}>OK</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing((p) => { const n = { ...p }; delete n[asset.id]; return n })}>X</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditing((p) => ({ ...p, [asset.id]: asset.ticker ?? '' }))}>Editar</Button>
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Eliminar ${asset.name}?`)) deleteAssetMut.mutate(asset.id) }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
