"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Clock } from "lucide-react";
import { markAttendance } from "@/app/actions/attendance";

type Status = "PRESENT" | "ABSENT" | "HALF_DAY";

export function MarkAttendanceCard({
  initialStatus,
  hasApprovedLeaveToday,
}: {
  initialStatus: Status | null;
  hasApprovedLeaveToday: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function mark(next: Status) {
    setError(null);
    startTransition(async () => {
      const res = await markAttendance({ status: next });
      if (!res.success) return setError(res.error);
      setStatus(next);
      router.refresh();
    });
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-eyebrow mb-1">Today</div>
          <h3 className="h-section">{today}</h3>
        </div>
        <StatusPill status={status} hasApprovedLeaveToday={hasApprovedLeaveToday} />
      </div>

      {hasApprovedLeaveToday ? (
        <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
          You&apos;re on approved leave today. Attendance is set to{" "}
          <span className="font-medium" style={{ color: "var(--fg)" }}>
            On leave
          </span>{" "}
          automatically.
        </p>
      ) : (
        <>
          <div
            className="text-[12px] mb-2"
            style={{ color: "var(--fg-muted)" }}
          >
            Use the check-in button in the header to record start/end times,
            or mark today directly:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ChoiceButton
              label="Present"
              icon={<Check size={14} />}
              active={status === "PRESENT"}
              tone="success"
              disabled={pending}
              onClick={() => mark("PRESENT")}
            />
            <ChoiceButton
              label="Half day"
              icon={<Clock size={14} />}
              active={status === "HALF_DAY"}
              tone="warning"
              disabled={pending}
              onClick={() => mark("HALF_DAY")}
            />
            <ChoiceButton
              label="Absent"
              icon={<Minus size={14} />}
              active={status === "ABSENT"}
              tone="danger"
              disabled={pending}
              onClick={() => mark("ABSENT")}
            />
          </div>
          {error && (
            <p className="mt-3 text-[12px]" style={{ color: "#dc2626" }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ChoiceButton({
  label,
  icon,
  active,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  tone: "success" | "warning" | "danger";
  disabled: boolean;
  onClick: () => void;
}) {
  const TONE_BG = {
    success: "var(--color-bg-green)",
    warning: "var(--color-bg-yellow)",
    danger: "var(--color-bg-red)",
  };
  const TONE_FG = {
    success: "var(--color-green)",
    warning: "var(--color-yellow)",
    danger: "var(--color-red)",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn"
      style={{
        height: 40,
        background: active ? TONE_BG[tone] : "var(--bg-elevated)",
        color: active ? TONE_FG[tone] : "var(--fg)",
        border: active ? "1px solid transparent" : "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({
  status,
  hasApprovedLeaveToday,
}: {
  status: Status | null;
  hasApprovedLeaveToday: boolean;
}) {
  if (hasApprovedLeaveToday) return <span className="badge badge-secondary">On leave</span>;
  if (status === "PRESENT") return <span className="badge badge-success">Present</span>;
  if (status === "HALF_DAY") return <span className="badge badge-warning">Half day</span>;
  if (status === "ABSENT") return <span className="badge badge-danger">Absent</span>;
  return <span className="badge">Not marked</span>;
}
