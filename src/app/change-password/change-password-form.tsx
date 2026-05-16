"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { AlertCircle, Check, KeyRound } from "lucide-react";
import { changePassword } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.newPassword.length < 6) {
      return setError("New password must be at least 6 characters.");
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError("New passwords don't match.");
    }
    startTransition(async () => {
      const res = await changePassword(form);
      if (!res.success) return setError(res.error);
      setSuccess(true);
      // Sign out so the JWT re-issues with mustChangePassword=false on next sign-in.
      await signOut({ callbackUrl: "/login?changed=1" });
    });
  };

  if (success) {
    return (
      <div
        className="rounded-md p-4 text-[13px]"
        style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}
      >
        <div className="inline-flex items-center gap-2 font-medium">
          <Check size={14} /> Password updated. Redirecting…
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Current password"
        value={form.currentPassword}
        onChange={(v) => setForm({ ...form, currentPassword: v })}
        autoComplete="current-password"
        required
        hint="The temporary password from your welcome email."
      />
      <Field
        label="New password"
        value={form.newPassword}
        onChange={(v) => setForm({ ...form, newPassword: v })}
        autoComplete="new-password"
        required
        hint="At least 6 characters."
      />
      <Field
        label="Confirm new password"
        value={form.confirmPassword}
        onChange={(v) => setForm({ ...form, confirmPassword: v })}
        autoComplete="new-password"
        required
      />

      {error && (
        <div
          className="rounded-md p-2 text-[12px] flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block btn-lg"
      >
        <KeyRound size={14} />
        {pending ? "Updating…" : "Update password"}
      </button>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="btn btn-ghost btn-block"
      >
        Sign out instead
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        className="input mt-1 w-full"
      />
      {hint && (
        <span className="block text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
