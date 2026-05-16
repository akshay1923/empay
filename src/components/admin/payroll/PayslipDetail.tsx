"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  ShieldCheck,
  XCircle,
  Printer,
  AlertCircle,
  Check,
} from "lucide-react";
import type { PayslipStatus } from "@prisma/client";
import { validatePayslip, cancelPayslip } from "@/app/actions/admin-payroll";

const STATUS: Record<
  PayslipStatus,
  { bg: string; fg: string; label: string }
> = {
  DRAFT: { bg: "rgba(234,179,8,0.18)", fg: "#a16207", label: "Draft" },
  VALIDATED: { bg: "rgba(22,163,74,0.18)", fg: "#15803d", label: "Validated" },
  CANCELLED: { bg: "rgba(220,38,38,0.15)", fg: "#dc2626", label: "Cancelled" },
};

type SlipData = {
  id: string;
  status: PayslipStatus;
  validatedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  ctcAnnual: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
  employerPf: number;
  totalWorkingDays: number;
  daysPresent: number;
  daysOnLeave: number;
  daysAbsent: number;
  daysPayable: number;
};

type Employee = {
  fullName: string;
  loginId: string | null;
  email: string;
  department: string | null;
  designation: string | null;
};

type PayRunRef = {
  id: string;
  month: number;
  year: number;
  label: string;
  periodLabel: string;
};

export function PayslipDetail({
  slip,
  employee,
  payRun,
  basePath = "/admin/payroll",
}: {
  slip: SlipData;
  employee: Employee;
  payRun: PayRunRef;
  basePath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const status = STATUS[slip.status];
  const monthlyWage = Math.round(slip.ctcAnnual / 12); // paise
  const perDayPaise =
    slip.totalWorkingDays === 0 ? 0 : monthlyWage / slip.totalWorkingDays;

  const attendanceDays = slip.daysPresent; // already includes half-day adjustment
  const paidLeaveDays = Math.max(0, slip.daysPayable - attendanceDays);
  const attendanceAmount = Math.round(attendanceDays * perDayPaise);
  const paidLeaveAmount = Math.round(paidLeaveDays * perDayPaise);
  const totalEarned = attendanceAmount + paidLeaveAmount;

  const onValidate = () => {
    setError(null);
    startTransition(async () => {
      const res = await validatePayslip({ payslipId: slip.id });
      if (!res.success) return setError(res.error);
      router.refresh();
    });
  };

  const onCancel = () => {
    const reason =
      window.prompt("Reason for cancelling this payslip (optional)") ?? undefined;
    setError(null);
    startTransition(async () => {
      const res = await cancelPayslip({ payslipId: slip.id, reason });
      if (!res.success) return setError(res.error);
      router.refresh();
    });
  };

  const onPrint = () => {
    window.open(`/payslips/${slip.id}/print`, "_blank");
  };

  return (
    <div className="space-y-5 print-root">
      <div className="flex items-center gap-2 text-[12px] no-print">
        <Link
          href={`${basePath}?tab=payrun&payRunId=${payRun.id}`}
          className="inline-flex items-center gap-1 hover:underline"
          style={{ color: "var(--fg-muted)" }}
        >
          <ArrowLeft size={12} />
          Back to {payRun.label} payrun
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap no-print">
        <button
          type="button"
          onClick={onValidate}
          disabled={pending || slip.status === "VALIDATED" || slip.status === "CANCELLED"}
          className="btn btn-primary"
        >
          <ShieldCheck size={14} />
          {pending ? "Working…" : "Validate"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending || slip.status === "CANCELLED"}
          className="btn btn-secondary"
          style={{ color: "#dc2626" }}
        >
          <XCircle size={14} />
          Cancel
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="btn btn-secondary"
        >
          <Printer size={14} />
          Print
        </button>

        <span
          className="ml-auto inline-flex items-center px-3 py-1 rounded-md text-[12px] font-medium"
          style={{ background: status.bg, color: status.fg }}
        >
          {slip.status === "VALIDATED" && <Check size={13} className="mr-1" />}
          {status.label}
        </span>
      </div>

      {error && (
        <div
          className="rounded-md p-3 text-[12px] inline-flex items-center gap-2 no-print"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="card p-6" style={{ boxShadow: "var(--shadow-1)" }}>
        <h2
          className="font-display mb-4"
          style={{
            fontSize: 26,
            lineHeight: 1.2,
            color: "var(--fg-display)",
          }}
        >
          {employee.fullName}
        </h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-[13px] max-w-[640px]">
          <DT>Login ID</DT>
          <DD mono>{employee.loginId ?? "—"}</DD>
          <DT>Department</DT>
          <DD>
            {employee.designation ?? "—"}
            {employee.department ? ` · ${employee.department}` : ""}
          </DD>
          <DT>Payrun</DT>
          <DD>
            <Link
              href={`${basePath}?tab=payrun&payRunId=${payRun.id}`}
              className="hover:underline"
              style={{ color: "var(--secondary)" }}
            >
              Payrun {payRun.label}
            </Link>
          </DD>
          <DT>Salary structure</DT>
          <DD style={{ color: "var(--secondary)" }}>Regular Pay</DD>
          <DT>Period</DT>
          <DD>{payRun.periodLabel}</DD>
          {slip.status === "CANCELLED" && slip.cancellationReason && (
            <>
              <DT>Cancellation reason</DT>
              <DD style={{ color: "#991b1b" }}>{slip.cancellationReason}</DD>
            </>
          )}
        </dl>
      </div>

      <Tabs.Root defaultValue="worked">
        <Tabs.List
          className="flex gap-1 border-b mb-5"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <Tab value="worked">Worked Days</Tab>
          <Tab value="salary">Salary Computation</Tab>
        </Tabs.List>

        <Tabs.Content value="worked" className="outline-none">
          <WorkedDaysTab
            attendanceDays={attendanceDays}
            paidLeaveDays={paidLeaveDays}
            attendanceAmount={attendanceAmount}
            paidLeaveAmount={paidLeaveAmount}
            totalDays={slip.daysPayable}
            totalAmount={totalEarned}
            totalWorkingDays={slip.totalWorkingDays}
            daysAbsent={slip.daysAbsent}
            daysOnLeave={slip.daysOnLeave}
          />
        </Tabs.Content>

        <Tabs.Content value="salary" className="outline-none">
          <SalaryComputationTab slip={slip} />
        </Tabs.Content>
      </Tabs.Root>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header { display: none !important; }
          main { padding: 0 !important; }
          .print-root { background: white; color: black; }
          .card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
      `}</style>
    </div>
  );
}

function WorkedDaysTab({
  attendanceDays,
  paidLeaveDays,
  attendanceAmount,
  paidLeaveAmount,
  totalDays,
  totalAmount,
  totalWorkingDays,
  daysAbsent,
  daysOnLeave,
}: {
  attendanceDays: number;
  paidLeaveDays: number;
  attendanceAmount: number;
  paidLeaveAmount: number;
  totalDays: number;
  totalAmount: number;
  totalWorkingDays: number;
  daysAbsent: number;
  daysOnLeave: number;
}) {
  const unpaidLeaveDays = Math.max(0, daysOnLeave - paidLeaveDays);

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto" style={{ boxShadow: "var(--shadow-1)" }}>
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr style={{ background: "var(--bg-soft)" }}>
              <Th className="text-left">Type</Th>
              <Th className="text-left">Days</Th>
              <Th className="text-right pr-4">Amount</Th>
            </tr>
          </thead>
          <tbody>
            <Row
              type="Attendance"
              note={`${totalWorkingDays} working days in month`}
              days={attendanceDays}
              amount={attendanceAmount}
            />
            <Row
              type="Paid Time off"
              note={`Paid leaves count toward payable days`}
              days={paidLeaveDays}
              amount={paidLeaveAmount}
            />
            {(unpaidLeaveDays > 0 || daysAbsent > 0) && (
              <Row
                type="Unpaid / Absent"
                note="Deducted from salary"
                days={unpaidLeaveDays + daysAbsent}
                amount={0}
                muted
              />
            )}
            <tr
              className="border-t font-medium"
              style={{ borderColor: "var(--border-hairline)", background: "var(--bg-soft)" }}
            >
              <td className="px-3 py-2.5">Total payable</td>
              <td className="px-3 py-2.5 tabular-nums">{trim(totalDays)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums pr-4">
                {formatINR(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
        Salary is calculated based on the employee&apos;s monthly attendance.
        Paid leaves are included in the total payable days, while unpaid leaves
        and absences are deducted from the salary.
      </p>
    </div>
  );
}

function SalaryComputationTab({ slip }: { slip: SlipData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
        <SectionHeading>Earnings</SectionHeading>
        <Line label="Basic salary" value={slip.basic} />
        <Line label="House Rent Allowance" value={slip.hra} />
        <Line
          label="Allowances"
          value={slip.specialAllowance}
          note="Standard + Performance + LTA + Fixed"
        />
        <Total label="Gross earned" value={slip.grossEarned} />
      </div>

      <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
        <SectionHeading>Deductions</SectionHeading>
        <Line
          label="Provident Fund (employee)"
          value={slip.employeePf}
          note="12% of basic, capped at ₹15,000 basic"
        />
        <Line label="Professional Tax" value={slip.professionalTax} />
        <Total label="Total deductions" value={slip.totalDeductions} />

        <div
          className="mt-5 pt-4 flex items-baseline justify-between"
          style={{ borderTop: "1px solid var(--border-hairline)" }}
        >
          <div>
            <div
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--fg-faint)" }}
            >
              Net pay
            </div>
            <div
              className="font-display"
              style={{ fontSize: 28, lineHeight: 1.1, color: "var(--fg-display)" }}
            >
              {formatINR(slip.netPay)}
            </div>
          </div>
          <div className="text-[11px] text-right" style={{ color: "var(--fg-muted)" }}>
            <div>{trim(slip.daysPayable)} of {slip.totalWorkingDays} days payable</div>
            <div className="mt-0.5">CTC ₹{(slip.ctcAnnual / 100).toLocaleString("en-IN")}/year</div>
          </div>
        </div>
      </div>

      <div
        className="card p-5 lg:col-span-2"
        style={{ boxShadow: "var(--shadow-1)", background: "var(--bg-soft)" }}
      >
        <SectionHeading>Employer cost (informational)</SectionHeading>
        <Line label="Gross earned" value={slip.grossEarned} />
        <Line
          label="Employer PF contribution"
          value={slip.employerPf}
          note="On top of gross — paid by company"
        />
        <Total label="Total cost to company" value={slip.grossEarned + slip.employerPf} />
      </div>
    </div>
  );
}

function Row({
  type,
  note,
  days,
  amount,
  muted,
}: {
  type: string;
  note: string;
  days: number;
  amount: number;
  muted?: boolean;
}) {
  return (
    <tr
      className="border-t"
      style={{
        borderColor: "var(--border-hairline)",
        color: muted ? "var(--fg-muted)" : undefined,
      }}
    >
      <td className="px-3 py-2.5">
        <div>{type}</div>
        <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {note}
        </div>
      </td>
      <td className="px-3 py-2.5 tabular-nums">{trim(days)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums pr-4">
        {formatINR(amount)}
      </td>
    </tr>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[12px] uppercase tracking-wide pb-2 mb-3"
      style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border-hairline)" }}
    >
      {children}
    </div>
  );
}

function Line({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="py-1.5 flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[13px]">{label}</div>
        {note && (
          <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
            {note}
          </div>
        )}
      </div>
      <div className="tabular-nums text-[13px]">{formatINR(value)}</div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="mt-2 pt-2 flex items-baseline justify-between font-medium"
      style={{ borderTop: "1px solid var(--border-hairline)" }}
    >
      <span className="text-[13px]">{label}</span>
      <span className="tabular-nums text-[14px]">{formatINR(value)}</span>
    </div>
  );
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-4 py-2 text-[13px] -mb-px border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--fg)] text-[var(--fg-muted)] outline-none transition-colors"
    >
      {children}
    </Tabs.Trigger>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
      {children}
    </dt>
  );
}

function DD({
  children,
  mono,
  style,
}: {
  children: React.ReactNode;
  mono?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <dd className={mono ? "font-mono text-[13px]" : "text-[13px]"} style={style}>
      {children}
    </dd>
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

function trim(n: number): string {
  return Number.isInteger(n) ? n.toFixed(2) : n.toFixed(2);
}

function formatINR(paise: number): string {
  return (
    "₹ " +
    (paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
