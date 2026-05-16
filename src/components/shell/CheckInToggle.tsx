"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { LogIn, LogOut, Check } from "lucide-react";
import { checkIn, checkOut } from "@/app/actions/admin-attendance";

type State = {
  checkInAt: string | null;
  checkOutAt: string | null;
};

const STANDARD_WORK_MS = 8 * 60 * 60 * 1000; // 8h
const AUTO_CHECKOUT_KEY = "empay.autoCheckout";

export function CheckInToggle({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [autoCheckout, setAutoCheckout] = useState(false);

  const isCheckedIn = !!state.checkInAt && !state.checkOutAt;
  const isDone = !!state.checkInAt && !!state.checkOutAt;

  // Hydrate the preference once on mount so SSR markup matches the initial
  // unchecked state and we don't fight React's hydration.
  useEffect(() => {
    try {
      setAutoCheckout(localStorage.getItem(AUTO_CHECKOUT_KEY) === "1");
    } catch {
      // localStorage may be unavailable (private browsing) — preference stays off.
    }
  }, []);

  const onToggleAuto = (next: boolean) => {
    setAutoCheckout(next);
    try {
      localStorage.setItem(AUTO_CHECKOUT_KEY, next ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  };

  // Live work-hours ticker while checked in.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isCheckedIn) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [isCheckedIn]);

  const doCheckOut = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await checkOut(localDateString());
      if (!res.success) {
        setError(res.error);
        return;
      }
      setState((s) => ({ ...s, checkOutAt: new Date().toISOString() }));
    });
  }, []);

  // Fire the auto-checkout exactly at checkInAt + 8h (or immediately if past).
  useEffect(() => {
    if (!isCheckedIn || !autoCheckout || !state.checkInAt) return;
    const dueAt = new Date(state.checkInAt).getTime() + STANDARD_WORK_MS;
    const delay = Math.max(0, dueAt - Date.now());
    const id = window.setTimeout(() => doCheckOut(), delay);
    return () => window.clearTimeout(id);
  }, [isCheckedIn, autoCheckout, state.checkInAt, doCheckOut]);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const local = localDateString();
      const res = isCheckedIn ? await checkOut(local) : await checkIn(local);
      if (!res.success) {
        setError(res.error);
        return;
      }
      const nowIso = new Date().toISOString();
      setState((s) =>
        isCheckedIn ? { ...s, checkOutAt: nowIso } : { ...s, checkInAt: nowIso }
      );
    });
  };

  const autoCheckbox = !isDone && (
    <label
      className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
      style={{ color: "var(--fg-muted)" }}
      title="When enabled, EmPay checks you out automatically 8 hours after check-in. Hours beyond 8 only count as extra time when this is off."
    >
      <input
        type="checkbox"
        checked={autoCheckout}
        onChange={(e) => onToggleAuto(e.target.checked)}
        className="h-3 w-3"
      />
      Auto check-out after 8h
    </label>
  );

  if (isDone) {
    const total = minutesBetween(state.checkInAt!, state.checkOutAt!);
    return (
      <div
        className="inline-flex items-center gap-2 rounded-md px-3 h-9 text-[12px] font-medium border tabular-nums"
        style={{
          background: "var(--bg-soft)",
          color: "var(--fg-muted)",
          borderColor: "var(--border-hairline)",
        }}
        title={`Day complete · in ${fmtTime(state.checkInAt)} → out ${fmtTime(state.checkOutAt)}`}
      >
        <Check size={13} style={{ color: "#16a34a" }} />
        <span className="font-mono">{fmtTime(state.checkInAt)}</span>
        <span style={{ color: "var(--fg-faint)" }}>→</span>
        <span className="font-mono">{fmtTime(state.checkOutAt)}</span>
        <span
          className="px-1.5 rounded"
          style={{ background: "var(--bg-elevated)", color: "var(--fg)" }}
        >
          {fmtMinutes(total)}
        </span>
      </div>
    );
  }

  if (isCheckedIn) {
    const elapsed = Math.max(
      0,
      Math.round((now - new Date(state.checkInAt!).getTime()) / 60000)
    );
    return (
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center gap-1.5 text-[12px] tabular-nums"
          style={{ color: "var(--fg-muted)" }}
          title={`Checked in at ${fmtTime(state.checkInAt)}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#16a34a" }}
          />
          <span className="font-mono">{fmtTime(state.checkInAt)}</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span style={{ color: "var(--fg)" }}>{fmtMinutes(elapsed)}</span>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md h-9 px-3 text-[12px] font-medium text-white transition-colors disabled:opacity-60"
          style={{ background: "#dc2626" }}
          title="Click to check out"
        >
          <LogOut size={14} />
          Check out
        </button>
        {autoCheckbox}
        {error && (
          <span className="text-[11px]" style={{ color: "#dc2626" }}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md h-9 px-3 text-[12px] font-medium text-white transition-colors disabled:opacity-60"
        style={{ background: "#16a34a" }}
        title="Check in"
      >
        <LogIn size={14} />
        Check in
      </button>
      {autoCheckbox}
      {error && (
        <span className="text-[11px]" style={{ color: "#dc2626" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtMinutes(min: number): string {
  if (min === 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function minutesBetween(a: string, b: string): number {
  return Math.max(
    0,
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
  );
}

// YYYY-MM-DD in the browser's local timezone — what the employee thinks of
// as "today" regardless of where the server lives.
function localDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
