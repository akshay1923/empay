"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { FileText, ArrowRight, Search, Check } from "lucide-react";

type EmployeeOption = {
  id: string;
  fullName: string;
  loginId: string | null;
};

const MAX_VISIBLE = 6;

export function SalaryStatementForm({
  employees,
}: {
  employees: EmployeeOption[];
}) {
  const currentYear = new Date().getFullYear();
  const [selected, setSelected] = useState<EmployeeOption | null>(null);
  const [year, setYear] = useState(currentYear);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const url = `/reports/salary-statement/print?userId=${encodeURIComponent(
      selected.id
    )}&year=${year}`;
    window.open(url, "_blank");
  };

  const years = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  return (
    <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="text-[12px] uppercase tracking-wide pb-2 mb-4 flex items-center gap-2"
        style={{
          color: "var(--fg-muted)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <FileText size={14} />
        Salary statement report
      </div>

      <p className="text-[13px] mb-4" style={{ color: "var(--fg-muted)" }}>
        Pick an employee and a year to generate a printable statement of
        their salary structure — monthly and yearly breakdown of every
        component.
      </p>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end"
      >
        <label className="block">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--fg-faint)" }}
          >
            Employee <span style={{ color: "#dc2626" }}>*</span>
          </span>
          <EmployeeCombobox
            employees={employees}
            value={selected}
            onChange={setSelected}
          />
        </label>

        <label className="block">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: "var(--fg-faint)" }}
          >
            Year <span style={{ color: "#dc2626" }}>*</span>
          </span>
          <select
            required
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input mt-1 w-full"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={!selected} className="btn btn-primary">
          Generate report
          <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
}

/**
 * Typeahead employee picker. Renders at most MAX_VISIBLE matches at a
 * time, so a 1000-row directory stays snappy. Matching is case-insensitive
 * across full name + login ID.
 */
function EmployeeCombobox({
  employees,
  value,
  onChange,
}: {
  employees: EmployeeOption[];
  value: EmployeeOption | null;
  onChange: (e: EmployeeOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return employees.slice(0, MAX_VISIBLE);
    }
    const out: EmployeeOption[] = [];
    for (const e of employees) {
      const haystack = `${e.fullName} ${e.loginId ?? ""}`.toLowerCase();
      if (haystack.includes(q)) {
        out.push(e);
        if (out.length >= MAX_VISIBLE) break;
      }
    }
    return out;
  }, [employees, query]);

  const totalMatchCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees.length;
    let n = 0;
    for (const e of employees) {
      const haystack = `${e.fullName} ${e.loginId ?? ""}`.toLowerCase();
      if (haystack.includes(q)) n++;
    }
    return n;
  }, [employees, query]);

  // Close on outside click. We listen on mousedown so the dropdown closes
  // before any other click handler gets the event.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const select = (e: EmployeeOption) => {
    onChange(e);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[highlight]) {
        e.preventDefault();
        select(matches[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // When the value is set externally and matches what's typed, hide the
  // dropdown. Reset highlight every time matches change.
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const displayValue = value
    ? `${value.fullName}${value.loginId ? ` · ${value.loginId}` : ""}`
    : "";

  return (
    <div ref={containerRef} className="relative mt-1">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--fg-faint)" }}
        />
        <input
          ref={inputRef}
          type="text"
          // Switch placeholder to the chosen value when set, but keep the
          // input editable so the user can search again.
          placeholder={value ? displayValue : "Type a name or login ID…"}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // If the user starts typing again, treat any prior selection
            // as cleared until they pick from the new list.
            if (value) onChange(null);
          }}
          onKeyDown={onKeyDown}
          className="input w-full pl-8 pr-8"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="employee-combobox-list"
        />
        {value && !query && (
          <Check
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "#16a34a" }}
            aria-label="Employee selected"
          />
        )}
      </div>

      {open && (
        <div
          id="employee-combobox-list"
          role="listbox"
          className="absolute left-0 right-0 mt-1 rounded-md border z-30 max-h-[280px] overflow-auto"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-2)",
          }}
        >
          {matches.length === 0 ? (
            <div
              className="px-3 py-2.5 text-[12px]"
              style={{ color: "var(--fg-muted)" }}
            >
              No employees match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {matches.map((e, i) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  key={e.id}
                  onClick={() => select(e)}
                  onMouseEnter={() => setHighlight(i)}
                  className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-2"
                  style={{
                    background:
                      i === highlight ? "var(--bg-soft)" : "transparent",
                  }}
                >
                  <span className="flex-1 truncate">{e.fullName}</span>
                  {e.loginId && (
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: "var(--fg-faint)" }}
                    >
                      {e.loginId}
                    </span>
                  )}
                </button>
              ))}
              {totalMatchCount > MAX_VISIBLE && (
                <div
                  className="px-3 py-1.5 text-[11px] border-t"
                  style={{
                    color: "var(--fg-faint)",
                    borderColor: "var(--border-hairline)",
                    background: "var(--bg-soft)",
                  }}
                >
                  Showing {matches.length} of {totalMatchCount}
                  {query.trim() ? " matches" : " employees"} — keep typing to
                  narrow.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
