"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, X, AlertCircle, Plane, Mail, MailX, Paperclip } from "lucide-react";
import { LeaveStatus, LeaveType } from "@prisma/client";
import { decideLeave } from "@/app/actions/admin-leave";
import { NewLeaveDialog } from "./NewLeaveDialog";
import type {
  EmployeeOption,
  LeaveRequestRow,
  LeaveSummary,
} from "./types";

const STATUS_FILTERS: Array<LeaveStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_BADGE: Record<LeaveStatus, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: "rgba(234,179,8,0.18)", fg: "#a16207", label: "Pending" },
  APPROVED: { bg: "rgba(22,163,74,0.15)", fg: "#15803d", label: "Approved" },
  REJECTED: { bg: "rgba(220,38,38,0.12)", fg: "#dc2626", label: "Rejected" },
  CANCELLED: { bg: "var(--bg-soft)", fg: "var(--fg-muted)", label: "Cancelled" },
};

const TYPE_LABEL: Record<LeaveType, string> = {
  CASUAL: "Casual leave",
  SICK: "Sick leave",
  EARNED: "Earned leave",
  UNPAID: "Unpaid leave",
};

export function RequestsTab({
  requests,
  summaries,
  employees,
  year,
  canApprove = true,
  canCreateRequest = true,
}: {
  requests: LeaveRequestRow[];
  summaries: LeaveSummary[];
  employees: EmployeeOption[];
  year: number;
  canApprove?: boolean;
  canCreateRequest?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<
    | { kind: "ok"; message: string }
    | { kind: "warn"; message: string }
    | null
  >(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.loginId ?? "").toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.leaveType.toLowerCase().includes(q)
      );
    });
  }, [requests, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summaries.map((s) => (
          <SummaryCard key={s.leaveType} summary={s} year={year} />
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {canCreateRequest && <NewLeaveDialog employees={employees} />}
        <div className="relative flex-1 max-w-[420px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--fg-faint)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, login ID, reason…"
            className="input w-full pl-9"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className="px-2.5 py-1 rounded-md text-[12px] transition-colors"
              style={{
                background:
                  statusFilter === s ? "var(--bg-active)" : "transparent",
                color:
                  statusFilter === s ? "var(--fg)" : "var(--fg-muted)",
                fontWeight: statusFilter === s ? 500 : 400,
              }}
            >
              {s === "ALL" ? "All" : STATUS_BADGE[s].label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="rounded-md p-3 text-[12px] inline-flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {flash && (
        <div
          className="rounded-md p-3 text-[12px] inline-flex items-center gap-2"
          style={{
            background:
              flash.kind === "ok"
                ? "rgba(22,163,74,0.08)"
                : "rgba(234,179,8,0.12)",
            color: flash.kind === "ok" ? "#15803d" : "#a16207",
          }}
        >
          {flash.kind === "ok" ? <Mail size={14} /> : <MailX size={14} />}
          {flash.message}
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="card p-10 text-center"
          style={{ color: "var(--fg-muted)" }}
        >
          {requests.length === 0
            ? "No time-off requests yet."
            : "No requests match your filters."}
        </div>
      ) : (
        <div className="card overflow-x-auto" style={{ boxShadow: "var(--shadow-1)" }}>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-soft)" }}>
                <Th className="text-left">Name</Th>
                <Th className="text-left">Start date</Th>
                <Th className="text-left">End date</Th>
                <Th className="text-left">Days</Th>
                <Th className="text-left">Time off type</Th>
                <Th className="text-left">Status</Th>
                <Th className="text-right pr-4">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <RequestRow
                  key={r.id}
                  req={r}
                  canApprove={canApprove}
                  onError={(msg) => {
                    setError(msg);
                    setFlash(null);
                  }}
                  onFlash={(f) => {
                    setError(null);
                    setFlash(f);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ summary, year }: { summary: LeaveSummary; year: number }) {
  return (
    <div className="card p-4" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="text-[11px] uppercase tracking-wide mb-1"
        style={{ color: "var(--secondary)" }}
      >
        {summary.label}
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className="font-display"
          style={{ fontSize: 28, lineHeight: 1, color: "var(--fg-display)" }}
        >
          {summary.totalAvailable}
        </div>
        <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          days available
        </div>
      </div>
      <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
        {summary.totalAllocated > 0
          ? `of ${summary.totalAllocated} allocated · ${year}`
          : `No allocations for ${year}`}
      </div>
    </div>
  );
}

function RequestRow({
  req,
  canApprove,
  onError,
  onFlash,
}: {
  req: LeaveRequestRow;
  canApprove: boolean;
  onError: (msg: string | null) => void;
  onFlash: (f: { kind: "ok" | "warn"; message: string }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const status = STATUS_BADGE[req.status];

  const decide = (decision: "APPROVE" | "REJECT") => {
    onError(null);
    startTransition(async () => {
      const reason =
        decision === "REJECT"
          ? window.prompt("Reason for rejection (optional)") ?? undefined
          : undefined;
      const res = await decideLeave({
        leaveId: req.id,
        decision,
        reason,
      });
      if (!res.success) return onError(res.error);
      const verb = decision === "APPROVE" ? "approved" : "rejected";
      onFlash({
        kind: "ok",
        message: `${req.fullName}'s leave ${verb}. Email is sending in the background.`,
      });
      router.refresh();
    });
  };

  return (
    <tr className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
      <td className="py-2.5 pl-3 pr-3">
        <div className="text-[13px] font-medium">{req.fullName}</div>
        <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {req.loginId ? <span className="font-mono">{req.loginId}</span> : "—"}
        </div>
      </td>
      <td className="px-3 py-2.5 tabular-nums">{fmtDate(req.startDate)}</td>
      <td className="px-3 py-2.5 tabular-nums">{fmtDate(req.endDate)}</td>
      <td className="px-3 py-2.5 tabular-nums">{trimNum(req.totalDays)}</td>
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: "var(--secondary)" }}
        >
          <Plane size={12} />
          {TYPE_LABEL[req.leaveType]}
        </span>
        {req.receiptUrl && (
          <a
            href={req.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 ml-2 text-[11px] hover:underline"
            style={{ color: "var(--accent)" }}
            title={req.receiptName ?? "View receipt"}
          >
            <Paperclip size={11} />
            Receipt
          </a>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{ background: status.bg, color: status.fg }}
        >
          {status.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right pr-4">
        {req.status === "PENDING" && canApprove ? (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => decide("REJECT")}
              disabled={pending}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white disabled:opacity-60"
              style={{ background: "#dc2626" }}
              aria-label="Reject"
              title="Reject"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => decide("APPROVE")}
              disabled={pending}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white disabled:opacity-60"
              style={{ background: "#16a34a" }}
              aria-label="Approve"
              title="Approve"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <span style={{ color: "var(--fg-faint)" }} className="text-[11px]">
            —
          </span>
        )}
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

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00.000Z").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
