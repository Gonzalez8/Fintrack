"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useChartTheme, SERIES, POSITIVE } from "@/lib/chart-theme";
import { formatMoney } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";
import type { AmortizationRow, AmortizationEvent } from "@/types";

interface Props {
  schedule: AmortizationRow[];
  modifiedSchedule?: AmortizationRow[];
  currentMonth: number;
  events: AmortizationEvent[];
  onMonthSelect: (month: number) => void;
}

const EVENT_COLOR = "#f59e0b";

export function MortgageTimelineChart({
  schedule,
  modifiedSchedule,
  currentMonth,
  events,
  onMonthSelect,
}: Props) {
  const ct = useChartTheme();
  const t = useTranslations();

  // Build chart data: merge original and modified using index lookup (O(n))
  const modMap = new Map(modifiedSchedule?.map((r) => [r.month, r]));
  const modLastMonth = modifiedSchedule ? modifiedSchedule[modifiedSchedule.length - 1]?.month ?? 0 : 0;

  const chartData = schedule.map((row) => {
    const modRow = modMap.get(row.month);
    // If modified schedule is shorter and this month is past its end, show 0
    const modBalance = modRow
      ? modRow.remainingBalance
      : modifiedSchedule && row.month > modLastMonth
        ? 0
        : null;
    return {
      month: row.month,
      date: row.date,
      balance: row.remainingBalance,
      modifiedBalance: modBalance,
      interest: row.totalInterestPaid,
    };
  });

  // If modified schedule extends beyond original, append those points
  if (modifiedSchedule) {
    const maxOrigMonth = schedule[schedule.length - 1]?.month ?? 0;
    for (const modRow of modifiedSchedule) {
      if (modRow.month > maxOrigMonth) {
        chartData.push({
          month: modRow.month,
          date: modRow.date,
          balance: 0,
          modifiedBalance: modRow.remainingBalance,
          interest: schedule[schedule.length - 1]?.totalInterestPaid ?? 0,
        });
      }
    }
  }

  const formatAxisYear = (date: string) => {
    if (!date) return "";
    return date.split("-")[0];
  };

  const tickInterval = Math.max(1, Math.floor(chartData.length / 7));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      const month = data.activePayload[0].payload.month;
      if (month > 0) {
        onMonthSelect(month);
      }
    }
  };

  // Build a set of event months for tooltip enrichment
  const eventMonthMap = new Map(events.map((e) => [e.month, e]));

  const renderTooltip = ({ active, payload }: Record<string, unknown>) => {
    if (!active || !Array.isArray(payload) || !payload.length) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = payload[0].payload as any;
    const event = eventMonthMap.get(d.month);
    return (
      <div style={ct.tooltipStyle as React.CSSProperties}>
        <p style={ct.tooltipLabelStyle as React.CSSProperties}>
          {t("properties.monthLabel")} {d.month} · {d.date}
        </p>
        <p style={{ ...(ct.tooltipItemStyle as React.CSSProperties), color: SERIES.investments }}>
          {t("properties.balanceLabel")}: {formatMoney(d.balance)}
        </p>
        {d.modifiedBalance !== null && (
          <p style={{ ...(ct.tooltipItemStyle as React.CSSProperties), color: POSITIVE }}>
            {t("properties.modifiedCurveMulti")}: {formatMoney(d.modifiedBalance)}
          </p>
        )}
        <p style={ct.tooltipItemStyle as React.CSSProperties}>
          {t("properties.totalInterestPaidLabel")}: {formatMoney(d.interest)}
        </p>
        {event && (
          <p style={{ ...(ct.tooltipItemStyle as React.CSSProperties), color: EVENT_COLOR, fontWeight: 600 }}>
            {t("properties.extraPaymentShort")}: {formatMoney(event.amount)} ·{" "}
            {event.strategy === "REDUCE_PAYMENT"
              ? t("properties.reducePayment")
              : t("properties.reduceTerm")}
          </p>
        )}
      </div>
    );
  };

  // Find dates for event reference lines
  const getDateForMonth = (month: number): string | undefined => {
    const row = schedule.find((r) => r.month === month);
    if (row) return row.date;
    const modRow = modifiedSchedule?.find((r) => r.month === month);
    return modRow?.date;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("properties.timeline")}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            onClick={handleChartClick}
            style={{ cursor: "pointer" }}
          >
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.investments} stopOpacity={0.4} />
                <stop offset="100%" stopColor={SERIES.investments} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisYear}
              tick={ct.axisTick}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              tick={ct.axisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return `${v}`;
              }}
              width={48}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: ct.border as string, strokeDasharray: "4 4" }} />
            <Legend
              wrapperStyle={{
                ...ct.legendStyle,
                paddingLeft: "24px",
                paddingBottom: "8px",
              }}
            />

            {/* Current position: "Today" */}
            {currentMonth > 0 && currentMonth < chartData.length && (
              <ReferenceLine
                x={schedule[currentMonth]?.date}
                stroke={ct.textMuted}
                strokeDasharray="4 4"
                label={{
                  value: t("properties.currentPosition"),
                  position: "top",
                  fill: ct.textMuted,
                  fontSize: 10,
                }}
              />
            )}

            {/* Event markers — one amber line per event */}
            {events.map((event) => {
              const date = getDateForMonth(event.month);
              if (!date) return null;
              return (
                <ReferenceLine
                  key={event.id}
                  x={date}
                  stroke={EVENT_COLOR}
                  strokeDasharray="6 3"
                  strokeWidth={2}
                />
              );
            })}

            {/* Original balance area */}
            <Area
              type="monotone"
              dataKey="balance"
              name={t("properties.originalCurve")}
              fill="url(#balanceGrad)"
              stroke={SERIES.investments}
              strokeWidth={2}
              fillOpacity={1}
              dot={false}
              activeDot={false}
            />

            {/* Modified balance line (if events active) */}
            {modifiedSchedule && (
              <Line
                type="monotone"
                dataKey="modifiedBalance"
                name={events.length > 1 ? t("properties.modifiedCurveMulti") : t("properties.modifiedCurve")}
                stroke={POSITIVE}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={false}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
