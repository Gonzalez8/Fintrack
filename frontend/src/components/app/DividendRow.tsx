import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { formatMoney, formatQty } from '@/lib/utils'
import type { Dividend } from '@/types'

interface Props {
  dividend: Dividend
  onDelete: (id: string) => void
}

export function DividendRow({ dividend, onDelete }: Props) {
  const withholding = dividend.withholding_rate
    ? `${(parseFloat(dividend.withholding_rate) * 100).toFixed(0)}% ret.`
    : null

  return (
    <div className="flex items-center gap-3 px-1 py-3 border-b last:border-0">

      {/* Info central */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {dividend.asset_name}
          {dividend.asset_ticker && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {dividend.asset_ticker}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {dividend.date}
          {dividend.shares ? ` · ${formatQty(dividend.shares)} acc.` : ''}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bruto {formatMoney(dividend.gross)}
          {dividend.tax && parseFloat(dividend.tax) > 0
            ? ` · Imp. ${formatMoney(dividend.tax)}`
            : ''}
          {withholding ? ` · ${withholding}` : ''}
        </p>
      </div>

      {/* Neto — métrica principal */}
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Neto
        </p>
        <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatMoney(dividend.net)}
        </p>
      </div>

      {/* Eliminar — h-9 w-9 = 36px mínimo táctil */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label="Eliminar dividendo"
        onClick={() => onDelete(dividend.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function DividendRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-3 border-b last:border-0">
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
      </div>
      <div className="shrink-0 space-y-1 items-end flex flex-col">
        <div className="h-2.5 w-8 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-9 w-9 animate-pulse rounded bg-muted shrink-0" />
    </div>
  )
}
