"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { formatMoney } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";
import { annuityPayment } from "@/lib/mortgage-math";
import type { Property } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
}

type MortgageType = "FIXED" | "VARIABLE";

/**
 * Compute months elapsed from a purchase date to today.
 */
function computeMonthsPaid(purchaseDate: string): number {
  if (!purchaseDate) return 0;
  const [y, m] = purchaseDate.split("-").map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return Math.max(0, months);
}

/**
 * Compute outstanding balance after N months of payments.
 * Uses the standard remaining balance formula:
 * B_n = P * [(1+r)^N - (1+r)^n] / [(1+r)^N - 1]
 */
function computeOutstandingBalance(
  principal: number,
  monthlyRate: number,
  totalMonths: number,
  monthsPaid: number,
): number {
  if (monthlyRate === 0) {
    return Math.max(0, principal - (principal / totalMonths) * monthsPaid);
  }
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const factorPaid = Math.pow(1 + monthlyRate, monthsPaid);
  return Math.max(0, principal * (factor - factorPaid) / (factor - 1));
}

export function PropertyFormDialog({ open, onOpenChange, property }: Props) {
  const t = useTranslations();
  const qc = useQueryClient();
  const isEdit = !!property;

  // ── Basic fields ──
  const [name, setName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  // ── Mortgage fields (user inputs) ──
  const [hasMortgage, setHasMortgage] = useState(false);
  const [originalLoan, setOriginalLoan] = useState("");
  const [termYears, setTermYears] = useState("");
  const [mortgageType, setMortgageType] = useState<MortgageType>("FIXED");
  const [fixedRate, setFixedRate] = useState("");
  const [differential, setDifferential] = useState("");
  const [euribor, setEuribor] = useState("");

  useEffect(() => {
    if (open) {
      if (property) {
        setName(property.name);
        setCurrentValue(property.current_value);
        setPurchasePrice(property.purchase_price ?? "");
        setPurchaseDate(property.purchase_date ?? "");
        setNotes(property.notes ?? "");
        setHasMortgage(property.has_mortgage);
        setOriginalLoan(property.original_loan_amount ?? "");
        // Derive term in years from total_term_months
        const months = property.total_term_months ?? 0;
        setTermYears(months > 0 ? String(months / 12) : "");
        // Determine mortgage type from rate
        setFixedRate(property.annual_interest_rate ?? "");
        setMortgageType("FIXED");
        setDifferential("");
        setEuribor("");
      } else {
        setName("");
        setCurrentValue("");
        setPurchasePrice("");
        setPurchaseDate("");
        setNotes("");
        setHasMortgage(false);
        setOriginalLoan("");
        setTermYears("");
        setMortgageType("FIXED");
        setFixedRate("");
        setDifferential("");
        setEuribor("");
      }
    }
  }, [open, property]);

  // ── Auto-calculated values ──
  const loanNum = parseFloat(originalLoan) || 0;
  const yearsNum = parseFloat(termYears) || 0;
  const totalMonths = Math.round(yearsNum * 12);

  const annualRate = useMemo(() => {
    if (mortgageType === "FIXED") {
      return parseFloat(fixedRate) || 0;
    }
    return (parseFloat(differential) || 0) + (parseFloat(euribor) || 0);
  }, [mortgageType, fixedRate, differential, euribor]);

  const monthlyRate = annualRate / 100 / 12;

  const calculatedPayment = useMemo(() => {
    if (loanNum <= 0 || totalMonths <= 0) return 0;
    return annuityPayment(loanNum, monthlyRate, totalMonths);
  }, [loanNum, monthlyRate, totalMonths]);

  const monthsPaid = useMemo(() => {
    return computeMonthsPaid(purchaseDate);
  }, [purchaseDate]);

  const outstandingBalance = useMemo(() => {
    if (loanNum <= 0 || totalMonths <= 0) return 0;
    const paid = Math.min(monthsPaid, totalMonths);
    return computeOutstandingBalance(loanNum, monthlyRate, totalMonths, paid);
  }, [loanNum, monthlyRate, totalMonths, monthsPaid]);

  const amortizedCapital = loanNum - outstandingBalance;

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? api.put(`/properties/${property!.id}/`, data)
        : api.post("/properties/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name,
      current_value: currentValue,
      purchase_price: purchasePrice || null,
      purchase_date: purchaseDate || null,
      notes,
    };
    if (hasMortgage && loanNum > 0 && totalMonths > 0) {
      data.original_loan_amount = loanNum.toFixed(2);
      data.outstanding_balance = Math.round(outstandingBalance * 100) / 100;
      data.annual_interest_rate = annualRate.toFixed(4);
      data.total_term_months = totalMonths;
      data.months_paid = Math.min(monthsPaid, totalMonths);
      data.monthly_payment = (Math.round(calculatedPayment * 100) / 100).toFixed(2);
    } else {
      data.original_loan_amount = null;
      data.outstanding_balance = null;
      data.annual_interest_rate = null;
      data.total_term_months = null;
      data.months_paid = null;
      data.monthly_payment = null;
    }
    mutation.mutate(data);
  };

  const showCalculated = hasMortgage && loanNum > 0 && totalMonths > 0 && annualRate > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("properties.editProperty") : t("properties.addProperty")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic fields */}
          <div className="space-y-2">
            <Label htmlFor="prop-name">{t("properties.name")}</Label>
            <Input
              id="prop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-value">{t("properties.currentValue")}</Label>
            <Input
              id="prop-value"
              type="number"
              step="0.01"
              min="0"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-purchase-price">{t("properties.purchasePrice")}</Label>
              <Input
                id="prop-purchase-price"
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-purchase-date">{t("properties.purchaseDate")}</Label>
              <Input
                id="prop-purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-notes">{t("properties.notes")}</Label>
            <Input
              id="prop-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Mortgage toggle */}
          <div className="pt-2 border-t">
            <button
              type="button"
              onClick={() => setHasMortgage(!hasMortgage)}
              className={`w-full px-3 py-2.5 rounded-md border text-sm transition-colors text-left ${
                hasMortgage
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {t("properties.hasMortgage")}
            </button>
          </div>

          {hasMortgage && (
            <div className="space-y-4 pl-3 border-l-2 border-primary/30">
              {/* User inputs: loan amount + term in years */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prop-loan">{t("properties.originalLoan")}</Label>
                  <Input
                    id="prop-loan"
                    type="number"
                    step="0.01"
                    min="0"
                    value={originalLoan}
                    onChange={(e) => setOriginalLoan(e.target.value)}
                    placeholder="91500.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prop-years">{t("properties.termYears")}</Label>
                  <Input
                    id="prop-years"
                    type="number"
                    min="1"
                    max="40"
                    value={termYears}
                    onChange={(e) => setTermYears(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Mortgage type toggle */}
              <div className="space-y-2">
                <Label>{t("properties.mortgageTypeLabel")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMortgageType("FIXED")}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                      mortgageType === "FIXED"
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {t("properties.mortgageFixed")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMortgageType("VARIABLE")}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                      mortgageType === "VARIABLE"
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {t("properties.mortgageVariable")}
                  </button>
                </div>
              </div>

              {/* Rate fields */}
              {mortgageType === "FIXED" ? (
                <div className="space-y-2">
                  <Label htmlFor="prop-fixed-rate">{t("properties.fixedRate")} (%)</Label>
                  <Input
                    id="prop-fixed-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fixedRate}
                    onChange={(e) => setFixedRate(e.target.value)}
                    placeholder="1.70"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prop-euribor">{t("properties.euriborLabel")} (%)</Label>
                    <Input
                      id="prop-euribor"
                      type="number"
                      step="0.001"
                      value={euribor}
                      onChange={(e) => setEuribor(e.target.value)}
                      placeholder="3.500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prop-diff">{t("properties.differentialLabel")} (%)</Label>
                    <Input
                      id="prop-diff"
                      type="number"
                      step="0.01"
                      min="0"
                      value={differential}
                      onChange={(e) => setDifferential(e.target.value)}
                      placeholder="0.99"
                    />
                  </div>
                </div>
              )}

              {/* Auto-calculated results */}
              {showCalculated && (
                <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
                  <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground mb-2">
                    {t("properties.calculatedValues")}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">{t("properties.monthlyPayment")}</span>
                    <span className="font-mono font-semibold tabular-nums text-right">
                      {formatMoney(calculatedPayment)}
                    </span>

                    <span className="text-muted-foreground">{t("properties.interestRate")}</span>
                    <span className="font-mono tabular-nums text-right">{annualRate.toFixed(2)}%</span>

                    <span className="text-muted-foreground">{t("properties.totalTerm")}</span>
                    <span className="font-mono tabular-nums text-right">{totalMonths} {t("properties.monthsUnit")}</span>

                    {purchaseDate && (
                      <>
                        <span className="text-muted-foreground">{t("properties.monthsPaid")}</span>
                        <span className="font-mono tabular-nums text-right">{monthsPaid} {t("properties.monthsUnit")}</span>

                        <span className="text-muted-foreground">{t("properties.outstandingBalance")}</span>
                        <span className="font-mono font-semibold tabular-nums text-right">
                          {formatMoney(Math.round(outstandingBalance * 100) / 100)}
                        </span>

                        <span className="text-muted-foreground">{t("properties.amortizedCapital")}</span>
                        <span className="font-mono tabular-nums text-right text-emerald-500">
                          {formatMoney(Math.round(amortizedCapital * 100) / 100)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {isEdit ? t("common.save") : t("properties.addProperty")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
