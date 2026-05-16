"use client";

import { Plane } from "lucide-react";
import type { CellStatus, EmployeeRow } from "./types";

const STATUS_DOT: Record<CellStatus, { color: string; label: string }> = {
  PRESENT: { color: "#16a34a", label: "Present" },
  HALF_DAY: { color: "#16a34a", label: "Half day" },
  ABSENT: { color: "#eab308", label: "Absent" },
  ON_LEAVE: { color: "#0ea5e9", label: "On leave" },
  HOLIDAY: { color: "#78716c", label: "Holiday" },
  WEEKEND: { color: "#9ca3af", label: "Weekend" },
  NONE: { color: "#9ca3af", label: "Not marked" },
};

export function AttendanceDayTable({ rows }: { rows: EmployeeRow[] }) {
  if (rows.length === 0) {
    return (
      <div
        className="card p-10 text-center"
        style={{ color: "var(--fg-muted)" }}
      >
        No employees found.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto" style={{ boxShadow: "var(--shadow-1)" }}>
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr style={{ background: "var(--bg-soft)" }}>
            <Th className="text-left min-w-[260px]">Employee</Th>
            <Th className="text-left">Check-in</Th>
            <Th className="text-left">Check-out</Th>
            <Th className="text-right">Work hours</Th>
            <Th className="text-right">Extra hours</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: EmployeeRow }) {
  const day = row.day;
  const status = day?.status ?? row.cells[0] ?? "NONE";
  const dot = STATUS_DOT[status];

  return (
    <tr className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
      <td className="py-2 pl-3 pr-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon status={status} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{row.fullName}</div>
            <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {row.loginId ? <span className="font-mono">{row.loginId}</span> : "—"}
              {row.department ? ` · ${row.department}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 align-middle">
        {isNonWorking(status) ? (
          <span style={{ color: dot.color }}>{dot.label}</span>
        ) : (
          <Time iso={day?.checkInAt ?? null} />
        )}
      </td>
      <td className="px-3 py-2 align-middle">
        {isNonWorking(status) ? (
          <span style={{ color: "var(--fg-faint)" }}>—</span>
        ) : (
          <Time iso={day?.checkOutAt ?? null} />
        )}
      </td>
      <td className="px-3 py-2 align-middle text-right tabular-nums">
        {fmtMinutes(day?.workMinutes ?? null)}
      </td>
      <td className="px-3 py-2 align-middle text-right tabular-nums">
        <ExtraHours minutes={day?.extraMinutes ?? null} />
      </td>
    </tr>
  );
}

function StatusIcon({ status }: { status: CellStatus }) {
  const d = STATUS_DOT[status];
  if (status === "ON_LEAVE") {
    return (
      <span
        className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0"
        style={{ background: "rgba(14,165,233,0.15)", color: d.color }}
        title={d.label}
      >
        <Plane size={12} />
      </span>
    );
  }
  return (
    <span
      className="h-2 w-2 rounded-full shrink-0"
      style={{ background: d.color }}
      title={d.label}
    />
  );
}

function Time({ iso }: { iso: string | null }) {
  if (!iso) return <span style={{ color: "var(--fg-faint)" }}>—</span>;
  return (
    <span className="font-mono tabular-nums">
      {new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
    </span>
  );
}

function ExtraHours({ minutes }: { minutes: number | null }) {
  if (minutes === null) {
    return <span style={{ color: "var(--fg-faint)" }}>—</span>;
  }
  if (minutes === 0) return <span>0h</span>;
  const positive = minutes > 0;
  const color = positive ? "#15803d" : "#dc2626";
  const sign = positive ? "+" : "−";
  return (
    <span style={{ color }}>
      {sign}
      {fmtMinutes(Math.abs(minutes))}
    </span>
  );
}

function fmtMinutes(min: number | null): string {
  if (min === null) return "—";
  if (min === 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function isNonWorking(s: CellStatus): boolean {
  return s === "ON_LEAVE" || s === "HOLIDAY" || s === "WEEKEND" || s === "ABSENT";
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
