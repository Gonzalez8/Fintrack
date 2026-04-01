"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartTheme, SERIES } from "@/lib/chart-theme";
import { formatMoney } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";
import type { Interest, PaginatedResponse } from "@/types";

// ── helpers ──────────────────────────────────────────────────────────

/** Compute TAE from a single interest record */
function recordTAE(gross: number, balance: number, days: number): number | null {
  if (balance <= 0 || gross <= 0 || days <= 0) return null;
  return Math.pow(1 + gross / balance, 365 / days) - 1;
}

interface MonthlyPoint {
  month: string;
  balance: number | null;
  interestGross: number;
}

interface BarPoint {
  label: string;
  invested: number;
  compoundInterest: number;
}

// ── component ────────────────────────────────────────────────────────

export function InterestsProjectionTab() {
  const t = useTranslations();
  const theme = useChartTheme();

  // Fetch ALL interests (no pagination) for projection calculations
  const { data: allData, isLoading } = useQuery({
    queryKey: ["interests", "all"],
    queryFn: async () => {
      let page = 1;
      const all: Interest[] = [];
      let hasNext = true;
      while (hasNext) {
        const res = await api.get<PaginatedResponse<Interest>>(
          `/interests/?page=${page}&ordering=date_end`
        );
        all.push(...res.results);
        hasNext = !!res.next;
        page++;
      }
      return all;
    },
  });

  const interests = allData ?? [];

  // ── Aggregate monthly data ──
  const monthlyData = useMemo(() => {
    if (!interests.length) return [];
    const map = new Map<string, MonthlyPoint>();

    for (const i of interests) {
      const key = i.date_end.slice(0, 7);
      const existing = map.get(key);
      const gross = parseFloat(i.gross) || 0;
      const balance = i.balance ? parseFloat(i.balance) : null;

      if (existing) {
        existing.interestGross += gross;
        if (balance !== null && (existing.balance === null || balance > existing.balance)) {
          existing.balance = balance;
        }
      } else {
        map.set(key, { month: key, balance, interestGross: gross });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [interests]);

  // ── Compute average TAE from last 3 records with data ──
  const avgTAE = useMemo(() => {
    if (!interests.length) return 0;
    const sorted = [...interests].sort(
      (a, b) => b.date_end.localeCompare(a.date_end)
    );
    const taes: number[] = [];
    for (const i of sorted) {
      if (taes.length >= 3) break;
      const gross = parseFloat(i.gross) || 0;
      const balance = parseFloat(i.balance ?? "0") || 0;
      const days = i.days;
      const tae = recordTAE(gross, balance, days);
      if (tae !== null) taes.push(tae);
    }
    if (!taes.length) return 0;
    return taes.reduce((s, v) => s + v, 0) / taes.length;
  }, [interests]);

  // ── Compute average monthly contribution from last 3 months ──
  const defaultContribution = useMemo(() => {
    if (monthlyData.length < 2) return 0;
    const recent = monthlyData.slice(-4);
    const deltas: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].balance !== null && recent[i - 1].balance !== null) {
        const delta = recent[i].balance! - recent[i - 1].balance! - recent[i].interestGross;
        if (delta > 0) deltas.push(delta);
      }
    }
    if (!deltas.length) return 0;
    return Math.round(deltas.reduce((s, v) => s + v, 0) / deltas.length);
  }, [monthlyData]);

  // ── Controls state ──
  const [projectionYears, setProjectionYears] = useState(5);
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(null);

  const contribution = monthlyContribution ?? defaultContribution;

  // ── Current balance & totals ──
  const currentBalance = useMemo(() => {
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (monthlyData[i].balance !== null) return monthlyData[i].balance!;
    }
    return 0;
  }, [monthlyData]);

  const totalHistoricalInterest = useMemo(() => {
    return interests.reduce((s, i) => s + (parseFloat(i.gross) || 0), 0);
  }, [interests]);

  // ── Build stacked bar chart data (yearly) ──
  const { chartData, projectedBalance, projectedInterest } = useMemo(() => {
    const monthlyRate = avgTAE > 0 ? Math.pow(1 + avgTAE, 1 / 12) - 1 : 0;
    const totalMonths = projectionYears * 12;

    // Starting point: current balance is split into
    // invested = currentBalance - totalHistoricalInterest (what the user put in)
    // compoundInterest = totalHistoricalInterest (what interest generated)
    const startInvested = Math.max(0, currentBalance - totalHistoricalInterest);
    const startInterest = totalHistoricalInterest;

    let balance = currentBalance;
    let cumulativeInvested = startInvested;
    let cumulativeInterest = startInterest;

    const points: BarPoint[] = [];

    // Point 0: "Inicio" (current state)
    points.push({
      label: t("interests.projection.start"),
      invested: round2(cumulativeInvested),
      compoundInterest: round2(cumulativeInterest),
    });

    // Project month by month, snapshot every 12 months
    for (let m = 1; m <= totalMonths; m++) {
      const interest = balance * monthlyRate;
      balance += interest + contribution;
      cumulativeInvested += contribution;
      cumulativeInterest += interest;

      if (m % 12 === 0) {
        const year = m / 12;
        points.push({
          label: `${t("interests.projection.yearLabel")} ${year}`,
          invested: round2(cumulativeInvested),
          compoundInterest: round2(cumulativeInterest),
        });
      }
    }

    return {
      chartData: points,
      projectedBalance: round2(balance),
      projectedInterest: round2(cumulativeInterest - startInterest),
    };
  }, [currentBalance, totalHistoricalInterest, projectionYears, avgTAE, contribution, t]);

  // ── Axis formatter ──
  const fmtK = (v: number) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="py-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="py-4"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!interests.length) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {t("interests.noInterests")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t("interests.projection.currentBalance")}
          value={formatMoney(currentBalance)}
        />
        <MetricCard
          label={t("interests.projection.totalHistorical")}
          value={formatMoney(totalHistoricalInterest)}
          valueClass="text-green-500"
        />
        <MetricCard
          label={t("interests.projection.projectedBalance")}
          value={formatMoney(projectedBalance)}
          valueClass="text-blue-500"
        />
        <MetricCard
          label={t("interests.projection.futureInterest")}
          value={formatMoney(projectedInterest)}
          valueClass="text-emerald-500"
        />
      </div>

      {/* ── Controls ── */}
      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Years slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("interests.projection.years")}</Label>
                <span className="text-sm font-mono tabular-nums text-muted-foreground">
                  {projectionYears} {projectionYears === 1 ? t("interests.projection.year") : t("interests.projection.yearsUnit")}
                </span>
              </div>
              <Slider
                value={[projectionYears]}
                onValueChange={(v) => setProjectionYears(Array.isArray(v) ? v[0] : v)}
                min={1}
                max={20}
              />
            </div>
            {/* Monthly contribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("interests.projection.monthlyContribution")}</Label>
                <span className="text-sm font-mono tabular-nums text-muted-foreground">
                  {formatMoney(contribution)}
                </span>
              </div>
              <Input
                type="number"
                step="50"
                min="0"
                value={monthlyContribution ?? defaultContribution}
                onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)}
                className="font-mono tabular-nums"
              />
            </div>
          </div>
          {avgTAE > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("interests.projection.avgTAE")}: {(avgTAE * 100).toFixed(2)}%
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Stacked Bar Chart ── */}
      <Card>
        <CardContent className="pt-4 pb-2 px-2 sm:px-4">
          <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground mb-3 px-2">
            {t("interests.projection.chartTitle")}
          </p>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={theme.axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={theme.axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtK}
                width={55}
              />
              <Tooltip
                contentStyle={theme.tooltipStyle}
                labelStyle={theme.tooltipLabelStyle}
                itemStyle={theme.tooltipItemStyle}
                cursor={theme.tooltipCursor}
                formatter={(value, name) => {
                  const v = Number(value);
                  const label =
                    name === "invested"
                      ? t("interests.projection.invested")
                      : t("interests.projection.compoundInterest");
                  return [formatMoney(String(v.toFixed(2))), label];
                }}
              />
              <Legend
                wrapperStyle={theme.legendStyle}
                formatter={(value: string) =>
                  value === "invested"
                    ? t("interests.projection.invested")
                    : t("interests.projection.compoundInterest")
                }
              />
              <Bar
                dataKey="invested"
                stackId="total"
                fill={SERIES.investments}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="compoundInterest"
                stackId="total"
                fill={SERIES.interests}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function MetricCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${valueClass ?? ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
