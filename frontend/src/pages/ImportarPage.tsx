import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { importApi } from '@/api/portfolio'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Upload, CheckCircle, AlertTriangle, SkipForward } from 'lucide-react'
import type { ImportResult } from '@/types'

export function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const uploadMut = useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      importApi.upload(file, dryRun).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  })

  const handleDryRun = () => {
    if (file) uploadMut.mutate({ file, dryRun: true })
  }
  const handleConfirm = () => {
    if (file) uploadMut.mutate({ file, dryRun: false })
  }

  const hasErrors = (result?.errors.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Importar Excel</h2>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null) }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {file ? file.name : 'Seleccionar archivo .xlsx'}
            </Button>
            <Button onClick={handleDryRun} disabled={!file || uploadMut.isPending}>
              Validar (dry run)
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!result || result.dry_run === false || hasErrors || uploadMut.isPending}
              variant={result && !result.dry_run ? 'secondary' : 'default'}
            >
              Confirmar importacion
            </Button>
          </div>
          {uploadMut.isPending && <p className="mt-4 text-sm text-muted-foreground">Procesando...</p>}
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Insertados {result.dry_run ? '(preview)' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div>Transacciones: <strong>{result.inserted.transactions}</strong></div>
                <div>Dividendos: <strong>{result.inserted.dividends}</strong></div>
                <div>Intereses: <strong>{result.inserted.interests}</strong></div>
                <div>Activos nuevos: <strong>{result.inserted.assets}</strong></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <SkipForward className="h-4 w-4 text-yellow-600" />
                Duplicados omitidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div>Transacciones: <strong>{result.skipped_duplicates.transactions}</strong></div>
                <div>Dividendos: <strong>{result.skipped_duplicates.dividends}</strong></div>
                <div>Intereses: <strong>{result.skipped_duplicates.interests}</strong></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Errores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{result.errors.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de errores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hoja</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Columna</TableHead>
                  <TableHead>Mensaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((err, i) => (
                  <TableRow key={i}>
                    <TableCell>{err.sheet}</TableCell>
                    <TableCell>{err.row}</TableCell>
                    <TableCell>{err.column}</TableCell>
                    <TableCell>{err.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {result && !result.dry_run && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-green-600 font-medium">Importacion completada exitosamente.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
