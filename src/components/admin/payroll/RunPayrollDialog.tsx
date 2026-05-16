"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Play,
  X,
  AlertCircle,
  Check,
  FlaskConical,
  ChevronLeft,
  TriangleAlert,
} from "lucide-react";
import { runPayroll, dryRunPayroll } from "@/app/actions/admin-payroll";

type EmployeePreview = {
  userId: string;
  name: string;
  ctcAnnual: number;
  grossEarned: number;
  totalDeductions: number;
  netPay: number;
  daysPayable: number;
  totalWorkingDays: number;
};

type Preview = {
  monthLabel: string;
  year: number;
  pending: EmployeePreview[];
  skipped: { name: string; reason: string }[];
  warnings: { userId: string; name: string; reason: string }[];
  totals: { gross: number; net: number; deductions: number; employerCost: number };
  existing: { id: string; status: "DRAFT" | "PROCESSED" | "PAID" } | null;
};

const fmtINR = (paise: number) =>
  `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export function RunPayrollDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{
    payRunId: string;
    generated: number;
    skipped: { name: string; reason: string }[];
  } | null>(null);

  const reset = () => {
    setError(null);
    setConfirmReplace(false);
    setPreview(null);
    setResult(null);
  };

  const submitDryRun = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await dryRunPayroll({ month, year });
      if (!res.success) return setError(res.error);
      setPreview({
        monthLabel: res.monthLabel,
        year: res.year,
        pending: res.pending.map((p) => ({
          userId: p.userId,
          name: p.name,
          ctcAnnual: p.ctcAnnual,
          grossEarned: p.grossEarned,
          totalDeductions: p.totalDeductions,
          netPay: p.netPay,
          daysPayable: p.daysPayable,
          totalWorkingDays: p.totalWorkingDays,
        })),
        skipped: res.skipped.map((s) => ({ name: s.name, reason: s.reason })),
        warnings: res.warnings.map((w) => ({
          userId: w.userId,
          name: w.name,
          reason: w.reason,
        })),
        totals: res.totals,
        existing: res.existing,
      });
    });
  };

  const submitRun = (replace: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await runPayroll({ month, year, replace });
      if (!res.success) {
        if ("existingId" in res && res.existingId) {
          setConfirmReplace(true);
        }
        return setError(res.error);
      }
      setResult({
        payRunId: res.payRunId,
        generated: res.generated,
        skipped: res.skipped ?? [],
      });
      setPreview(null);
      router.refresh();
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          setMonth(new Date().getMonth() + 1);
          setYear(new Date().getFullYear());
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button className="btn btn-primary">
          <Play size={14} />
          Payrun
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,94vw)] max-h-[90vh] overflow-y-auto rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold">
                {preview ? "Payrun preview (dry run)" : "Run payroll"}
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {preview
                  ? "Nothing has been saved yet. Review the simulation, then commit."
                  : "Generates a payslip for every active employee with a salary structure. Salaries are prorated by attendance — paid leaves count, unpaid leaves and absences don't."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {result ? (
            <div className="space-y-3">
              <div
                className="rounded-md p-4"
                style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}
              >
                <div className="font-medium text-[13px] flex items-center gap-2 mb-1">
                  <Check size={14} /> Payrun generated
                </div>
                <div className="text-[12px]">
                  {result.generated} payslip{result.generated === 1 ? "" : "s"}{" "}
                  ready. Click <strong>Validate</strong> on the Payrun tab to
                  mark them as Done.
                </div>
              </div>
              {result.skipped.length > 0 && (
                <div
                  className="rounded-md p-3 text-[12px]"
                  style={{ background: "rgba(234,179,8,0.10)", color: "#a16207" }}
                >
                  <div className="font-medium mb-1">Skipped:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.skipped.map((s) => (
                      <li key={s.name}>
                        {s.name} — {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button className="btn btn-primary">Done</button>
                </Dialog.Close>
              </div>
            </div>
          ) : preview ? (
            <PreviewPane
              preview={preview}
              error={error}
              pending={pending}
              onBack={() => {
                setPreview(null);
                setError(null);
              }}
              onCommit={() => submitRun(!!preview.existing)}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
                    Month
                  </span>
                  <select
                    value={month}
                    onChange={(e) => {
                      setMonth(Number(e.target.value));
                      reset();
                    }}
                    className="input mt-1 w-full"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleDateString("en-IN", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
                    Year
                  </span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(e) => {
                      setYear(Number(e.target.value));
                      reset();
                    }}
                    className="input mt-1 w-full"
                  />
                </label>
              </div>

              <p className="text-[12px]" style={{ color: "var(--fg-faint)" }}>
                Tip: <strong>Dry run</strong> simulates the cycle without
                writing anything — surfaces missing salary structures, zero-pay
                employees, and pre-existing payruns before you commit.
              </p>

              {error && (
                <div
                  className="rounded-md p-2 text-[12px] flex items-center gap-2"
                  style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
                >
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-secondary">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={submitDryRun}
                  disabled={pending}
                  className="btn btn-secondary"
                >
                  <FlaskConical size={14} />
                  {pending ? "Simulating…" : "Dry run"}
                </button>
                {confirmReplace ? (
                  <button
                    type="button"
                    onClick={() => submitRun(true)}
                    disabled={pending}
                    className="btn"
                    style={{ background: "#dc2626", color: "#fff" }}
                  >
                    {pending ? "Replacing…" : "Replace existing"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => submitRun(false)}
                    disabled={pending}
                    className="btn btn-primary"
                  >
                    {pending ? "Running…" : "Run payroll"}
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PreviewPane({
  preview,
  error,
  pending,
  onBack,
  onCommit,
}: {
  preview: Preview;
  error: string | null;
  pending: boolean;
  onBack: () => void;
  onCommit: () => void;
}) {
  const validated = preview.existing?.status === "PAID";
  const willReplace = !!preview.existing && !validated;

  return (
    <div className="space-y-4">
      <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
        Period: <strong>{preview.monthLabel} {preview.year}</strong> ·{" "}
        {preview.pending.length} payslip{preview.pending.length === 1 ? "" : "s"} to generate
        {preview.skipped.length > 0
          ? ` · ${preview.skipped.length} skipped`
          : ""}
      </div>

      {validated && (
        <div
          className="rounded-md p-3 text-[12px] flex items-start gap-2"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            A payrun for {preview.monthLabel} {preview.year} is already validated.
            Validated payruns cannot be replaced.
          </div>
        </div>
      )}

      {willReplace && (
        <div
          className="rounded-md p-3 text-[12px] flex items-start gap-2"
          style={{ background: "rgba(234,179,8,0.12)", color: "#a16207" }}
        >
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <div>
            A draft payrun for {preview.monthLabel} {preview.year} already exists.
            Committing will <strong>replace</strong> its payslips with these.
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Gross" value={fmtINR(preview.totals.gross)} />
        <Stat label="Deductions" value={fmtINR(preview.totals.deductions)} />
        <Stat label="Net" value={fmtINR(preview.totals.net)} primary />
        <Stat label="Employer cost" value={fmtINR(preview.totals.employerCost)} />
      </div>

      {/* Skipped (hard errors) */}
      {preview.skipped.length > 0 && (
        <div
          className="rounded-md p-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.06)", color: "#b91c1c" }}
        >
          <div className="font-medium mb-1 flex items-center gap-1.5">
            <AlertCircle size={14} /> Skipped ({preview.skipped.length})
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {preview.skipped.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong> — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings (soft) */}
      {preview.warnings.length > 0 && (
        <div
          className="rounded-md p-3 text-[12px]"
          style={{ background: "rgba(234,179,8,0.10)", color: "#a16207" }}
        >
          <div className="font-medium mb-1 flex items-center gap-1.5">
            <TriangleAlert size={14} /> Warnings ({preview.warnings.length})
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {preview.warnings.map((w) => (
              <li key={w.userId}>
                <strong>{w.name}</strong> — {w.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-employee preview table */}
      {preview.pending.length > 0 && (
        <div
          className="rounded-md border overflow-hidden"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <table className="w-full text-[12px]">
            <thead style={{ background: "var(--bg-soft)" }}>
              <tr>
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-right px-3 py-2 font-medium">Days</th>
                <th className="text-right px-3 py-2 font-medium">Gross</th>
                <th className="text-right px-3 py-2 font-medium">Deductions</th>
                <th className="text-right px-3 py-2 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {preview.pending.map((p) => (
                <tr
                  key={p.userId}
                  className="border-t"
                  style={{ borderColor: "var(--border-hairline)" }}
                >
                  <td className="px-3 py-1.5">{p.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {p.daysPayable}/{p.totalWorkingDays}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmtINR(p.grossEarned)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmtINR(p.totalDeductions)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                    {fmtINR(p.netPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div
          className="rounded-md p-2 text-[12px] flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex justify-between items-center pt-1">
        <button type="button" onClick={onBack} className="btn btn-ghost">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex gap-2">
          <Dialog.Close asChild>
            <button type="button" className="btn btn-secondary">
              Close
            </button>
          </Dialog.Close>
          <button
            type="button"
            onClick={onCommit}
            disabled={pending || preview.pending.length === 0 || validated}
            className={willReplace ? "btn" : "btn btn-primary"}
            style={
              willReplace
                ? { background: "#dc2626", color: "#fff" }
                : undefined
            }
          >
            {pending
              ? "Running…"
              : willReplace
              ? "Replace existing"
              : "Run payroll"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div
      className="rounded-md p-2.5"
      style={{
        background: "var(--bg-soft)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wide"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div
        className="text-[14px] font-medium tabular-nums"
        style={{ color: primary ? "var(--accent)" : "var(--fg)" }}
      >
        {value}
      </div>
    </div>
  );
}
