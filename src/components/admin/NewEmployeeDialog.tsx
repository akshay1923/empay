"use client";

import { useRef, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/navigation";
import { Plus, Upload, X, Download, AlertCircle, Check, Mail, MailX } from "lucide-react";
import { createEmployee, importEmployeesCsv } from "@/app/actions/employees";
import { parseCsv } from "@/lib/csv";
import type { SalaryTemplateOption } from "./settings/types";

const CSV_TEMPLATE =
  "fullName,email,department,designation,joinDate,ctcAnnual,phone\nAnanya Mehra,ananya@example.com,Engineering,Software Engineer,2026-05-01,600000,9876543210\n";

const REQUIRED_COLS = [
  "fullName",
  "email",
  "department",
  "designation",
  "joinDate",
  "ctcAnnual",
] as const;

type ManualForm = {
  fullName: string;
  email: string;
  department: string;
  designation: string;
  joinDate: string;
  ctcAnnual: string;
  phone: string;
  salaryTemplateId: string;
};

const EMPTY: ManualForm = {
  fullName: "",
  email: "",
  department: "",
  designation: "",
  joinDate: new Date().toISOString().slice(0, 10),
  ctcAnnual: "",
  phone: "",
  salaryTemplateId: "",
};

type CreatedEmp = {
  loginId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
  emailError?: string;
};

// CSV bulk-import returns only the persisted record — the welcome email
// is queued in the background via next/server `after()`, so its delivery
// status isn't known at response time.
type BulkImportedEmp = {
  loginId: string;
  fullName: string;
  email: string;
  tempPassword: string;
};
type ImportResult =
  | { row: number; ok: true; employee: BulkImportedEmp }
  | { row: number; ok: false; error: string; input: Record<string, unknown> };

export function NewEmployeeDialog({
  salaryTemplates = [],
}: {
  salaryTemplates?: SalaryTemplateOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-primary">
          <Plus size={14} />
          New
        </button>
      </Dialog.Trigger>
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
                New employee
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Add a single employee or upload a CSV. Login ID and a temporary
                password are generated for each new account.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="manual">
            <Tabs.List
              className="flex gap-1 border-b mb-5"
              style={{ borderColor: "var(--border-hairline)" }}
            >
              <TabTrigger value="manual">Manual</TabTrigger>
              <TabTrigger value="csv">CSV upload</TabTrigger>
            </Tabs.List>

            <Tabs.Content value="manual">
              <ManualPanel
                salaryTemplates={salaryTemplates}
                onCreated={() => {
                  router.refresh();
                  setOpen(false);
                }}
              />
            </Tabs.Content>

            <Tabs.Content value="csv">
              <CsvPanel
                onCompleted={() => {
                  router.refresh();
                }}
              />
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-3 py-2 text-[13px] -mb-px border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--fg)] text-[var(--fg-muted)] outline-none"
    >
      {children}
    </Tabs.Trigger>
  );
}

function ManualPanel({
  salaryTemplates,
  onCreated,
}: {
  salaryTemplates: SalaryTemplateOption[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ManualForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    loginId: string;
    tempPassword: string;
    email: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  if (created) {
    return (
      <SuccessPanel
        loginId={created.loginId}
        tempPassword={created.tempPassword}
        email={created.email}
        emailSent={created.emailSent}
        emailError={created.emailError}
        onAddAnother={() => {
          setCreated(null);
          setForm(EMPTY);
        }}
        onClose={onCreated}
      />
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createEmployee({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        joinDate: form.joinDate,
        ctcAnnual: Number(form.ctcAnnual.replace(/[^\d]/g, "")),
        phone: form.phone.trim(),
        salaryTemplateId: form.salaryTemplateId || "",
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setCreated({
        loginId: res.employee.loginId,
        tempPassword: res.employee.tempPassword,
        email: res.employee.email,
        emailSent: res.employee.emailSent,
        emailError: res.employee.emailError,
      });
    });
  };

  return (
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
        <label className="block">
          <span className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
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
                ? "No structures defined — using defaults"
                : "Default (50/40 basic-HRA, ₹200 PT)"}
            </option>
            {salaryTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
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
          {pending ? "Creating…" : "Create employee"}
        </button>
      </div>
    </form>
  );
}

function CsvPanel({ onCompleted }: { onCompleted: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [emailsQueued, setEmailsQueued] = useState(0);
  const [pending, startTransition] = useTransition();

  const onFile = async (file: File) => {
    setParseError(null);
    setResults(null);
    const text = await file.text();
    const matrix = parseCsv(text);
    if (matrix.length < 2) {
      setParseError("CSV needs a header row plus at least one data row.");
      return;
    }
    const header = matrix[0].map((h) => h.trim());
    const missing = REQUIRED_COLS.filter((c) => !header.includes(c));
    if (missing.length) {
      setParseError(`Missing required columns: ${missing.join(", ")}`);
      return;
    }
    const parsed = matrix.slice(1).map((cols) => {
      const obj: Record<string, string> = {};
      header.forEach((h, idx) => {
        obj[h] = (cols[idx] ?? "").trim();
      });
      return obj;
    });
    setRows(parsed);
  };

  const onSubmit = () => {
    if (!rows.length) return;
    startTransition(async () => {
      const payload = rows.map((r) => ({
        fullName: r.fullName,
        email: r.email,
        department: r.department,
        designation: r.designation,
        joinDate: r.joinDate,
        ctcAnnual: Number((r.ctcAnnual || "").replace(/[^\d]/g, "")),
        phone: r.phone,
      }));
      const res = await importEmployeesCsv(payload);
      if (!res.success) {
        setParseError(res.error);
        return;
      }
      setResults(res.results);
      setEmailsQueued(res.emailsQueued ?? 0);
      onCompleted();
    });
  };

  if (results) {
    const ok = results.filter((r): r is Extract<ImportResult, { ok: true }> => r.ok);
    const failed = results.filter((r): r is Extract<ImportResult, { ok: false }> => !r.ok);
    return (
      <div className="space-y-3">
        <div className="text-[13px] flex flex-wrap gap-x-3">
          <span style={{ color: "#16a34a" }}>{ok.length} created</span>
          {failed.length > 0 && (
            <span style={{ color: "#dc2626" }}>{failed.length} failed</span>
          )}
        </div>
        {emailsQueued > 0 && (
          <div
            className="rounded-md p-2.5 text-[12px] flex items-center gap-2"
            style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
          >
            <Mail size={13} />
            <span>
              <strong>{emailsQueued}</strong> welcome email
              {emailsQueued === 1 ? "" : "s"} queued for delivery — sending in
              the background. Check the server logs if any fail to arrive.
            </span>
          </div>
        )}
        {ok.length > 0 && (
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <table className="w-full text-[12px]">
              <thead style={{ background: "var(--bg-soft)" }}>
                <tr>
                  <Th>Row</Th>
                  <Th>Login ID</Th>
                  <Th>Name</Th>
                  <Th>Temp password</Th>
                  <Th>Email</Th>
                </tr>
              </thead>
              <tbody>
                {ok.map((r) => (
                  <tr key={r.row} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <Td>{r.row}</Td>
                    <Td mono>{r.employee.loginId}</Td>
                    <Td>{r.employee.fullName}</Td>
                    <Td mono>{r.employee.tempPassword}</Td>
                    <Td>{r.employee.email}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {failed.length > 0 && (
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <table className="w-full text-[12px]">
              <thead style={{ background: "var(--bg-soft)" }}>
                <tr>
                  <Th>Row</Th>
                  <Th>Email</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {failed.map((r) => (
                  <tr key={r.row} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <Td>{r.row}</Td>
                    <Td>{(r.input.email as string) || "—"}</Td>
                    <Td>
                      <span style={{ color: "#dc2626" }}>{r.error}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Dialog.Close asChild>
            <button className="btn btn-primary">Done</button>
          </Dialog.Close>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-md border-2 border-dashed p-6 text-center"
        style={{ borderColor: "var(--border-hairline)" }}
      >
        <Upload size={20} className="mx-auto mb-2" style={{ color: "var(--fg-muted)" }} />
        <div className="text-[13px] mb-2">Choose a CSV file to upload</div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn btn-secondary"
        >
          Select file
        </button>
        <a
          href={"data:text/csv;charset=utf-8," + encodeURIComponent(CSV_TEMPLATE)}
          download="employees-template.csv"
          className="btn btn-ghost ml-2 text-[12px]"
        >
          <Download size={14} /> Template
        </a>
      </div>

      {parseError && (
        <div
          className="flex items-center gap-2 text-[12px] p-2 rounded-md"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
            <Check size={14} className="inline mr-1" style={{ color: "#16a34a" }} />
            {rows.length} row{rows.length === 1 ? "" : "s"} ready to import.
          </div>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="btn btn-secondary">
                Cancel
              </button>
            </Dialog.Close>
            <button onClick={onSubmit} disabled={pending} className="btn btn-primary">
              {pending ? "Importing…" : `Import ${rows.length}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SuccessPanel({
  loginId,
  tempPassword,
  email,
  emailSent,
  emailError,
  onAddAnother,
  onClose,
}: {
  loginId: string;
  tempPassword: string;
  email: string;
  emailSent: boolean;
  emailError?: string;
  onAddAnother: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-md p-4"
        style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium mb-2">
          <Check size={14} /> Employee created
        </div>
        <div className="text-[12px]">
          {emailSent
            ? `Credentials emailed to ${email}. The employee will be required to change the password on first sign-in.`
            : "Share these credentials manually — automatic email failed (see below)."}
        </div>
      </div>
      <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
        <dt style={{ color: "var(--fg-muted)" }}>Login ID</dt>
        <dd className="font-mono">{loginId}</dd>
        <dt style={{ color: "var(--fg-muted)" }}>Temporary password</dt>
        <dd className="font-mono">{tempPassword}</dd>
        <dt style={{ color: "var(--fg-muted)" }}>Email</dt>
        <dd className="flex items-center gap-1.5">
          {emailSent ? (
            <>
              <Mail size={14} style={{ color: "#16a34a" }} />
              <span style={{ color: "#15803d" }}>Sent to {email}</span>
            </>
          ) : (
            <>
              <MailX size={14} style={{ color: "#dc2626" }} />
              <span style={{ color: "#dc2626" }}>
                Not sent{emailError ? ` — ${emailError}` : ""}
              </span>
            </>
          )}
        </dd>
      </dl>
      <div className="flex justify-end gap-2">
        <button onClick={onAddAnother} className="btn btn-secondary">
          Add another
        </button>
        <button onClick={onClose} className="btn btn-primary">
          Done
        </button>
      </div>
    </div>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left px-3 py-2 text-[11px] font-medium"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2 ${mono ? "font-mono" : ""}`}>{children}</td>;
}
