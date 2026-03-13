"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api-client";
import { formatMoney } from "@/lib/utils";
import { useChartTheme } from "@/lib/chart-theme";
import { useTranslations } from "@/i18n/use-translations";
import type { Position, AssetPositionPoint } from "@/types";

type Range = "1W" | "1M" | "3M" | "1Y" | "MAX";

const RANGES: { key: Range; label: string }[] = [
  { key: "1W", label: "1S" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1A" },
  { key: "MAX", label: "MAX" },
];

interface ChartPoint {
  captured_at: string;
  mv: number;
  cb: number;
  pnl: number;
  pnlPct: number;
}

function filterByRange(data: ChartPoint[], range: Range): ChartPoint[] {
  if (range === "MAX" || !data.length) return data;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "1W") cutoff.setDate(now.getDate() - 7);
  else if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
  else if (range === "3M") cutoff.setMonth(now.getMonth() - 3);
  else cutoff.setFullYear(now.getFullYear() - 1);
  return data.filter((p) => new Date(p.captured_at) >= cutoff);
}

function formatTooltipDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAxisDate(isoStr: string, range: Range): string {
  const d = new Date(isoStr);
  if (range === "1W")
    return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
  if (range === "1M")
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  if (range === "3M")
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

interface HoverState {
  mv: number;
  cb: number;
  pnl: number;
  timestamp: string;
}

interface Props {
  position: Position;
}

export function AssetEvolutionChart({ position }: Props) {
  const ct = useChartTheme();
  const t = useTranslations();
  const [range, setRange] = useState<Range>("1Y");
  const [hover, setHover] = useState<HoverState | null>(null);
  const hoverRef = useRef<HoverState | null>(null);

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["asset-position-history", position.asset_id],
    queryFn: () =>
      api.get<AssetPositionPoint[]>(
        `/assets/${position.asset_id}/position-history/`,
      ),
    staleTime: 5 * 60 * 1000,
  });

  const allData = useMemo<ChartPoint[]>(
    () =>
      rawData.map((p) => {
        const mv = parseFloat(p.market_value);
        const cb = parseFloat(p.cost_basis);
        const pnl = parseFloat(p.unrealized_pnl);
        return {
          captured_at: p.captured_at,
          mv,
          cb,
          pnl,
          pnlPct: cb > 0 ? (pnl / cb) * 100 : 0,
        };
      }),
    [rawData],
  );

  const chartData = useMemo(
    () => filterByRange(allData, range),
    [allData, range],
  );
  const hasEnoughData = chartData.length >= 2;

  // Live values from position prop
  const liveMV = parseFloat(position.market_value);
  const liveCB = parseFloat(position.cost_basis);
  const livePnl = parseFloat(position.unrealized_pnl);

  // Display values: hover overrides live
  const displayMV = hover ? hover.mv : liveMV;
  const displayPnl = hover ? hover.pnl : livePnl;
  const displayCB = hover ? hover.cb : liveCB;
  const displayPnlPct = displayCB > 0 ? (displayPnl / displayCB) * 100 : 0;
  const displayTimestamp = hover ? hover.timestamp : null;

  const isPositive = displayPnl >= 0;
  const color = isPositive ? "#22c55e" : "#ef4444";
  const gradientId = `asset-grad-${isPositive ? "g" : "r"}`;

  const xTicks = useMemo(() => {
    if (chartData.length <= 4) return chartData.map((p) => p.captured_at);
    const indices = [
      0,
      Math.floor(chartData.length / 3),
      Math.floor((2 * chartData.length) / 3),
      chartData.length - 1,
    ];
    return [...new Set(indices.map((i) => chartData[i].captured_at))];
  }, [chartData]);

  const tickFormatter = useCallback(
    (v: string) => formatAxisDate(v, range),
    [range],
  );

  // Recharts v3: use Tooltip content to capture active data
  const tooltipContent = useCallback(
    (props: { active?: boolean; payload?: ReadonlyArray<{ payload: ChartPoint }> }) => {
      if (props.active && props.payload?.[0]) {
        const p = props.payload[0].payload;
        const next: HoverState = {
          mv: p.mv,
          cb: p.cb,
          pnl: p.pnl,
          timestamp: p.captured_at,
        };
        if (!hoverRef.current || hoverRef.current.timestamp !== next.timestamp) {
          hoverRef.current = next;
          queueMicrotask(() => setHover(next));
        }
      }
      return null;
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    setHover(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (allData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <p className="text-sm font-medium">
          {t("dashboard.insufficientData")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between px-6 pt-4 pb-4">
        <div className="min-w-0">
          {/* Market value — big number */}
          <p className="text-2xl font-bold tabular-nums leading-none">
            {formatMoney(displayMV)}
          </p>

          {/* P&L + percentage */}
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {hasEnoughData ? (
              <>
                <span
                  className={`text-sm font-semibold tabular-nums ${isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  {displayPnl >= 0 ? "+" : ""}
                  {formatMoney(displayPnl)}
                </span>
                <span
                  className={`text-xs font-medium tabular-nums ${isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  ({displayPnlPct >= 0 ? "+" : ""}
                  {displayPnlPct.toFixed(2)}%)
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("dashboard.insufficientData")}
              </span>
            )}
          </div>

          {/* Timestamp on hover */}
          <div className="mt-1 h-4">
            {displayTimestamp && (
              <p className="text-xs text-muted-foreground">
                {formatTooltipDate(displayTimestamp)}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-0.5 bg-secondary/50 border border-border rounded-lg p-1">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setRange(key);
                setHover(null);
                hoverRef.current = null;
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                range === key
                  ? "bg-background shadow-sm text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div onMouseLeave={handleMouseLeave}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            key={range}
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="captured_at"
              ticks={xTicks}
              tickLine={false}
              axisLine={false}
              tick={ct.axisTick}
              tickFormatter={tickFormatter}
              padding={{ left: 16, right: 16 }}
            />
            <YAxis
              tick={ct.axisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
              width={60}
              domain={["auto", "auto"]}
            />

            <Tooltip
              cursor={{
                stroke: color,
                strokeWidth: 1,
                strokeDasharray: "3 3",
                opacity: 0.6,
              }}
              content={tooltipContent}
            />

            <Area
              type="monotone"
              dataKey="pnlPct"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: color,
                stroke: "white",
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={400}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
