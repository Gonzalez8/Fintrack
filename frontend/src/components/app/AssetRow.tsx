import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { TYPE_BADGE_COLORS } from '@/lib/constants'
import type { Asset } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  OK:        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ERROR:     'bg-red-500/10 text-red-600 dark:text-red-400',
  NO_TICKER: 'bg-muted text-muted-foreground',
}

const TYPE_LABELS: Record<string, string> = {
  STOCK:  'Acción',
  ETF:    'ETF',
  FUND:   'Fondo',
  CRYPTO: 'Crypto',
}

interface Props {
  asset: Asset
  onClick: () => void
  onDelete: (id: string) => void
}

export function AssetRow({ asset, onClick, onDelete }: Props) {
  return (
    <div className="flex items-center border-b last:border-0">
      {/* Tappable info area — botón propio, sin anidar otro botón dentro */}
      <button
        onClick={onClick}
        className="min-w-0 flex-1 flex items-center gap-3 px-1 py-3 text-left
                   active:bg-muted/40 transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-l-md"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium leading-tight truncate">
              {asset.name}
            </p>
            <Badge
              className={`${TYPE_BADGE_COLORS[asset.type] ?? ''} text-[10px] shrink-0`}
              variant="secondary"
            >
              {TYPE_LABELS[asset.type] ?? asset.type}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {asset.ticker && (
              <span className="text-xs text-muted-foreground">{asset.ticker}</span>
            )}
            {asset.price_status && (
              <Badge
                className={`${STATUS_STYLES[asset.price_status] ?? ''} text-[10px]`}
                variant="secondary"
              >
                {asset.price_status === 'NO_TICKER' ? 'Sin ticker' : asset.price_status}
              </Badge>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(asset.current_price)}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </button>

      {/* Botón eliminar — hermano del botón de navegación, no anidado dentro */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 mr-1 text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar ${asset.name}`}
        onClick={() => {
          if (confirm(`Eliminar ${asset.name}?`)) onDelete(asset.id)
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AssetRowSkeleton() {
  return (
    <div className="flex items-center gap-1 px-1 py-3 border-b last:border-0">
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-3 w-10 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-4 w-16 animate-pulse rounded bg-muted shrink-0 mr-1" />
      <div className="h-9 w-9 animate-pulse rounded bg-muted shrink-0" />
    </div>
  )
}
