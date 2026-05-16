"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ApplyLeaveDialog } from "./ApplyLeaveDialog";

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  PRESENT:  { bg: "var(--color-bg-green)",  fg: "var(--color-green)",  label: "Present" },
  ABSENT:   { bg: "var(--color-bg-red)",    fg: "var(--color-red)",    label: "Absent" },
  HALF_DAY: { bg: "var(--color-bg-yellow)", fg: "var(--color-yellow)", label: "Half" },
  ON_LEAVE: { bg: "var(--color-bg-blue)",   fg: "var(--color-blue)",   label: "Leave" },
  HOLIDAY:  { bg: "var(--color-bg-gray)",   fg: "var(--color-gray)",   label: "Holiday" },
};

export type DayInfo = {
  iso: string; // YYYY-MM-DD
  dayNumber: number;
  isSunday: boolean;
  isToday: boolean;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY" | null;
};

export type CalendarSummary = {
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
};

export function LeaveCalendar({
  leadEmpty,
  days,
  summary,
}: {
  leadEmpty: number;
  days: DayInfo[];
  summary: CalendarSummary;
}) {
  const [dragging, setDragging] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pendingRange, setPendingRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // End the drag on global mouseup so releasing outside the grid still works.
  useEffect(() => {
    const onUp = () => {
      if (!dragging) return;
      setDragging(false);
      if (anchor && hover) {
        const [start, end] = anchor <= hover ? [anchor, hover] : [hover, anchor];
        setPendingRange({ start, end });
      }
      setAnchor(null);
      setHover(null);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [dragging, anchor, hover]);

  const selection = useMemo(() => {
    if (!anchor || !hover) return null;
    const [start, end] = anchor <= hover ? [anchor, hover] : [hover, anchor];
    return { start, end };
  }, [anchor, hover]);

  const inSelection = (iso: string): boolean => {
    if (!selection) return false;
    return iso >= selection.start && iso <= selection.end;
  };

  const startDrag = (iso: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setAnchor(iso);
    setHover(iso);
  };

  const onEnter = (iso: string) => () => {
    if (dragging) setHover(iso);
  };

  const dragCount = selection
    ? days.filter(
        (d) =>
          d.iso >= selection.start &&
          d.iso <= selection.end &&
          !d.isSunday
      ).length
    : 0;

  return (
    <div className="card p-6 select-none" style={{ userSelect: "none" }}>
      <div
        className="flex items-center justify-between mb-3 text-[12px]"
        style={{ color: "var(--fg-muted)" }}
      >
        <span>Click and drag across days to apply for leave</span>
        {dragging && selection && (
          <span style={{ color: "var(--accent)" }}>
            {dragCount} working day{dragCount === 1 ? "" : "s"} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-[11px] uppercase font-medium text-center py-1"
            style={{ color: "var(--fg-muted)", letterSpacing: "0.06em" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadEmpty }).map((_, i) => (
          <div key={`pad-${i}`} className="h-14" />
        ))}
        {days.map((d) => {
          const status = d.isSunday ? "HOLIDAY" : d.status;
          const style = status ? STATUS_STYLE[status] : null;
          const selected = inSelection(d.iso);
          return (
            <div
              key={d.iso}
              onMouseDown={startDrag(d.iso)}
              onMouseEnter={onEnter(d.iso)}
              className={cn(
                "h-14 rounded-3 px-1.5 py-1 flex flex-col justify-between transition cursor-pointer",
                d.isToday && "ring-2"
              )}
              style={{
                background: selected
                  ? "rgba(113, 75, 103, 0.18)"
                  : style?.bg ?? "var(--bg-soft)",
                color: style?.fg ?? "var(--fg)",
                boxShadow: selected
                  ? "0 0 0 2px var(--accent)"
                  : d.isToday
                  ? "0 0 0 2px var(--accent)"
                  : "var(--shadow-1)",
              }}
            >
              <div
                className="text-[12px] font-medium"
                style={{ color: style?.fg ?? "var(--fg)" }}
              >
                {d.dayNumber}
              </div>
              {style && (
                <div
                  className="text-[10px]"
                  style={{ color: style.fg, opacity: 0.85 }}
                >
                  {style.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="mt-6 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
        style={{ borderTop: "1px solid var(--border-hairline)" }}
      >
        <SummaryStat label="Present" value={summary.present} tone="success" />
        <SummaryStat label="Half-day" value={summary.halfDay} tone="warning" />
        <SummaryStat label="On leave" value={summary.onLeave} tone="info" />
        <SummaryStat label="Absent" value={summary.absent} tone="danger" />
      </div>

      <ApplyLeaveDialog
        range={pendingRange}
        onClose={() => setPendingRange(null)}
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "info";
}) {
  const dotColor = {
    success: "var(--color-green)",
    warning: "var(--color-yellow)",
    danger: "var(--color-red)",
    info: "var(--color-blue)",
  }[tone];
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="h-2 w-2 rounded-full inline-block"
          style={{ background: dotColor }}
        />
        <span className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          {label}
        </span>
      </div>
      <div
        className="text-[20px] font-medium"
        style={{ color: "var(--fg-display)" }}
      >
        {value}
      </div>
    </div>
  );
}
