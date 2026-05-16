"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { upsertSalaryStructure } from "@/app/actions/admin-salary";
import {
  computeSalary,
  fmtINR,
  fmtPct,
  paiseToRupees,
  rupeesToPaise,
} from "@/lib/salary";
import { SalaryTemplatesPanel } from "@/components/admin/settings/SalaryTemplatesPanel";
import type { SalaryTemplateRow } from "@/components/admin/settings/types";

export type SalaryInitial = {
  monthWagePaise: number;
  basicPercent: number;
  hraPercent: number;
  standardAllowancePercent: number;
  performanceBonusPercent: number;
  ltaPercent: number;
  pfEmployeePercent: number;
  pfEmployerPercent: number;
  professionalTaxPaise: number;
  workingDaysPerWeek: number;
  breakTimeHours: number;
};

export function SalaryInfoTab({
  initial,
  templates,
}: {
  initial: SalaryInitial;
  templates: SalaryTemplateRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    monthWageRupees: paiseToRupees(initial.monthWagePaise).toString(),
    basicPercent: initial.basicPercent,
    hraPercent: initial.hraPercent,
    standardAllowancePercent: initial.standardAllowancePercent,
    performanceBonusPercent: initial.performanceBonusPercent,
    ltaPercent: initial.ltaPercent,
    pfEmployeePercent: initial.pfEmployeePercent,
    pfEmployerPercent: initial.pfEmployerPercent,
    professionalTaxRupees: paiseToRupees(initial.professionalTaxPaise).toString(),
    workingDaysPerWeek: initial.workingDaysPerWeek,
    breakTimeHours: initial.breakTimeHours,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const monthWageRupees = Number(form.monthWageRupees) || 0;
  const monthWagePaise = rupeesToPaise(monthWageRupees);
  const yearlyWageRupees = monthWageRupees * 12;

  const computed = useMemo(
    () =>
      computeSalary(monthWagePaise, {
        basicPercent: form.basicPercent,
        hraPercent: form.hraPercent,
        standardAllowancePercent: form.standardAllowancePercent,
        performanceBonusPercent: form.performanceBonusPercent,
        ltaPercent: form.ltaPercent,
        pfEmployeePercent: form.pfEmployeePercent,
        pfEmployerPercent: form.pfEmployerPercent,
        professionalTax: rupeesToPaise(Number(form.professionalTaxRupees) || 0),
      }),
    [
      monthWagePaise,
      form.basicPercent,
      form.hraPercent,
      form.standardAllowancePercent,
      form.performanceBonusPercent,
      form.ltaPercent,
      form.pfEmployeePercent,
      form.pfEmployerPercent,
      form.professionalTaxRupees,
    ]
  );

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertSalaryStructure({
        monthWagePaise,
        basicPercent: form.basicPercent,
        hraPercent: form.hraPercent,
        standardAllowancePercent: form.standardAllowancePercent,
        performanceBonusPercent: form.performanceBonusPercent,
        ltaPercent: form.ltaPercent,
        pfEmployeePercent: form.pfEmployeePercent,
        pfEmployerPercent: form.pfEmployerPercent,
        professionalTax: rupeesToPaise(Number(form.professionalTaxRupees) || 0),
        workingDaysPerWeek: form.workingDaysPerWeek,
        breakTimeHours: form.breakTimeHours,
      });
      if (!res.success) return setError(res.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <SalaryTemplatesPanel templates={templates} />

      <div
        className="text-[11px] uppercase tracking-wide pt-2"
        style={{ color: "var(--fg-faint)" }}
      >
        My salary structure
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
      {/* Wage + working schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
        <div className="space-y-4">
          <div
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--fg-faint)" }}
          >
            Wage type · <span style={{ color: "var(--fg)" }}>Fixed</span>
          </div>
          <RupeeRow
            label="Monthly wage"
            unit="/ month"
            value={form.monthWageRupees}
            onChange={(v) => set("monthWageRupees", v)}
          />
          <RupeeRow
            label="Yearly wage"
            unit="/ year"
            value={yearlyWageRupees ? yearlyWageRupees.toString() : ""}
            onChange={(v) => {
              const yr = Number(v) || 0;
              set("monthWageRupees", (yr / 12).toString());
            }}
          />
        </div>

        <div className="space-y-4">
          <NumberRow
            label="Working days / week"
            value={form.workingDaysPerWeek}
            min={1}
            max={7}
            onChange={(v) => set("workingDaysPerWeek", v)}
          />
          <NumberRow
            label="Break time"
            value={form.breakTimeHours}
            unit="hrs"
            step={0.25}
            onChange={(v) => set("breakTimeHours", v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
        {/* Salary components */}
        <div className="space-y-5">
          <SectionTitle>Salary components</SectionTitle>

          <ComponentRow
            label="Basic Salary"
            description="Defined as a % of monthly wage."
            amountPaise={computed.basic}
            percent={form.basicPercent}
            percentLabel="of wage"
            onPercentChange={(v) => set("basicPercent", clamp01(v))}
          />
          <ComponentRow
            label="House Rent Allowance"
            description="HRA as a % of basic salary."
            amountPaise={computed.hra}
            percent={form.hraPercent}
            percentLabel="of basic"
            onPercentChange={(v) => set("hraPercent", clamp01(v))}
          />
          <ComponentRow
            label="Standard Allowance"
            description="Predetermined fixed allowance as a % of basic."
            amountPaise={computed.standardAllowance}
            percent={form.standardAllowancePercent}
            percentLabel="of basic"
            onPercentChange={(v) => set("standardAllowancePercent", clamp01(v))}
          />
          <ComponentRow
            label="Performance Bonus"
            description="Variable amount paid during payroll."
            amountPaise={computed.performanceBonus}
            percent={form.performanceBonusPercent}
            percentLabel="of basic"
            onPercentChange={(v) => set("performanceBonusPercent", clamp01(v))}
          />
          <ComponentRow
            label="Leave Travel Allowance"
            description="LTA paid to cover travel expenses."
            amountPaise={computed.lta}
            percent={form.ltaPercent}
            percentLabel="of basic"
            onPercentChange={(v) => set("ltaPercent", clamp01(v))}
          />
          <ComponentRow
            label="Fixed Allowance"
            description="Auto-balances: wage − sum of all components."
            amountPaise={computed.fixedAllowance}
            percent={computed.fixedPctOfBasic}
            percentLabel="of basic"
            readOnly
          />
        </div>

        {/* PF + Tax */}
        <div className="space-y-5">
          <SectionTitle>Provident Fund (PF) contribution</SectionTitle>
          <ComponentRow
            label="Employee"
            description="PF deducted from the employee's basic salary."
            amountPaise={computed.pfEmployee}
            percent={form.pfEmployeePercent}
            percentLabel="of basic"
            onPercentChange={(v) => set("pfEmployeePercent", clamp01(v))}
          />
          <ComponentRow
            label="Employer"
            description="Employer's matching contribution to PF."
            amountPaise={computed.pfEmployer}
            percent={form.pfEmployerPercent}
            percentLabel="of basic"
            onPercentChange={(v) => set("pfEmployerPercent", clamp01(v))}
          />

          <SectionTitle>Tax deductions</SectionTitle>
          <RupeeRow
            label="Professional Tax"
            unit="/ month"
            value={form.professionalTaxRupees}
            onChange={(v) => set("professionalTaxRupees", v)}
            description="Flat ₹/month deduction from gross salary."
          />

          {/* Summary */}
          <div
            className="rounded-md p-4 text-[12px] mt-4"
            style={{ background: "var(--bg-soft)" }}
          >
            <div className="font-medium mb-2 text-[13px]">Net pay (estimate)</div>
            <SummaryRow label="Gross" value={computed.monthWage} />
            <SummaryRow label="− PF (employee)" value={-computed.pfEmployee} />
            <SummaryRow label="− Professional Tax" value={-computed.professionalTax} />
            <div
              className="mt-2 pt-2 flex justify-between font-medium"
              style={{ borderTop: "1px solid var(--border-hairline)" }}
            >
              <span>Take-home</span>
              <span>
                ₹{" "}
                {fmtINR(
                  paiseToRupees(
                    computed.monthWage -
                      computed.pfEmployee -
                      computed.professionalTax
                  )
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <SaveBar pending={pending} error={error} saved={saved} />
      </form>
    </div>
  );
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[12px] uppercase tracking-wide pb-1.5"
      style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border-hairline)" }}
    >
      {children}
    </div>
  );
}

function RupeeRow({
  label,
  value,
  onChange,
  unit,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="text-[13px]">{label}</div>
        {description && (
          <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
            {description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
          ₹
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[120px] bg-transparent outline-none text-right text-[14px] py-1"
          style={{ borderBottom: "1px solid var(--border-hairline)" }}
        />
        {unit && (
          <span className="text-[12px] ml-1" style={{ color: "var(--fg-muted)" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 text-[13px]">{label}</div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-[80px] bg-transparent outline-none text-right text-[14px] py-1"
          style={{ borderBottom: "1px solid var(--border-hairline)" }}
        />
        {unit && (
          <span className="text-[12px] ml-1" style={{ color: "var(--fg-muted)" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function ComponentRow({
  label,
  description,
  amountPaise,
  percent,
  percentLabel,
  onPercentChange,
  readOnly,
}: {
  label: string;
  description?: string;
  amountPaise: number;
  percent: number;
  percentLabel: string;
  onPercentChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1">
        <div className="text-[13px]">{label}</div>
        <div className="text-right text-[13px] tabular-nums">
          ₹ {fmtINR(paiseToRupees(amountPaise))}
          <span className="text-[10px] ml-1" style={{ color: "var(--fg-faint)" }}>
            / mo
          </span>
        </div>
        {readOnly ? (
          <div
            className="w-[88px] text-right text-[13px] tabular-nums py-1"
            style={{ color: "var(--fg-muted)" }}
          >
            {fmtPct(percent)}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={(percent * 100).toFixed(2)}
              onChange={(e) =>
                onPercentChange?.(Number(e.target.value) / 100)
              }
              className="w-[64px] bg-transparent outline-none text-right text-[13px] py-1 tabular-nums"
              style={{ borderBottom: "1px solid var(--border-hairline)" }}
            />
            <span className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
              %
            </span>
          </div>
        )}
      </div>
      {(description || percentLabel) && (
        <div
          className="text-[11px] mt-0.5 flex justify-between"
          style={{ color: "var(--fg-faint)" }}
        >
          <span>{description}</span>
          <span>{percentLabel}</span>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  const sign = value < 0 ? "−" : "";
  return (
    <div className="flex justify-between py-0.5">
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span className="tabular-nums">
        {sign}₹ {fmtINR(paiseToRupees(Math.abs(value)))}
      </span>
    </div>
  );
}

function SaveBar({
  pending,
  error,
  saved,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  return (
    <div
      className="pt-4 flex items-center justify-between gap-3"
      style={{ borderTop: "1px solid var(--border-hairline)" }}
    >
      <div className="text-[12px] min-h-[18px]">
        {error && (
          <span className="inline-flex items-center gap-1.5" style={{ color: "#dc2626" }}>
            <AlertCircle size={13} /> {error}
          </span>
        )}
        {saved && !error && (
          <span className="inline-flex items-center gap-1.5" style={{ color: "#15803d" }}>
            <Check size={13} /> Saved
          </span>
        )}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
