"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, AlertCircle, Wallet } from "lucide-react";
import { deleteSalaryTemplate } from "@/app/actions/admin-salary-templates";
import { SalaryTemplateDialog } from "./SalaryTemplateDialog";
import type { SalaryTemplateRow } from "./types";

export function SalaryTemplatesPanel({
  templates,
}: {
  templates: SalaryTemplateRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SalaryTemplateRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = (t: SalaryTemplateRow) => {
    if (
      !window.confirm(
        `Delete the "${t.name}" salary structure? Employees already on this structure keep their snapshot — only future hires are affected.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteSalaryTemplate(t.id);
      if (!res.success) return setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="text-[12px] uppercase tracking-wide pb-2 mb-4 flex items-center justify-between gap-2"
        style={{
          color: "var(--fg-muted)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <span className="flex items-center gap-2">
          <Wallet size={14} />
          Salary structures
        </span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn btn-primary"
        >
          <Plus size={14} />
          New structure
        </button>
      </div>

      <p className="text-[13px] mb-4" style={{ color: "var(--fg-muted)" }}>
        Reusable presets for new hires — define the split between basic, HRA,
        and allowances along with PF and professional-tax rules. Pick a
        structure when creating an employee; CTC stays per-employee.
      </p>

      {error && (
        <div
          className="rounded-md p-3 text-[12px] inline-flex items-center gap-2 mb-3"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {templates.length === 0 ? (
        <div
          className="rounded-md p-8 text-center text-[13px]"
          style={{
            color: "var(--fg-muted)",
            background: "var(--bg-soft)",
          }}
        >
          No salary structures yet. Click <strong>New structure</strong> to
          create your first preset.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-soft)" }}>
                <Th>Name</Th>
                <Th className="text-right">Basic</Th>
                <Th className="text-right">HRA (of basic)</Th>
                <Th className="text-right">Allowances</Th>
                <Th className="text-right">PF (emp)</Th>
                <Th className="text-right">PT (₹/mo)</Th>
                <Th className="text-right">Days/wk</Th>
                <Th className="text-right pr-3">{" "}</Th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const allowances =
                  t.standardAllowancePercent +
                  t.performanceBonusPercent +
                  t.ltaPercent;
                return (
                  <tr
                    key={t.id}
                    className="border-t"
                    style={{ borderColor: "var(--border-hairline)" }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{t.name}</div>
                      {t.description && (
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--fg-faint)" }}
                        >
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {fmtPct(t.basicPercent)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {fmtPct(t.hraPercent)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {fmtPct(allowances)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {fmtPct(t.pfEmployeePercent)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      ₹{(t.professionalTax / 100).toFixed(0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {t.workingDaysPerWeek}
                    </td>
                    <td className="px-3 py-2.5 text-right pr-3">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          className="btn btn-ghost p-1.5"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(t)}
                          disabled={pending}
                          className="btn btn-ghost p-1.5"
                          style={{ color: "#dc2626" }}
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SalaryTemplateDialog
        open={creating}
        template={null}
        onOpenChange={(o) => {
          if (!o) setCreating(false);
        }}
      />
      <SalaryTemplateDialog
        open={!!editing}
        template={editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`text-[11px] font-medium px-3 py-2 ${className}`}
      style={{
        color: "var(--fg-muted)",
        borderBottom: "1px solid var(--border-hairline)",
        textAlign: className.includes("text-right") ? "right" : "left",
      }}
    >
      {children}
    </th>
  );
}

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(2).replace(/\.00$/, "")}%`;
}
