"use client";

import { Plane } from "lucide-react";
import type { EmployeeListItem } from "./types";

const STATUS = {
  PRESENT: { label: "Present", color: "#16a34a" },
  ABSENT: { label: "Absent", color: "#eab308" },
  LEAVE: { label: "On leave", color: "#0ea5e9" },
  NONE: { label: "Not marked", color: "#9ca3af" },
} as const;

export function EmployeeCard({
  employee,
  onClick,
}: {
  employee: EmployeeListItem;
  onClick: () => void;
}) {
  const s = STATUS[employee.todayStatus];
  return (
    <button
      type="button"
      onClick={onClick}
      className="card p-4 text-left flex items-center gap-4 w-full hover:shadow-md transition-shadow"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
        style={{
          background: "rgba(113,75,103,0.12)",
          color: "var(--accent-text)",
        }}
      >
        {initials(employee.fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-medium truncate">{employee.fullName}</div>
          {employee.loginId && (
            <span
              className="text-[11px] font-mono shrink-0"
              style={{ color: "var(--fg-faint)" }}
            >
              {employee.loginId}
            </span>
          )}
        </div>
        <div className="text-[12px] truncate" style={{ color: "var(--fg-muted)" }}>
          {employee.designation || "—"}
          {employee.department ? ` · ${employee.department}` : ""}
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 text-[11px] shrink-0"
        style={{ color: "var(--fg-muted)" }}
        title={s.label}
      >
        {employee.todayStatus === "LEAVE" ? (
          <Plane size={14} style={{ color: s.color }} />
        ) : (
          <span
            className="h-2 w-2 rounded-full inline-block"
            style={{ background: s.color }}
          />
        )}
        <span>{s.label}</span>
      </div>
    </button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
