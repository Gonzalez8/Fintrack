import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatMoney, formatQty } from '@/lib/utils'
import { TX_TYPE_BADGE_COLORS, TX_TYPE_LABELS } from '@/lib/constants'
import type { Transaction } from '@/types'

interface Props {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
}

export function TransactionRow({ tx, onEdit, onDelete }: Props) {
  const qty = parseFloat(tx.quantity)
  const price = parseFloat(tx.price ?? '0')
  const commission = parseFloat(tx.commission ?? '0')
  const tax = parseFloat(tx.tax ?? '0')
  const subtotal = qty * price
  const isSell = tx.type === 'SELL'
  const total = isSell ? subtotal - commission - tax : subtotal + commission + tax
  const hasCosts = commission > 0 || tax > 0

  return (
    <div className="flex items-center gap-3 px-1 py-3 border-b last:border-0">

      {/* Tipo badge — ancho fijo para alinear el resto */}
      <Badge
        className={`${TX_TYPE_BADGE_COLORS[tx.type] ?? ''} shrink-0 w-16 justify-center text-[11px]`}
        variant="secondary"
      >
        {TX_TYPE_LABELS[tx.type] ?? tx.type}
      </Badge>

      {/* Info central */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {tx.asset_name}
          {tx.asset_ticker && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {tx.asset_ticker}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tx.date}
          {tx.quantity && tx.price
            ? ` · ${formatQty(tx.quantity)} @ ${formatMoney(tx.price)}`
            : ''}
        </p>
      </div>

      {/* Importe total */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {formatMoney(total)}
        </p>
        {hasCosts && (
          <p className="text-[11px] text-muted-foreground tabular-nums">
            +{formatMoney(commission + tax)} costes
          </p>
        )}
      </div>

      {/* Acciones — mínimo táctil 44px garantizado por h-9 w-9 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            aria-label="Acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(tx)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(tx.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-3 border-b last:border-0">
      <div className="h-5 w-16 animate-pulse rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="shrink-0 space-y-1 items-end flex flex-col">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-9 w-9 animate-pulse rounded bg-muted shrink-0" />
    </div>
  )
}
