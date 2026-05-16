"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle } from "lucide-react";
import {
  createSalaryTemplate,
  updateSalaryTemplate,
} from "@/app/actions/admin-salary-templates";
import type { SalaryTemplateRow } from "./types";

type FormState = {
  name: string;
  description: string;
  basicPercent: string;
  hraPercent: string;
  standardAllowancePercent: string;
  performanceBonusPercent: string;
  ltaPercent: string;
  pfEmployeePercent: string;
  pfEmployerPercent: string;
  professionalTax: string;
  workingDaysPerWeek: string;
  breakTimeHours: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  basicPercent: "50",
  hraPercent: "50",
  standardAllowancePercent: "16.67",
  performanceBonusPercent: "8.33",
  ltaPercent: "8.33",
  pfEmployeePercent: "12",
  pfEmployerPercent: "12",
  professionalTax: "200",
  workingDaysPerWeek: "6",
  breakTimeHours: "1",
};

function rowToForm(t: SalaryTemplateRow): FormState {
  return {
    name: t.name,
    description: t.description ?? "",
    basicPercent: pctToInput(t.basicPercent),
    hraPercent: pctToInput(t.hraPercent),
    standardAllowancePercent: pctToInput(t.standardAllowancePercent),
    performanceBonusPercent: pctToInput(t.performanceBonusPercent),
    ltaPercent: pctToInput(t.ltaPercent),
    pfEmployeePercent: pctToInput(t.pfEmployeePercent),
    pfEmployerPercent: pctToInput(t.pfEmployerPercent),
    professionalTax: (t.professionalTax / 100).toFixed(0),
    workingDaysPerWeek: t.workingDaysPerWeek.toString(),
    breakTimeHours: t.breakTimeHours.toString(),
  };
}

function pctToInput(p: number): string {
  return (p * 100).toFixed(2).replace(/\.00$/, "");
}

export function SalaryTemplateDialog({
  open,
  template,
  onOpenChange,
}: {
  open: boolean;
  template: SalaryTemplateRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(template ? rowToForm(template) : DEFAULT_FORM);
      setError(null);
    }
  }, [open, template]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      basicPercent: pct(form.basicPercent),
      hraPercent: pct(form.hraPercent),
      standardAllowancePercent: pct(form.standardAllowancePercent),
      performanceBonusPercent: pct(form.performanceBonusPercent),
      ltaPercent: pct(form.ltaPercent),
      pfEmployeePercent: pct(form.pfEmployeePercent),
      pfEmployerPercent: pct(form.pfEmployerPercent),
      professionalTax: rupeesToPaise(form.professionalTax),
      workingDaysPerWeek: Number(form.workingDaysPerWeek),
      breakTimeHours: Number(form.breakTimeHours),
    };
    startTransition(async () => {
      const res = template
        ? await updateSalaryTemplate({ ...payload, id: template.id })
        : await createSalaryTemplate(payload);
      if (!res.success) return setError(res.error);
      router.refresh();
      onOpenChange(false);
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                {template ? "Edit salary structure" : "New salary structure"}
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Reusable preset applied to a new employee at the time of
                creation. Existing employees aren&apos;t affected by edits.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
                placeholder="e.g. Standard, Senior, Intern"
              />
              <Field
                label="Description"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="optional"
              />
            </div>

            <SectionLabel>Earnings split</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <PercentField
                label="Basic (% of monthly wage)"
                value={form.basicPercent}
                onChange={(v) => setForm({ ...form, basicPercent: v })}
              />
              <PercentField
                label="HRA (% of basic)"
                value={form.hraPercent}
                onChange={(v) => setForm({ ...form, hraPercent: v })}
              />
              <PercentField
                label="Standard allowance (% of wage)"
                value={form.standardAllowancePercent}
                onChange={(v) =>
                  setForm({ ...form, standardAllowancePercent: v })
                }
              />
              <PercentField
                label="Performance bonus (% of wage)"
                value={form.performanceBonusPercent}
                onChange={(v) =>
                  setForm({ ...form, performanceBonusPercent: v })
                }
              />
              <PercentField
                label="LTA (% of wage)"
                value={form.ltaPercent}
                onChange={(v) => setForm({ ...form, ltaPercent: v })}
              />
            </div>

            <SectionLabel>Deductions &amp; rules</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <PercentField
                label="PF — employee (% of basic)"
                value={form.pfEmployeePercent}
                onChange={(v) => setForm({ ...form, pfEmployeePercent: v })}
              />
              <PercentField
                label="PF — employer (% of basic)"
                value={form.pfEmployerPercent}
                onChange={(v) => setForm({ ...form, pfEmployerPercent: v })}
              />
              <Field
                label="Professional tax (₹/month)"
                type="number"
                value={form.professionalTax}
                onChange={(v) => setForm({ ...form, professionalTax: v })}
                required
              />
              <Field
                label="Working days / week"
                type="number"
                value={form.workingDaysPerWeek}
                onChange={(v) =>
                  setForm({ ...form, workingDaysPerWeek: v })
                }
                required
              />
              <Field
                label="Break time / day (hours)"
                type="number"
                value={form.breakTimeHours}
                onChange={(v) => setForm({ ...form, breakTimeHours: v })}
                required
              />
            </div>

            {error && (
              <div
                className="rounded-md p-2 text-[12px] flex items-center gap-2"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  color: "#dc2626",
                }}
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
                {pending
                  ? template
                    ? "Saving…"
                    : "Creating…"
                  : template
                  ? "Save changes"
                  : "Create structure"}
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
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1 w-full"
      />
    </label>
  );
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
        {label} <span style={{ color: "#dc2626" }}>*</span>
      </span>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input mt-1 w-full pr-8"
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]"
          style={{ color: "var(--fg-faint)" }}
        >
          %
        </span>
      </div>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] uppercase tracking-wide pt-2"
      style={{ color: "var(--fg-faint)" }}
    >
      {children}
    </div>
  );
}

function pct(input: string): number {
  const n = Number(input);
  if (Number.isNaN(n)) return 0;
  return n / 100;
}

function rupeesToPaise(input: string): number {
  const n = Number(input);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
