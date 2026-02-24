import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import type { Interest } from '@/types'

interface Props {
  interest: Interest
  onEdit: (interest: Interest) => void
  onDelete: (id: string) => void
}

export function InterestRow({ interest, onEdit, onDelete }: Props) {
  const annualRate = interest.annual_rate
    ? `${(parseFloat(interest.annual_rate) * 100).toFixed(2)}% anual`
    : null

  return (
    <div className="flex items-center gap-3 px-1 py-3 border-b last:border-0">

      {/* Info central */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {interest.account_name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {interest.date}
          {annualRate ? ` · ${annualRate}` : ''}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bruto {formatMoney(interest.gross)}
          {interest.balance && parseFloat(interest.balance) > 0
            ? ` · Saldo ${formatMoney(interest.balance)}`
            : ''}
        </p>
      </div>

      {/* Neto — métrica principal */}
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Neto
        </p>
        <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatMoney(interest.net)}
        </p>
      </div>

      {/* Acciones — DropdownMenu, h-9 w-9 = 36px */}
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
          <DropdownMenuItem onClick={() => onEdit(interest)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(interest.id)}
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

export function InterestRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-3 border-b last:border-0">
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="shrink-0 space-y-1 items-end flex flex-col">
        <div className="h-2.5 w-8 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-9 w-9 animate-pulse rounded bg-muted shrink-0" />
    </div>
  )
}
