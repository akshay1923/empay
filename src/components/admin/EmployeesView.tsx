"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { EmployeeCard } from "./EmployeeCard";
import { EmployeeDetailDialog } from "./EmployeeDetailDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { NewEmployeeDialog } from "./NewEmployeeDialog";
import type { EmployeeListItem } from "./types";
import type { SalaryTemplateOption } from "./settings/types";

export function EmployeesView({
  employees,
  canDelete = true,
  salaryTemplates = [],
}: {
  employees: EmployeeListItem[];
  canDelete?: boolean;
  salaryTemplates?: SalaryTemplateOption[];
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<EmployeeListItem | null>(null);
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.loginId ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, debounced]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-eyebrow mb-1">Employee</div>
          <h1 className="h-display-m">Employees</h1>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative flex-1 max-w-[420px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--fg-faint)" }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees…"
              className="input w-full pl-9 pr-14"
            />
            <kbd
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border font-mono"
              style={{
                color: "var(--fg-faint)",
                borderColor: "var(--border-hairline)",
                background: "var(--bg-soft)",
              }}
            >
              ⌘K
            </kbd>
          </div>
          <NewEmployeeDialog salaryTemplates={salaryTemplates} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="card p-10 text-center"
          style={{ color: "var(--fg-muted)" }}
        >
          {employees.length === 0
            ? "No employees yet. Click New to add the first one."
            : "No employees match your search."}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onClick={() => setSelected(emp)}
            />
          ))}
        </div>
      )}

      <EmployeeDetailDialog
        employee={selected}
        canDelete={canDelete}
        onClose={() => setSelected(null)}
        onEdit={(e) => {
          setSelected(null);
          setEditing(e);
        }}
      />

      <EditEmployeeDialog
        employee={editing}
        salaryTemplates={salaryTemplates}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}
