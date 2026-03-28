import { cn } from "@/lib/utils";
import { usePrivacy } from "@/lib/privacy";

const MASK = "•••••";

interface MoneyCellProps {
  value: string | number | null | undefined;
  className?: string;
  colored?: boolean;
  prefix?: string;
  isPublic?: boolean;
  currency?: string;
}

export function MoneyCell({
  value,
  className,
  colored = false,
  prefix,
  isPublic = false,
  currency = "EUR",
}: MoneyCellProps) {
  const { privacyMode } = usePrivacy();

  if (value == null || value === "") {
    return <span className={cn("font-mono text-sm tabular-nums text-muted-foreground", className)}>—</span>;
  }

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return <span className={cn("font-mono text-sm tabular-nums text-muted-foreground", className)}>—</span>;
  }

  if (!isPublic && privacyMode) {
    return <span className={cn("font-mono text-sm tabular-nums text-muted-foreground", className)}>{MASK}</span>;
  }

  const formatted = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  const colorClass = colored
    ? num > 0
      ? "text-green-500"
      : num < 0
        ? "text-red-500"
        : "text-muted-foreground"
    : "";

  return (
    <span className={cn("font-mono text-sm tabular-nums", colorClass, className)}>
      {prefix}
      {colored && num > 0 ? "+" : ""}
      {formatted}
    </span>
  );
}

interface PctCellProps {
  value: string | number | null | undefined;
  className?: string;
}

export function PctCell({ value, className }: PctCellProps) {
  if (value == null || value === "") {
    return <span className={cn("font-mono text-sm tabular-nums text-muted-foreground", className)}>—</span>;
  }

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return <span className={cn("font-mono text-sm tabular-nums text-muted-foreground", className)}>—</span>;
  }

  const colorClass = num > 0 ? "text-green-500" : num < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <span className={cn("font-mono text-sm tabular-nums", colorClass, className)}>
      {num > 0 ? "+" : ""}
      {num.toFixed(2)}%
    </span>
  );
}
