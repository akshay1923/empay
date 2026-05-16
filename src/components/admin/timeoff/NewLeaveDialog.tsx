"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, AlertCircle } from "lucide-react";
import { createLeaveOnBehalf } from "@/app/actions/admin-leave";
import type { EmployeeOption } from "./types";

type Form = {
  userId: string;
  leaveType: "CASUAL" | "SICK" | "EARNED" | "UNPAID";
  startDate: string;
  endDate: string;
  reason: string;
  autoApprove: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

const empty = (): Form => ({
  userId: "",
  leaveType: "CASUAL",
  startDate: today(),
  endDate: today(),
  reason: "",
  autoApprove: false,
});

export function NewLeaveDialog({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createLeaveOnBehalf({
        userId: form.userId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
        autoApprove: form.autoApprove,
      });
      if (!res.success) return setError(res.error);
      setForm(empty());
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setForm(empty());
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button className="btn btn-primary">
          <Plus size={14} />
          New
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,94vw)] rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold">
                New time off
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Create a time-off request on behalf of an employee. Leaves you
                create can be auto-approved.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Employee" required>
              <select
                required
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className="input w-full"
              >
                <option value="">Select an employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} {e.loginId ? `· ${e.loginId}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Leave type" required>
                <select
                  required
                  value={form.leaveType}
                  onChange={(e) =>
                    setForm({ ...form, leaveType: e.target.value as Form["leaveType"] })
                  }
                  className="input w-full"
                >
                  <option value="CASUAL">Casual</option>
                  <option value="SICK">Sick</option>
                  <option value="EARNED">Earned</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </Field>
              <Field label=" ">
                <label className="inline-flex items-center gap-2 mt-1.5 text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoApprove}
                    onChange={(e) =>
                      setForm({ ...form, autoApprove: e.target.checked })
                    }
                  />
                  Auto-approve
                </label>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" required>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="input w-full"
                />
              </Field>
              <Field label="End date" required>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                  className="input w-full"
                />
              </Field>
            </div>

            <Field label="Reason" required>
              <textarea
                required
                minLength={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                className="input w-full resize-y"
                style={{ height: "auto", minHeight: 80 }}
              />
            </Field>

            {error && (
              <div
                className="rounded-md p-2 text-[12px] inline-flex items-center gap-2"
                style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
              >
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary">
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" disabled={pending} className="btn btn-primary">
                {pending ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label === " " ? " " : label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
