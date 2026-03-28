"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";
import type { MortgageSimulationResult } from "@/types";

interface Props {
  result: MortgageSimulationResult;
}

function formatYearsMonths(years: number, months: number, t: (key: string) => string): string {
  const parts: string[] = [];
  if (years !== 0) parts.push(`${Math.abs(years)} ${t("properties.yearsUnit")}`);
  if (months !== 0) parts.push(`${Math.abs(months)} ${t("properties.monthsUnit")}`);
  if (parts.length === 0) return "0";
  const joined = parts.join(" ");
  return years < 0 || (years === 0 && months < 0) ? `-${joined}` : joined;
}

function DiffCell({ value, isMoney = true }: { value: string; isMoney?: boolean }) {
  const num = parseFloat(value);
  const color =
    num < 0 ? "text-emerald-500" : num > 0 ? "text-red-500" : "text-muted-foreground";
  const prefix = num > 0 ? "+" : "";
  return (
    <span className={`font-mono tabular-nums ${color}`}>
      {isMoney ? (prefix + formatMoney(value)) : `${prefix}${value}`}
    </span>
  );
}

export function SimulationResultsTable({ result }: Props) {
  const t = useTranslations();

  const rows = [
    {
      label: t("properties.resultMonthlyPayment"),
      current: formatMoney(result.current.monthly_payment),
      newVal: formatMoney(result.new.monthly_payment),
      diff: result.difference.monthly_payment,
      isMoney: true,
    },
    {
      label: t("properties.resultInstallments"),
      current: String(result.current.remaining_installments),
      newVal: String(result.new.remaining_installments),
      diff: String(result.difference.remaining_installments),
      isMoney: false,
    },
    {
      label: t("properties.resultTotalToPay"),
      current: formatMoney(result.current.total_remaining),
      newVal: formatMoney(result.new.total_remaining),
      diff: result.difference.total_remaining,
      isMoney: true,
    },
    {
      label: t("properties.resultTotalInterest"),
      current: formatMoney(result.current.total_interest),
      newVal: formatMoney(result.new.total_interest),
      diff: result.difference.total_interest,
      isMoney: true,
    },
    {
      label: t("properties.resultRemainingTime"),
      current: formatYearsMonths(result.current.remaining_years, result.current.remaining_months, t),
      newVal: formatYearsMonths(result.new.remaining_years, result.new.remaining_months, t),
      diffYears: result.difference.remaining_years,
      diffMonths: result.difference.remaining_months,
      isTime: true,
    },
  ];

  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4 space-y-4">
        <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground">
          {t("properties.resultTitle")} —{" "}
          {result.strategy === "REDUCE_PAYMENT"
            ? t("properties.reducePayment")
            : t("properties.reduceTerm")}
        </p>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs font-mono">
                <th className="text-left py-2 pr-4"></th>
                <th className="text-right py-2 px-2">{t("properties.resultCurrent")}</th>
                <th className="text-right py-2 px-2">{t("properties.resultNew")}</th>
                <th className="text-right py-2 pl-2">{t("properties.resultDifference")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.label}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {row.current}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {row.newVal}
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    {"isTime" in row ? (
                      (() => {
                        const totalDiffMonths = (row.diffYears ?? 0) * 12 + (row.diffMonths ?? 0);
                        const color = totalDiffMonths < 0 ? "text-emerald-500" : totalDiffMonths > 0 ? "text-red-500" : "text-muted-foreground";
                        return (
                          <span className={`font-mono tabular-nums ${color}`}>
                            {formatYearsMonths(row.diffYears ?? 0, row.diffMonths ?? 0, t)}
                          </span>
                        );
                      })()
                    ) : (
                      <DiffCell value={row.diff!} isMoney={row.isMoney} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interest savings highlight */}
        {parseFloat(result.difference.total_interest) < 0 && (
          <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-4 py-3">
            <span className="text-sm font-medium">{t("properties.interestSavings")}</span>
            <span className="font-mono text-lg font-bold tabular-nums text-emerald-500">
              {formatMoney(
                Math.abs(parseFloat(result.difference.total_interest)).toFixed(2),
              )}
            </span>
          </div>
        )}

        {/* Monthly interest rate */}
        <p className="text-xs text-muted-foreground text-center">
          {t("properties.resultMonthlyRate")}: {result.monthly_interest_rate}%
        </p>
      </CardContent>
    </Card>
  );
}
