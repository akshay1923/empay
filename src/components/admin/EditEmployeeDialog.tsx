"use client";

import { useEffect, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { X, AlertCircle } from "lucide-react";
import { updateEmployee } from "@/app/actions/employees";
import type { EmployeeListItem } from "./types";
import type { SalaryTemplateOption } from "./settings/types";

type Form = {
  fullName: string;
  email: string;
  department: string;
  designation: string;
  joinDate: string;
  ctcAnnual: string; // ₹/year
  phone: string;
  salaryTemplateId: string;
};

function fromEmployee(e: EmployeeListItem): Form {
  return {
    fullName: e.fullName,
    email: e.email,
    department: e.department ?? "",
    designation: e.designation ?? "",
    joinDate: e.joinDate ? e.joinDate.slice(0, 10) : "",
    ctcAnnual: e.ctcAnnual !== null ? Math.round(e.ctcAnnual / 100).toString() : "",
    phone: e.phone ?? "",
    salaryTemplateId: "",
  };
}

export function EditEmployeeDialog({
  employee,
  salaryTemplates = [],
  open,
  onOpenChange,
}: {
  employee: EmployeeListItem | null;
  salaryTemplates?: SalaryTemplateOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() =>
    employee ? fromEmployee(employee) : ({} as Form)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (employee) setForm(fromEmployee(employee));
  }, [employee]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setError(null);
    startTransition(async () => {
      const res = await updateEmployee({
        userId: employee.id,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        joinDate: form.joinDate,
        ctcAnnual: Math.round(Number(form.ctcAnnual.replace(/[^\d]/g, ""))) * 100,
        phone: form.phone.trim(),
        salaryTemplateId: form.salaryTemplateId || "",
      });
      if (!res.success) return setError(res.error);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(640px,94vw)] max-h-[90vh] overflow-y-auto rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold">
                Edit employee
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {employee?.loginId ? (
                  <>
                    Login ID: <span className="font-mono">{employee.loginId}</span>
                  </>
                ) : (
                  "Update the employee's profile and salary."
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {employee && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Full name"
                  value={form.fullName}
                  onChange={(v) => setForm({ ...form, fullName: v })}
                  required
                />
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  required
                />
                <Field
                  label="Department"
                  value={form.department}
                  onChange={(v) => setForm({ ...form, department: v })}
                  required
                />
                <Field
                  label="Designation"
                  value={form.designation}
                  onChange={(v) => setForm({ ...form, designation: v })}
                  required
                />
                <Field
                  label="Join date"
                  type="date"
                  value={form.joinDate}
                  onChange={(v) => setForm({ ...form, joinDate: v })}
                  required
                />
                <Field
                  label="CTC (annual ₹)"
                  type="number"
                  value={form.ctcAnnual}
                  onChange={(v) => setForm({ ...form, ctcAnnual: v })}
                  required
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
                <label className="block col-span-2">
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Salary structure
                  </span>
                  <select
                    value={form.salaryTemplateId}
                    onChange={(e) =>
                      setForm({ ...form, salaryTemplateId: e.target.value })
                    }
                    className="input mt-1 w-full"
                    disabled={salaryTemplates.length === 0}
                  >
                    <option value="">
                      {salaryTemplates.length === 0
                        ? "No structures defined — keep current"
                        : "Keep current structure"}
                    </option>
                    {salaryTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        Apply: {t.name}
                      </option>
                    ))}
                  </select>
                  {form.salaryTemplateId && (
                    <span
                      className="text-[11px] mt-1 inline-block"
                      style={{ color: "#a16207" }}
                    >
                      Heads up: this overwrites the employee&apos;s current
                      salary breakdown with the selected structure&apos;s
                      percentages and rules. Their CTC stays as entered above.
                    </span>
                  )}
                </label>
              </div>
              {error && (
                <div
                  className="flex items-center gap-2 text-[12px] p-2 rounded-md"
                  style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
                >
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-secondary">
                    Cancel
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={pending} className="btn btn-primary">
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1 w-full"
      />
    </label>
  );
}
