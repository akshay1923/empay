"use client";

import { AlertTriangle, IndianRupee } from "lucide-react";
import type { LeaveImpactPreview } from "@/app/actions/leave";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const LEAVE_LABEL: Record<string, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  UNPAID: "Unpaid",
};

function fmt(paise: number): string {
  // Render paise as ₹X,XXX (no decimals — matches the issue's mockups).
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

function signed(paise: number): string {
  if (paise === 0) return "₹0";
  const sign = paise > 0 ? "+" : "−";
  return sign + fmt(Math.abs(paise));
}

export function LeaveImpactCard({
  preview,
  loading,
  leaveType,
}: {
  preview: LeaveImpactPreview | null;
  loading: boolean;
  leaveType: "CASUAL" | "SICK" | "EARNED" | "UNPAID";
}) {
  if (!preview) {
    return (
      <div
        className="rounded-md border p-3 text-[12px]"
        style={{
          borderColor: "var(--border-hairline)",
          background: "var(--bg-soft)",
          color: "var(--fg-muted)",
        }}
      >
        {loading
          ? "Calculating payslip impact…"
          : "Pick a date range to see how this leave affects your next payslip."}
      </div>
    );
  }

  if (!preview.success) {
    return (
      <div
        className="rounded-md border p-3 text-[12px] inline-flex items-center gap-2 w-full"
        style={{
          borderColor: "var(--border-hairline)",
          background: "var(--bg-soft)",
          color: "var(--fg-muted)",
        }}
      >
        <AlertTriangle size={13} />
        Impact unavailable: {preview.error}
      </div>
    );
  }

  const paidNoChange =
    leaveType !== "UNPAID" && preview.delta.netPay === 0 && !preview.exceedsBalance;
  const monthLabel = `${MONTH_NAMES[preview.month - 1]} ${preview.year}`;

  return (
    <div
      className="rounded-md border p-3 text-[12px] space-y-2"
      style={{
        borderColor: "var(--border-hairline)",
        background: "var(--bg-soft)",
      }}
      data-testid="leave-impact-card"
    >
      <div
        className="flex items-center gap-1.5 font-semibold text-[12px]"
        style={{ color: "var(--fg)" }}
      >
        <IndianRupee size={13} />
        Impact on {monthLabel} payslip
        {loading && (
          <span style={{ color: "var(--fg-faint)" }}>
            {" "}
            · updating…
          </span>
        )}
      </div>

      {preview.multiMonth && (
        <div
          className="rounded p-1.5 inline-flex items-center gap-1.5 text-[11px]"
          style={{
            background: "rgba(234,179,8,0.10)",
            color: "#a16207",
          }}
        >
          <AlertTriangle size={11} /> Multi-month leave — only the{" "}
          {monthLabel} portion is previewed.
        </div>
      )}

      <ImpactRow
        label="Days payable"
        before={String(preview.before.daysPayable)}
        after={String(preview.after.daysPayable)}
        delta={
          preview.delta.daysPayable === 0
            ? paidNoChange
              ? "paid leave"
              : "unchanged"
            : (preview.delta.daysPayable > 0 ? "+" : "") +
              preview.delta.daysPayable +
              (leaveType === "UNPAID" ? " unpaid days" : " days")
        }
      />
      <ImpactRow
        label="Gross earned"
        before={fmt(preview.before.grossEarned)}
        after={fmt(preview.after.grossEarned)}
        delta={
          preview.delta.grossEarned === 0
            ? "unchanged"
            : signed(preview.delta.grossEarned)
        }
        negative={preview.delta.grossEarned < 0}
      />
      <ImpactRow
        label="PF deduction"
        before={fmt(preview.before.employeePf)}
        after={fmt(preview.after.employeePf)}
        delta={
          preview.delta.employeePf === 0
            ? "unchanged"
            : signed(preview.delta.employeePf)
        }
      />
      <ImpactRow
        label="Net pay"
        before={fmt(preview.before.netPay)}
        after={fmt(preview.after.netPay)}
        delta={
          preview.delta.netPay === 0
            ? "unchanged"
            : signed(preview.delta.netPay)
        }
        emphasised
        negative={preview.delta.netPay < 0}
      />

      {preview.balance && (
        <ImpactRow
          label="Balance after"
          before={`${LEAVE_LABEL[preview.balance.leaveType]} ${formatBalance(
            preview.balance.available
          )}`}
          after={`${LEAVE_LABEL[preview.balance.leaveType]} ${formatBalance(
            preview.balance.projectedAvailable
          )}`}
          delta={
            preview.requestedTotalDays === 0
              ? "no change"
              : `−${preview.requestedTotalDays} day${
                  preview.requestedTotalDays === 1 ? "" : "s"
                }`
          }
          negative={preview.balance.projectedAvailable < 0}
        />
      )}

      {!preview.balance && (
        <div
          className="text-[11px] pt-0.5"
          style={{ color: "var(--fg-faint)" }}
        >
          Balance after: no balance impact
        </div>
      )}

      {preview.exceedsBalance && (
        <div
          className="rounded p-2 text-[11px] inline-flex items-start gap-1.5 w-full"
          style={{
            background: "rgba(220,38,38,0.08)",
            color: "#b91c1c",
          }}
        >
          <AlertTriangle size={12} className="mt-[1px] shrink-0" />
          <span>
            Requested days exceed available{" "}
            {LEAVE_LABEL[leaveType].toLowerCase()} balance
            {preview.balance &&
              ` (need ${preview.requestedTotalDays}, have ${preview.balance.available})`}
            .{" "}
            {preview.unpaidFallback && (
              <>
                Taking the extra days as <strong>Unpaid</strong> would cost{" "}
                <strong>{signed(preview.unpaidFallback.delta.netPay)}</strong>{" "}
                from net pay.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function formatBalance(days: number): string {
  // Show one decimal only when meaningful.
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

function ImpactRow({
  label,
  before,
  after,
  delta,
  emphasised,
  negative,
}: {
  label: string;
  before: string;
  after: string;
  delta: string;
  emphasised?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-2"
      style={{
        fontWeight: emphasised ? 600 : 400,
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span className="flex items-baseline gap-1.5 font-mono text-[12px]">
        <span style={{ color: "var(--fg-muted)" }}>{before}</span>
        <span style={{ color: "var(--fg-faint)" }}>→</span>
        <span style={{ color: "var(--fg)" }}>{after}</span>
        <span
          className="text-[11px]"
          style={{
            color: negative ? "#b91c1c" : "var(--fg-faint)",
            minWidth: 0,
          }}
        >
          ({delta})
        </span>
      </span>
    </div>
  );
}
