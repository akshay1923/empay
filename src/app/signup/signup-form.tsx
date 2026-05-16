"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { signUpOfficer } from "@/app/actions/auth";
import { PasswordInput } from "@/components/PasswordInput";

const ROLES: { value: "ADMIN" | "HR_OFFICER" | "PAYROLL_OFFICER"; label: string; help: string }[] = [
  { value: "HR_OFFICER", label: "HR Officer", help: "Creates employees, allocates leave balances" },
  { value: "PAYROLL_OFFICER", label: "Payroll Officer", help: "Approves leaves, runs payroll, sets salary" },
  { value: "ADMIN", label: "Admin", help: "Full access across the workspace" },
];

export function SignupForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("Odoo India");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]["value"]>("HR_OFFICER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signUpOfficer({
        companyName,
        fullName,
        email,
        phone,
        role,
        password,
        confirmPassword,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      const signed = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
      });
      if (!signed || signed.error) {
        router.push("/login");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="companyName">Company name</label>
          <input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Hema Reddy"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="phone">Phone (optional)</label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="input"
        />
      </div>

      <div>
        <label className="label">Role</label>
        <div className="grid grid-cols-1 gap-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className="flex items-start gap-3 p-3 rounded-3 cursor-pointer transition"
              style={{
                background: role === r.value ? "rgba(113,75,103,0.08)" : "var(--bg-soft)",
                border:
                  role === r.value
                    ? "1px solid var(--accent-soft)"
                    : "1px solid var(--border)",
              }}
            >
              <input
                type="radio"
                name="role"
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="mt-1"
                style={{ accentColor: "var(--accent)" }}
              />
              <div className="flex-1">
                <div className="text-[14px] font-medium" style={{ color: "var(--fg)" }}>
                  {r.label}
                </div>
                <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                  {r.help}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirm</label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
      </div>

      {error && (
        <div
          className="text-[13px] px-3 py-2 rounded-2"
          style={{
            background: "var(--bg-tinted-red)",
            color: "var(--accent-text)",
            boxShadow: "inset 0 0 0 1px var(--accent-soft)",
          }}
        >
          {error}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
