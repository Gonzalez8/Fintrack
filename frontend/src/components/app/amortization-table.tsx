"use client";

import React, { useMemo, useState } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";
import type { AmortizationRow, AmortizationEvent, SimulationStrategy } from "@/types";

interface Props {
  schedule: AmortizationRow[];
  modifiedSchedule?: AmortizationRow[];
  currentMonth: number;
  events: AmortizationEvent[];
  onAddEvent?: (month: number, amount: number, strategy: SimulationStrategy) => void;
  onEditEvent?: (id: string, amount: number, strategy: SimulationStrategy) => void;
  onDeleteEvent?: (id: string) => void;
}

type ViewMode = "all" | "yearly";

interface RowData extends AmortizationRow {
  year: number;
  remainingInstallments: number;
  isEventMonth: boolean;
  event: AmortizationEvent | null;
  isPast: boolean;
  isCurrent: boolean;
}

export function AmortizationTable({
  schedule, modifiedSchedule, currentMonth, events,
  onAddEvent, onEditEvent, onDeleteEvent,
}: Props) {
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState("");
  const [formStrategy, setFormStrategy] = useState<SimulationStrategy>("REDUCE_TERM");

  const isInteractive = !!(onAddEvent && onEditEvent && onDeleteEvent);
  const displaySchedule = modifiedSchedule ?? schedule;
  const eventMap = useMemo(() => new Map(events.map((e) => [e.month, e])), [events]);

  const rows: RowData[] = useMemo(() => {
    return displaySchedule.map((row) => {
      const event = eventMap.get(row.month);
      return {
        ...row,
        year: row.date ? parseInt(row.date.split("-")[0]) : 0,
        remainingInstallments: displaySchedule.length - 1 - row.month,
        isEventMonth: !!event && !!modifiedSchedule,
        event: event ?? null,
        isPast: row.month <= currentMonth,
        isCurrent: row.month === currentMonth,
      };
    });
  }, [displaySchedule, currentMonth, eventMap, modifiedSchedule]);

  const yearlyRows = useMemo(() => {
    if (viewMode !== "yearly") return [];
    const yearMap = new Map<number, {
      year: number; firstDate: string; lastDate: string;
      totalPayment: number; totalPrincipal: number; totalInterest: number;
      endBalance: number; endRemainingInstallments: number;
      hasEvent: boolean; eventLabels: string[]; isPast: boolean; monthCount: number;
    }>();
    for (const row of rows) {
      if (row.month === 0) continue;
      const existing = yearMap.get(row.year);
      if (existing) {
        existing.totalPayment += row.payment;
        existing.totalPrincipal += row.principal;
        existing.totalInterest += row.interest;
        existing.endBalance = row.remainingBalance;
        existing.endRemainingInstallments = row.remainingInstallments;
        existing.lastDate = row.date;
        existing.monthCount++;
        if (row.isEventMonth && row.event) {
          existing.hasEvent = true;
          const label = row.event.strategy === "REDUCE_PAYMENT" ? t("properties.reducePayment") : t("properties.reduceTerm");
          existing.eventLabels.push(`${formatMoney(row.event.amount)} (${label})`);
        }
        existing.isPast = row.isPast;
      } else {
        const eventLabels: string[] = [];
        if (row.isEventMonth && row.event) {
          const label = row.event.strategy === "REDUCE_PAYMENT" ? t("properties.reducePayment") : t("properties.reduceTerm");
          eventLabels.push(`${formatMoney(row.event.amount)} (${label})`);
        }
        yearMap.set(row.year, {
          year: row.year, firstDate: row.date, lastDate: row.date,
          totalPayment: row.payment, totalPrincipal: row.principal,
          totalInterest: row.interest, endBalance: row.remainingBalance,
          endRemainingInstallments: row.remainingInstallments,
          hasEvent: row.isEventMonth, eventLabels, isPast: row.isPast, monthCount: 1,
        });
      }
    }
    return Array.from(yearMap.values());
  }, [rows, viewMode, t]);

  // ── Inline form ──
  const openForm = (month: number) => {
    const event = eventMap.get(month);
    setEditingMonth(month);
    if (event) {
      setEditingEventId(event.id);
      setFormAmount(String(event.amount));
      setFormStrategy(event.strategy);
    } else {
      setEditingEventId(null);
      setFormAmount("");
      setFormStrategy("REDUCE_TERM");
    }
  };
  const closeForm = () => { setEditingMonth(null); setEditingEventId(null); };
  const saveForm = () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0 || editingMonth === null) return;
    if (editingEventId) onEditEvent?.(editingEventId, amount, formStrategy);
    else onAddEvent?.(editingMonth, amount, formStrategy);
    closeForm();
  };
  const handleRowClick = (month: number) => {
    if (!isInteractive || month === 0 || viewMode === "yearly") return;
    editingMonth === month ? closeForm() : openForm(month);
  };

  // ── Mobile inline form ──
  const renderMobileForm = () => (
    <div className="px-4 py-3 bg-primary/5 border-b space-y-2">
      <p className="text-xs text-muted-foreground">
        {t("properties.monthLabel")} {editingMonth}
      </p>
      <Input
        type="number" step="0.01" min="0.01"
        value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
        placeholder="10000.00" className="h-8 text-sm font-mono" autoFocus
      />
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setFormStrategy("REDUCE_PAYMENT")}
          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${formStrategy === "REDUCE_PAYMENT" ? "border-primary bg-primary/10 font-medium" : "border-border"}`}>
          {t("properties.reducePayment")}
        </button>
        <button type="button" onClick={() => setFormStrategy("REDUCE_TERM")}
          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${formStrategy === "REDUCE_TERM" ? "border-primary bg-primary/10 font-medium" : "border-border"}`}>
          {t("properties.reduceTerm")}
        </button>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-7" onClick={closeForm}><X className="h-3.5 w-3.5 mr-1" />{t("properties.eventCancel")}</Button>
        <Button size="sm" className="h-7" onClick={saveForm}><Check className="h-3.5 w-3.5 mr-1" />{t("properties.eventSave")}</Button>
      </div>
    </div>
  );

  // ── Desktop inline form ──
  const renderDesktopForm = () => (
    <tr className="border-b bg-primary/5">
      <td colSpan={9} className="py-2 px-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{t("properties.monthLabel")} {editingMonth}:</span>
          <Input type="number" step="0.01" min="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
            placeholder="10000.00" className="h-7 w-28 text-xs font-mono" autoFocus />
          <div className="flex gap-1">
            <button type="button" onClick={() => setFormStrategy("REDUCE_PAYMENT")}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${formStrategy === "REDUCE_PAYMENT" ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/50"}`}>
              {t("properties.reducePayment")}
            </button>
            <button type="button" onClick={() => setFormStrategy("REDUCE_TERM")}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${formStrategy === "REDUCE_TERM" ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/50"}`}>
              {t("properties.reduceTerm")}
            </button>
          </div>
          <Button size="sm" className="h-7 px-2" onClick={saveForm}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={closeForm}><X className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );

  // ── Mobile card row ──
  const MobileRow = ({ row }: { row: RowData }) => (
    <>
      <div
        onClick={() => handleRowClick(row.month)}
        className={`px-4 py-2.5 transition-colors ${
          row.isEventMonth ? "bg-emerald-500/10" : row.isCurrent ? "bg-primary/10" : row.isPast ? "opacity-50" : ""
        } ${isInteractive ? "cursor-pointer active:bg-secondary/40" : ""}`}
      >
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="font-mono text-sm font-medium">
            {row.month} · {row.date}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums">{formatMoney(row.remainingBalance)}</span>
        </div>
        <div className="grid grid-cols-3 gap-x-2 text-[11px] font-mono">
          <div>
            <p className="text-muted-foreground/60 mb-0.5">{t("properties.resultMonthlyPayment")}</p>
            <p className="tabular-nums">{formatMoney(row.payment)}</p>
          </div>
          <div>
            <p className="text-muted-foreground/60 mb-0.5">{t("properties.interestLabel")}</p>
            <p className="tabular-nums text-amber-500">{formatMoney(row.interest)}</p>
          </div>
          <div>
            <p className="text-muted-foreground/60 mb-0.5">{t("properties.capitalAmortized")}</p>
            <p className="tabular-nums text-emerald-500">{formatMoney(row.principal)}</p>
          </div>
        </div>
        {row.isEventMonth && row.event && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-500 font-semibold">
              {t("properties.extraPaymentShort")}: {formatMoney(row.event.amount)} ·{" "}
              {row.event.strategy === "REDUCE_PAYMENT" ? t("properties.reducePayment") : t("properties.reduceTerm")}
            </span>
            {onDeleteEvent && (
              <button onClick={(e) => { e.stopPropagation(); if (confirm(t("properties.deleteEventConfirm"))) onDeleteEvent(row.event!.id); }}
                className="p-1 rounded hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
              </button>
            )}
          </div>
        )}
      </div>
      {editingMonth === row.month && renderMobileForm()}
    </>
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("properties.amortizationTable")}
            </p>
            {isInteractive && viewMode === "all" && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t("properties.clickToAmortize")}
              </p>
            )}
          </div>
          <div className="flex gap-0.5 bg-secondary/50 border border-border rounded-lg p-1">
            <button onClick={() => { setViewMode("all"); closeForm(); }}
              className={`px-2 py-1 font-mono text-[10px] tracking-wide rounded-md transition-all duration-150 ${viewMode === "all" ? "bg-background shadow-sm text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
              {t("properties.viewMonthly")}
            </button>
            <button onClick={() => { setViewMode("yearly"); closeForm(); }}
              className={`px-2 py-1 font-mono text-[10px] tracking-wide rounded-md transition-all duration-150 ${viewMode === "yearly" ? "bg-background shadow-sm text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
              {t("properties.viewYearly")}
            </button>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border/40">
          {viewMode === "all"
            ? rows.filter((r) => r.month > 0).map((row) => <MobileRow key={row.month} row={row} />)
            : yearlyRows.map((row) => (
                <div key={row.year} className={`px-4 py-2.5 ${row.hasEvent ? "bg-emerald-500/10" : row.isPast ? "opacity-50" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{row.year}</span>
                    <span className="font-mono text-sm font-bold tabular-nums">{formatMoney(row.endBalance)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 text-[11px] font-mono">
                    <div>
                      <p className="text-muted-foreground/60 mb-0.5">{t("properties.resultMonthlyPayment")}</p>
                      <p className="tabular-nums">{formatMoney(row.totalPayment)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/60 mb-0.5">{t("properties.interestLabel")}</p>
                      <p className="tabular-nums text-amber-500">{formatMoney(row.totalInterest)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/60 mb-0.5">{t("properties.capitalAmortized")}</p>
                      <p className="tabular-nums text-emerald-500">{formatMoney(row.totalPrincipal)}</p>
                    </div>
                  </div>
                  {row.hasEvent && (
                    <p className="mt-1 text-[10px] font-mono text-emerald-500 font-semibold">{row.eventLabels.join(" · ")}</p>
                  )}
                </div>
              ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3 whitespace-nowrap">{viewMode === "yearly" ? t("properties.yearLabel") : t("properties.monthLabel")}</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">{t("properties.dateLabel")}</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">{t("properties.resultMonthlyPayment")}</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">{t("properties.interestLabel")}</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">{t("properties.capitalAmortized")}</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">{t("properties.balanceLabel")}</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">{t("properties.installmentsLeft")}</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">{t("properties.extraPaymentShort")}</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">{t("properties.strategyShort")}</th>
              </tr>
            </thead>
            <tbody>
              {viewMode === "all"
                ? rows.filter((r) => r.month > 0).flatMap((row) => {
                    const rowEl = (
                      <tr key={row.month} onClick={() => handleRowClick(row.month)}
                        className={`border-b last:border-0 transition-colors ${
                          row.isEventMonth ? "bg-emerald-500/10 font-semibold" : row.isCurrent ? "bg-primary/10" : row.isPast ? "text-muted-foreground/60" : ""
                        } ${isInteractive ? "cursor-pointer hover:bg-secondary/50" : ""}`}>
                        <td className="py-1.5 px-3 tabular-nums">{row.month}</td>
                        <td className="py-1.5 px-2 tabular-nums">{row.date}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(row.payment)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-amber-500">{formatMoney(row.interest)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-emerald-500">{formatMoney(row.principal)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(row.remainingBalance)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{row.remainingInstallments}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">
                          {row.isEventMonth && row.event ? <span className="text-emerald-500 font-semibold">{formatMoney(row.event.amount)}</span> : ""}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          {row.isEventMonth && row.event ? (
                            <span className="flex items-center gap-1">
                              <span>{row.event.strategy === "REDUCE_PAYMENT" ? t("properties.reducePayment") : t("properties.reduceTerm")}</span>
                              {onDeleteEvent && (
                                <button onClick={(e) => { e.stopPropagation(); if (confirm(t("properties.deleteEventConfirm"))) onDeleteEvent(row.event!.id); }}
                                  className="p-0.5 rounded hover:bg-red-500/10 transition-colors ml-1">
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                </button>
                              )}
                            </span>
                          ) : ""}
                        </td>
                      </tr>
                    );
                    if (editingMonth === row.month) {
                      return [rowEl, <React.Fragment key={`form-${row.month}`}>{renderDesktopForm()}</React.Fragment>];
                    }
                    return [rowEl];
                  })
                : yearlyRows.map((row) => (
                    <tr key={row.year} className={`border-b last:border-0 transition-colors ${row.hasEvent ? "bg-emerald-500/10 font-semibold" : row.isPast ? "text-muted-foreground/60" : ""}`}>
                      <td className="py-1.5 px-3 tabular-nums">{row.year}</td>
                      <td className="py-1.5 px-2 tabular-nums">{row.firstDate} — {row.lastDate}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(row.totalPayment)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-amber-500">{formatMoney(row.totalInterest)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-emerald-500">{formatMoney(row.totalPrincipal)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(row.endBalance)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{row.endRemainingInstallments}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">
                        {row.hasEvent ? <span className="text-emerald-500 font-semibold">{row.eventLabels.join(", ")}</span> : ""}
                      </td>
                      <td className="py-1.5 px-2"></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
