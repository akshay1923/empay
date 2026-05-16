"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle, ShieldCheck, ChevronRight, FileDown } from "lucide-react";
import type { PayrollStatus, PayslipStatus } from "@prisma/client";
import { validatePayRun } from "@/app/actions/admin-payroll";
import { RunPayrollDialog } from "./RunPayrollDialog";
import { NewPayslipDialog } from "./NewPayslipDialog";
import type {
  EmployeeOption,
  PayRunSummary,
  PayslipRow,
} from "./types";

const PAYRUN_BADGE: Record<
  PayrollStatus,
  { bg: string; fg: string; label: string }
> = {
  DRAFT: { bg: "rgba(234,179,8,0.18)", fg: "#a16207", label: "Draft" },
  PROCESSED: { bg: "rgba(14,165,233,0.18)", fg: "#0369a1", label: "Processed" },
  PAID: { bg: "rgba(22,163,74,0.18)", fg: "#15803d", label: "Done" },
};

const SLIP_BADGE: Record<
  PayslipStatus,
  { bg: string; fg: string; label: string }
> = {
  DRAFT: { bg: "rgba(234,179,8,0.18)", fg: "#a16207", label: "Draft" },
  VALIDATED: { bg: "rgba(22,163,74,0.18)", fg: "#15803d", label: "Done" },
  CANCELLED: { bg: "rgba(220,38,38,0.15)", fg: "#dc2626", label: "Cancelled" },
};

export function PayrunTab({
  payruns,
  selected,
  payslips,
  employees,
  basePath = "/admin/payroll",
}: {
  payruns: PayRunSummary[];
  selected: PayRunSummary | null;
  payslips: PayslipRow[];
  employees: EmployeeOption[];
  basePath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onValidate = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await validatePayRun({ payRunId: selected.id });
      if (!res.success) return setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <RunPayrollDialog />
        <NewPayslipDialog employees={employees} />
        <button
          type="button"
          onClick={onValidate}
          disabled={
            pending || !selected || selected.status === "PAID"
          }
          className="btn btn-secondary"
        >
          <ShieldCheck size={14} />
          {pending ? "Validating…" : "Validate"}
        </button>
        {selected && (
          <a
            href={`/api/ecr/${selected.id}`}
            className="btn btn-secondary"
            title="Download EPFO ECR 2.0 file for this payrun"
          >
            <FileDown size={14} />
            Download ECR
          </a>
        )}

        {payruns.length > 0 && (
          <select
            value={selected?.id ?? ""}
            onChange={(e) =>
              router.push(`${basePath}?tab=payrun&payRunId=${e.target.value}`)
            }
            className="input h-9 ml-auto"
          >
            {payruns.map((p) => (
              <option key={p.id} value={p.id}>
                {monthName(p.month)} {p.year} · {PAYRUN_BADGE[p.status].label}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div
          className="rounded-md p-3 text-[12px] inline-flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {!selected ? (
        <div
          className="card p-10 text-center"
          style={{ color: "var(--fg-muted)" }}
        >
          No payruns yet. Click <strong>Payrun</strong> to generate one for the
          current month.
        </div>
      ) : (
        <>
          <PayrunSummary payrun={selected} />

          {payslips.length === 0 ? (
            <div
              className="card p-10 text-center"
              style={{ color: "var(--fg-muted)" }}
            >
              This payrun has no payslips.
            </div>
          ) : (
            <div
              className="card overflow-x-auto"
              style={{ boxShadow: "var(--shadow-1)" }}
            >
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr style={{ background: "var(--bg-soft)" }}>
                    <Th className="text-left">Pay Period</Th>
                    <Th className="text-left">Employee</Th>
                    <Th className="text-right">Employer Cost</Th>
                    <Th className="text-right">Basic Wage</Th>
                    <Th className="text-right">Gross Wage</Th>
                    <Th className="text-right">Net Wage</Th>
                    <Th className="text-center pr-4">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p) => (
                    <PayslipRowView
                      key={p.id}
                      slip={p}
                      payrun={selected}
                      onOpen={() =>
                        router.push(`/payslips/${p.id}`)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PayrunSummary({ payrun }: { payrun: PayRunSummary }) {
  const status = PAYRUN_BADGE[payrun.status];
  return (
    <div
      className="card p-4 flex items-center gap-6 flex-wrap"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <div>
        <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
          Pay run
        </div>
        <div className="text-[14px] font-semibold">
          {monthName(payrun.month)} {payrun.year}
        </div>
      </div>
      <Stat label="Employer Cost" value={formatINR(payrun.totalEmployerCost)} />
      <Stat label="Gross" value={formatINR(payrun.totalGross)} />
      <Stat label="Net" value={formatINR(payrun.totalNet)} />
      <div className="ml-auto">
        <span
          className="inline-flex items-center px-3 py-1 rounded-md text-[12px] font-medium"
          style={{ background: status.bg, color: status.fg }}
        >
          {payrun.status === "PAID" && <Check size={13} className="mr-1" />}
          {status.label}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
      </div>
      <div className="text-[14px] tabular-nums">{value}</div>
    </div>
  );
}

function PayslipRowView({
  slip,
  payrun,
  onOpen,
}: {
  slip: PayslipRow;
  payrun: PayRunSummary;
  onOpen: () => void;
}) {
  const badge = SLIP_BADGE[slip.status];
  return (
    <tr
      onClick={onOpen}
      className="border-t cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
      style={{ borderColor: "var(--border-hairline)" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td className="px-3 py-2.5 whitespace-nowrap">
        {monthName(payrun.month)} {payrun.year}
      </td>
      <td className="px-3 py-2.5">
        <div className="text-[13px] font-medium">{slip.fullName}</div>
        <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {slip.loginId ? <span className="font-mono">{slip.loginId}</span> : "—"}
          {" · "}
          {slip.daysPayable}/{slip.totalWorkingDays} days payable
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {formatINR(slip.grossEarned + slip.employerPf)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {formatINR(slip.basic)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {formatINR(slip.grossEarned)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
        {formatINR(slip.netPay)}
      </td>
      <td className="px-3 py-2.5 pr-3">
        <div className="flex items-center justify-center gap-1.5">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {slip.status === "VALIDATED" && <Check size={11} className="mr-0.5" />}
            {badge.label}
          </span>
          <ChevronRight size={14} style={{ color: "var(--fg-faint)" }} />
        </div>
      </td>
    </tr>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`text-[11px] font-medium px-3 py-2 ${className}`}
      style={{
        color: "var(--fg-muted)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      {children}
    </th>
  );
}

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}

function formatINR(paise: number): string {
  return (
    "₹ " +
    (paise / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
}
