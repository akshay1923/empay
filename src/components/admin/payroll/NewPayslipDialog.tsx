"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { FileText, X, AlertCircle } from "lucide-react";
import { createPayslip } from "@/app/actions/admin-payroll";
import type { EmployeeOption } from "./types";

export function NewPayslipDialog({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [userId, setUserId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setUserId("");
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setError(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createPayslip({ userId, month, year });
      if (!res.success) return setError(res.error);
      setOpen(false);
      reset();
      router.push(`/payslips/${res.payslipId}`);
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="btn btn-secondary">
          <FileText size={14} />
          New payslip
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,94vw)] rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold">
                New payslip
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Create a single-employee payslip. The payrun for the chosen
                month is created automatically if it doesn&apos;t exist yet.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
                Employee <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <select
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input mt-1 w-full"
              >
                <option value="">Select an employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                    {e.loginId ? ` · ${e.loginId}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
                  Month <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <select
                  required
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
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
                  Year <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="input mt-1 w-full"
                />
              </label>
            </div>

            <div
              className="rounded-md p-3 text-[12px]"
              style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
            >
              The payslip is computed live from the employee&apos;s active
              salary structure and their attendance + approved leaves for the
              chosen month. Paid leaves count toward payable days; unpaid
              leaves and absences don&apos;t.
            </div>

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
                type="submit"
                disabled={pending || !userId}
                className="btn btn-primary"
              >
                {pending ? "Creating…" : "Create payslip"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
