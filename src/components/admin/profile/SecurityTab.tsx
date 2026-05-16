"use client";

import { useState, useTransition } from "react";
import { Check, AlertCircle, Mail, MailX, RefreshCw, KeyRound } from "lucide-react";
import { changePassword } from "@/app/actions/auth";
import { resetEmployeePassword } from "@/app/actions/admin-reset-password";

export type SecurityTabProps = {
  loginId: string | null;
  email: string;
  employees: { id: string; loginId: string | null; fullName: string; email: string }[];
};

export function SecurityTab({ loginId, email, employees }: SecurityTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
      <ChangeMyPassword loginId={loginId} email={email} />
      <ResetOtherUserPanel employees={employees} />
    </div>
  );
}

function ChangeMyPassword({ loginId, email }: { loginId: string | null; email: string }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await changePassword(form);
      if (!res.success) return setError(res.error);
      setSaved(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    });
  };

  return (
    <section className="space-y-4">
      <SectionTitle icon={<KeyRound size={14} />}>Change my password</SectionTitle>
      <ReadOnlyRow label="Login ID" value={loginId ?? email} mono={!!loginId} />
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField
          label="Current password"
          value={form.currentPassword}
          onChange={(v) => setForm({ ...form, currentPassword: v })}
          required
        />
        <PasswordField
          label="New password"
          value={form.newPassword}
          onChange={(v) => setForm({ ...form, newPassword: v })}
          required
          hint="At least 6 characters."
        />
        <PasswordField
          label="Confirm new password"
          value={form.confirmPassword}
          onChange={(v) => setForm({ ...form, confirmPassword: v })}
          required
        />
        <div
          className="pt-3 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border-hairline)" }}
        >
          <div className="text-[12px] min-h-[18px]">
            {error && (
              <span className="inline-flex items-center gap-1.5" style={{ color: "#dc2626" }}>
                <AlertCircle size={13} /> {error}
              </span>
            )}
            {saved && !error && (
              <span className="inline-flex items-center gap-1.5" style={{ color: "#15803d" }}>
                <Check size={13} /> Password updated
              </span>
            )}
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ResetOtherUserPanel({
  employees,
}: {
  employees: { id: string; loginId: string | null; fullName: string; email: string }[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    fullName: string;
    email: string;
    tempPassword: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onReset = () => {
    if (!selectedId) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await resetEmployeePassword({ userId: selectedId });
      if (!res.success) return setError(res.error);
      const emp = employees.find((e) => e.id === selectedId);
      setResult({
        fullName: emp?.fullName ?? "",
        email: emp?.email ?? "",
        tempPassword: res.tempPassword,
        emailSent: res.emailSent,
        emailError: res.emailError,
      });
    });
  };

  return (
    <section className="space-y-4">
      <SectionTitle icon={<RefreshCw size={14} />}>Reset another user&apos;s password</SectionTitle>
      <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
        Generate a new temporary password for an employee and email their credentials. They&apos;ll
        be required to set a new password on first sign-in.
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
            Employee
          </span>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="mt-1 w-full bg-transparent outline-none text-[14px] py-1"
            style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-hairline)" }}
          >
            <option value="">Select an employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} {e.loginId ? `· ${e.loginId}` : ""} · {e.email}
              </option>
            ))}
          </select>
        </label>
        <div
          className="pt-3 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border-hairline)" }}
        >
          <div className="text-[12px] min-h-[18px]">
            {error && (
              <span className="inline-flex items-center gap-1.5" style={{ color: "#dc2626" }}>
                <AlertCircle size={13} /> {error}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={pending || !selectedId}
            className="btn btn-primary"
          >
            {pending ? "Resetting…" : "Reset & email"}
          </button>
        </div>
      </div>

      {result && (
        <div
          className="rounded-md p-4 text-[12px] mt-2"
          style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}
        >
          <div className="font-medium mb-2">
            New temporary password for {result.fullName}
          </div>
          <div className="font-mono text-[13px] mb-2">{result.tempPassword}</div>
          <div className="flex items-center gap-1.5">
            {result.emailSent ? (
              <>
                <Mail size={13} /> Sent to {result.email}
              </>
            ) : (
              <span style={{ color: "#dc2626" }} className="inline-flex items-center gap-1.5">
                <MailX size={13} />
                Not sent — {result.emailError ?? "share manually"}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 text-[12px] uppercase tracking-wide pb-1.5"
      style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border-hairline)" }}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

function ReadOnlyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
      </div>
      <div
        className={`mt-1 text-[14px] py-1 ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--fg-muted)", borderBottom: "1px dashed var(--border-hairline)" }}
      >
        {value}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="new-password"
        className="mt-1 w-full bg-transparent outline-none text-[14px] py-1"
        style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-hairline)" }}
      />
      {hint && (
        <span className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
