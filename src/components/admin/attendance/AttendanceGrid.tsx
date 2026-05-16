"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plane, Calendar } from "lucide-react";
import type { CellStatus, DayCol, EmployeeRow } from "./types";
import { AttendanceDayTable } from "./AttendanceDayTable";

const STATUS: Record<
  CellStatus,
  { letter: string; bg: string; fg: string; title: string }
> = {
  PRESENT: { letter: "P", bg: "rgba(22,163,74,0.15)", fg: "#15803d", title: "Present" },
  HALF_DAY: { letter: "½", bg: "rgba(22,163,74,0.10)", fg: "#15803d", title: "Half day" },
  ABSENT: { letter: "A", bg: "rgba(234,179,8,0.18)", fg: "#a16207", title: "Absent" },
  ON_LEAVE: { letter: "L", bg: "rgba(14,165,233,0.15)", fg: "#0369a1", title: "On leave" },
  HOLIDAY: { letter: "H", bg: "rgba(120,113,108,0.15)", fg: "#57534e", title: "Holiday" },
  WEEKEND: { letter: "·", bg: "transparent", fg: "var(--fg-faint)", title: "Weekend" },
  NONE: { letter: "—", bg: "transparent", fg: "var(--fg-faint)", title: "Not marked" },
};

export function AttendanceGrid({
  from,
  to,
  days,
  rows,
  basePath = "/admin/attendance",
}: {
  from: string;
  to: string;
  days: DayCol[];
  rows: EmployeeRow[];
  basePath?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = (newFrom: string, newTo: string) => {
    startTransition(() => {
      router.push(`${basePath}?from=${newFrom}&to=${newTo}`);
    });
  };

  const shift = (deltaDays: number) => {
    const f = parseISO(from);
    const t = parseISO(to);
    navigate(
      format(addDays(f, deltaDays), "yyyy-MM-dd"),
      format(addDays(t, deltaDays), "yyyy-MM-dd")
    );
  };

  const span = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;

  const setToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    navigate(today, today);
  };

  const presetWeek = () => {
    const today = new Date();
    const t = format(today, "yyyy-MM-dd");
    const f = format(addDays(today, -6), "yyyy-MM-dd");
    navigate(f, t);
  };

  const presetMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    navigate(format(start, "yyyy-MM-dd"), format(today, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-eyebrow mb-1">Attendance</div>
          <h1 className="h-display-m">Attendance</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={setToday}
            className="btn btn-secondary"
          >
            Today
          </button>
          <button type="button" onClick={presetWeek} className="btn btn-secondary">
            Last 7 days
          </button>
          <button type="button" onClick={presetMonth} className="btn btn-secondary">
            This month
          </button>
        </div>
      </div>

      <div
        className="card p-4 flex items-center gap-3 flex-wrap"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <button
          type="button"
          onClick={() => shift(-Math.max(1, span))}
          disabled={pending}
          className="btn btn-ghost p-1.5"
          aria-label="Previous period"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: "var(--fg-muted)" }} />
          <input
            type="date"
            value={from}
            onChange={(e) => navigate(e.target.value, to)}
            className="input h-9 px-2"
          />
          <span style={{ color: "var(--fg-faint)" }}>→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => navigate(from, e.target.value)}
            className="input h-9 px-2"
          />
        </div>

        <button
          type="button"
          onClick={() => shift(Math.max(1, span))}
          disabled={pending}
          className="btn btn-ghost p-1.5"
          aria-label="Next period"
        >
          <ChevronRight size={18} />
        </button>

        <div className="ml-auto text-[12px]" style={{ color: "var(--fg-muted)" }}>
          {span} {span === 1 ? "day" : "days"} · {rows.length}{" "}
          {rows.length === 1 ? "employee" : "employees"}
        </div>
      </div>

      {span === 1 ? null : <Legend />}

      {span === 1 ? (
        <AttendanceDayTable rows={rows} />
      ) : rows.length === 0 ? (
        <div
          className="card p-10 text-center"
          style={{ color: "var(--fg-muted)" }}
        >
          No employees found.
        </div>
      ) : (
        <div
          className="card overflow-x-auto"
          style={{ boxShadow: "var(--shadow-1)" }}
        >
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-soft)" }}>
                <Th sticky className="text-left min-w-[220px]">
                  Employee
                </Th>
                {days.map((d) => (
                  <Th
                    key={d.iso}
                    className={`text-center px-1.5 py-2 ${
                      d.isWeekend ? "" : ""
                    }`}
                    title={d.iso}
                  >
                    <div
                      className={`text-[10px] uppercase ${
                        d.isToday ? "font-semibold" : ""
                      }`}
                      style={{
                        color: d.isToday ? "var(--accent)" : "var(--fg-faint)",
                      }}
                    >
                      {d.weekday}
                    </div>
                    <div
                      className={`text-[12px] ${d.isToday ? "font-semibold" : ""}`}
                      style={{ color: d.isToday ? "var(--accent)" : "var(--fg)" }}
                    >
                      {d.dayMonth}
                    </div>
                  </Th>
                ))}
                <Th className="text-center px-2 min-w-[110px]">Summary</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--border-hairline)" }}
                >
                  <Td sticky className="py-2 pl-3 pr-3">
                    <div className="text-[13px] font-medium">{r.fullName}</div>
                    <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
                      {r.loginId ? (
                        <span className="font-mono">{r.loginId}</span>
                      ) : (
                        "—"
                      )}
                      {r.department ? ` · ${r.department}` : ""}
                    </div>
                  </Td>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      className="text-center align-middle px-1 py-1"
                      style={{
                        background: days[i].isWeekend
                          ? "rgba(0,0,0,0.02)"
                          : undefined,
                      }}
                    >
                      <StatusChip status={c} />
                    </td>
                  ))}
                  <td className="text-center px-2 align-middle">
                    <Totals totals={r.totals} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
  sticky,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
  title?: string;
}) {
  return (
    <th
      scope="col"
      title={title}
      className={`text-[11px] font-medium px-2 py-2 ${
        sticky ? "sticky left-0 z-10" : ""
      } ${className}`}
      style={{
        color: "var(--fg-muted)",
        background: sticky ? "var(--bg-soft)" : undefined,
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  sticky,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <td
      className={`${sticky ? "sticky left-0 z-[1]" : ""} ${className}`}
      style={{
        background: sticky ? "var(--bg)" : undefined,
      }}
    >
      {children}
    </td>
  );
}

function StatusChip({ status }: { status: CellStatus }) {
  const s = STATUS[status];
  if (status === "ON_LEAVE") {
    return (
      <span
        title={s.title}
        className="inline-flex items-center justify-center h-6 w-6 rounded"
        style={{ background: s.bg, color: s.fg }}
      >
        <Plane size={12} />
      </span>
    );
  }
  return (
    <span
      title={s.title}
      className="inline-flex items-center justify-center h-6 w-6 rounded text-[12px] font-medium tabular-nums"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.letter}
    </span>
  );
}

function Totals({
  totals,
}: {
  totals: { present: number; absent: number; leave: number };
}) {
  return (
    <div
      className="inline-flex items-center gap-2 text-[11px]"
      style={{ color: "var(--fg-muted)" }}
    >
      <span style={{ color: "#15803d" }}>{trimNum(totals.present)}P</span>
      <span style={{ color: "#a16207" }}>{trimNum(totals.absent)}A</span>
      <span style={{ color: "#0369a1" }}>{trimNum(totals.leave)}L</span>
    </div>
  );
}

function trimNum(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function Legend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: "var(--fg-muted)" }}>
      <LegendItem status="PRESENT" label="Present" />
      <LegendItem status="HALF_DAY" label="Half day" />
      <LegendItem status="ABSENT" label="Absent" />
      <LegendItem status="ON_LEAVE" label="On leave" />
      <LegendItem status="HOLIDAY" label="Holiday" />
      <LegendItem status="WEEKEND" label="Weekend" />
      <LegendItem status="NONE" label="Not marked" />
    </div>
  );
}

function LegendItem({ status, label }: { status: CellStatus; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusChip status={status} />
      {label}
    </span>
  );
}
