"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, ArrowRight } from "lucide-react";
import type { ChartPoint, DashboardData, Warning } from "./types";

const WARNING_LABEL: Record<Warning["kind"], (n: number) => string> = {
  "no-bank": (n) => `${n} ${n === 1 ? "Employee" : "Employees"} without Bank A/C`,
  "no-manager": (n) => `${n} ${n === 1 ? "Employee" : "Employees"} without Manager`,
};

export function DashboardTab({
  data,
  basePath = "/admin/payroll",
}: {
  data: DashboardData;
  basePath?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <WarningsCard warnings={data.warnings} />
      <PayrunHistoryCard payruns={data.payruns} basePath={basePath} />
      <BarChartCard
        title="Employer cost"
        formatter={(v) => formatINR(v / 100)}
        monthly={data.employerCostByMonth}
        annual={data.employerCostByYear}
        accent="#714B67"
      />
      <BarChartCard
        title="Employee count"
        formatter={(v) => v.toString()}
        monthly={data.employeeCountByMonth}
        annual={data.employeeCountByYear}
        accent="#017E84"
      />
    </div>
  );
}

function WarningsCard({ warnings }: { warnings: Warning[] }) {
  return (
    <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="text-[12px] uppercase tracking-wide pb-2 mb-3 flex items-center gap-2"
        style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border-hairline)" }}
      >
        <AlertTriangle size={14} />
        Warnings
      </div>
      {warnings.length === 0 ? (
        <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
          No issues — all employees have bank details and a manager assigned.
        </div>
      ) : (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li
              key={w.kind}
              className="text-[13px]"
              style={{ color: "var(--secondary)" }}
            >
              {WARNING_LABEL[w.kind](w.count)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PayrunHistoryCard({
  payruns,
  basePath,
}: {
  payruns: { id: string; month: number; year: number; payslipCount: number }[];
  basePath: string;
}) {
  return (
    <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="text-[12px] uppercase tracking-wide pb-2 mb-3 flex items-center gap-2"
        style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border-hairline)" }}
      >
        <FileText size={14} />
        Payrun
      </div>
      {payruns.length === 0 ? (
        <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
          No payruns yet. Switch to the Payrun tab and run payroll to create one.
        </div>
      ) : (
        <ul className="space-y-2">
          {payruns.map((p) => (
            <li key={p.id}>
              <Link
                href={`${basePath}?tab=payrun&payRunId=${p.id}`}
                className="flex items-center justify-between text-[13px] hover:underline"
                style={{ color: "var(--secondary)" }}
              >
                <span>
                  Payrun for {monthName(p.month)} {p.year} ({p.payslipCount}{" "}
                  Payslip{p.payslipCount === 1 ? "" : "s"})
                </span>
                <ArrowRight size={12} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BarChartCard({
  title,
  monthly,
  annual,
  formatter,
  accent,
}: {
  title: string;
  monthly: ChartPoint[];
  annual: ChartPoint[];
  formatter: (v: number) => string;
  accent: string;
}) {
  const [view, setView] = useState<"monthly" | "annual">("monthly");
  const data = view === "monthly" ? monthly : annual;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
      <div className="flex items-center justify-between pb-2 mb-3" style={{ borderBottom: "1px solid var(--border-hairline)" }}>
        <div className="text-[12px] uppercase tracking-wide" style={{ color: "var(--fg-muted)" }}>
          {title}
        </div>
        <div
          className="inline-flex rounded-md p-0.5 text-[11px]"
          style={{ background: "var(--bg-soft)" }}
        >
          <ToggleBtn active={view === "annual"} onClick={() => setView("annual")}>
            Annual
          </ToggleBtn>
          <ToggleBtn active={view === "monthly"} onClick={() => setView("monthly")}>
            Monthly
          </ToggleBtn>
        </div>
      </div>

      <div className="h-[180px] flex items-stretch gap-3 px-2 pt-5">
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-2">
              <div
                className="w-full max-w-[56px] rounded-t-md flex items-end justify-center relative"
                style={{
                  height: `${Math.max(6, pct)}%`,
                  background: accent,
                  opacity: d.value === 0 ? 0.25 : 0.85,
                }}
                title={formatter(d.value)}
              >
                <div
                  className="absolute -top-5 text-[10px] font-medium whitespace-nowrap"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {formatter(d.value)}
                </div>
              </div>
              <div className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-0.5 rounded transition-colors"
      style={{
        background: active ? "var(--bg)" : "transparent",
        color: active ? "var(--fg)" : "var(--fg-muted)",
        fontWeight: active ? 500 : 400,
        boxShadow: active ? "var(--shadow-1)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}

function formatINR(rupees: number): string {
  return (
    "₹ " +
    rupees.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
}
