"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Plus, X, AlertCircle, Pencil } from "lucide-react";
import { LeaveType } from "@prisma/client";
import { upsertLeaveAllocation } from "@/app/actions/admin-leave";
import type { AllocationRow, EmployeeOption } from "./types";

const TYPE_LABEL: Record<LeaveType, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  UNPAID: "Unpaid",
};

export function AllocationTab({
  allocations,
  employees,
  year,
  basePath = "/admin/timeoff",
}: {
  allocations: AllocationRow[];
  employees: EmployeeOption[];
  year: number;
  basePath?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allocations;
    return allocations.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        (a.loginId ?? "").toLowerCase().includes(q) ||
        a.leaveType.toLowerCase().includes(q)
    );
  }, [allocations, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <AllocationDialog employees={employees} year={year} />
        <div className="relative flex-1 max-w-[420px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--fg-faint)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by employee or leave type…"
            className="input w-full pl-9"
          />
        </div>
        <YearPicker year={year} basePath={basePath} />
      </div>

      {filtered.length === 0 ? (
        <div
          className="card p-10 text-center"
          style={{ color: "var(--fg-muted)" }}
        >
          {allocations.length === 0
            ? `No allocations for ${year} yet. Click New to create one.`
            : "No allocations match your search."}
        </div>
      ) : (
        <div
          className="card overflow-x-auto"
          style={{ boxShadow: "var(--shadow-1)" }}
        >
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-soft)" }}>
                <Th className="text-left">Employee</Th>
                <Th className="text-left">Leave type</Th>
                <Th className="text-left">Year</Th>
                <Th className="text-right">Allocated</Th>
                <Th className="text-right">Used</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right pr-4">{" "}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <Row
                  key={a.id}
                  alloc={a}
                  employees={employees}
                  onSaved={() => router.refresh()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function YearPicker({ year, basePath }: { year: number; basePath: string }) {
  const router = useRouter();
  const setYear = (y: string) => {
    const url = y === String(new Date().getFullYear()) ? "" : `?year=${y}`;
    router.push(`${basePath}?tab=allocation${url ? "&" + url.slice(1) : ""}`);
  };
  return (
    <select
      value={year}
      onChange={(e) => setYear(e.target.value)}
      className="input h-9 w-[120px]"
    >
      {[year - 1, year, year + 1].map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

function Row({
  alloc,
  employees,
  onSaved,
}: {
  alloc: AllocationRow;
  employees: EmployeeOption[];
  onSaved: () => void;
}) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
      <td className="py-2.5 pl-3 pr-3">
        <div className="text-[13px] font-medium">{alloc.fullName}</div>
        <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {alloc.loginId ? <span className="font-mono">{alloc.loginId}</span> : "—"}
        </div>
      </td>
      <td className="px-3 py-2.5">{TYPE_LABEL[alloc.leaveType]}</td>
      <td className="px-3 py-2.5 tabular-nums">{alloc.year}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{alloc.totalDays}</td>
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--fg-muted)" }}>
        {trimNum(alloc.usedDays)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
        {trimNum(alloc.availableDays)}
      </td>
      <td className="px-3 py-2.5 text-right pr-4">
        <AllocationDialog
          employees={employees}
          year={alloc.year}
          edit={alloc}
          trigger={
            <button
              type="button"
              className="btn btn-ghost p-1.5"
              aria-label="Edit allocation"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          }
          onSaved={onSaved}
        />
      </td>
    </tr>
  );
}

function AllocationDialog({
  employees,
  year,
  edit,
  trigger,
  onSaved,
}: {
  employees: EmployeeOption[];
  year: number;
  edit?: AllocationRow;
  trigger?: React.ReactNode;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    userId: edit?.userId ?? "",
    leaveType: (edit?.leaveType ?? "CASUAL") as LeaveType,
    totalDays: String(edit?.totalDays ?? 12),
    year: edit?.year ?? year,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertLeaveAllocation({
        userId: form.userId,
        leaveType: form.leaveType,
        totalDays: Number(form.totalDays),
        year: Number(form.year),
      });
      if (!res.success) return setError(res.error);
      setOpen(false);
      onSaved ? onSaved() : router.refresh();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button className="btn btn-primary">
            <Plus size={14} />
            New
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(480px,94vw)] rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold">
                {edit ? "Edit allocation" : "New allocation"}
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Allocate a number of days for a leave type and year. Re-saving
                the same employee + type + year overwrites the allocation.
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
                value={form.userId}
                disabled={!!edit}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className="input w-full mt-1"
              >
                <option value="">Select an employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} {e.loginId ? `· ${e.loginId}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
                  Leave type
                </span>
                <select
                  required
                  disabled={!!edit}
                  value={form.leaveType}
                  onChange={(e) =>
                    setForm({ ...form, leaveType: e.target.value as LeaveType })
                  }
                  className="input w-full mt-1"
                >
                  <option value="CASUAL">Casual</option>
                  <option value="SICK">Sick</option>
                  <option value="EARNED">Earned</option>
                  <option value="UNPAID">Unpaid</option>
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
                  disabled={!!edit}
                  value={form.year}
                  onChange={(e) =>
                    setForm({ ...form, year: Number(e.target.value) })
                  }
                  className="input w-full mt-1"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
                  Total days <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.5"
                  value={form.totalDays}
                  onChange={(e) =>
                    setForm({ ...form, totalDays: e.target.value })
                  }
                  className="input w-full mt-1"
                />
              </label>
            </div>

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
                {pending ? "Saving…" : edit ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      }}
    >
      {children}
    </th>
  );
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
