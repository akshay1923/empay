"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, AlertCircle } from "lucide-react";
import { updateAdminProfile } from "@/app/actions/admin-profile";

type Initial = {
  fullName: string;
  loginId: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  department: string | null;
  managerName: string | null;
  address: string | null;
};

export function AdminProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: initial.fullName,
    phone: initial.phone ?? "",
    companyName: initial.companyName ?? "",
    department: initial.department ?? "",
    managerName: initial.managerName ?? "",
    address: initial.address ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof form>(k: K, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateAdminProfile(form);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="card p-7" style={{ boxShadow: "var(--shadow-2)" }}>
      <div className="flex flex-col md:flex-row gap-7">
        <Avatar name={form.fullName} />

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
          {/* Left column: Name, Login ID, Email, Mobile */}
          <div className="space-y-5">
            <BigField
              label="Name"
              value={form.fullName}
              onChange={(v) => set("fullName", v)}
              required
            />
            <ReadOnlyField label="Login ID" value={initial.loginId ?? "—"} mono />
            <ReadOnlyField label="Email" value={initial.email} />
            <Field
              label="Mobile"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              placeholder="+91 90000 00000"
            />
          </div>

          {/* Right column: Company, Department, Manager, Location */}
          <div className="space-y-5">
            <Field
              label="Company"
              value={form.companyName}
              onChange={(v) => set("companyName", v)}
            />
            <Field
              label="Department"
              value={form.department}
              onChange={(v) => set("department", v)}
            />
            <Field
              label="Manager"
              value={form.managerName}
              onChange={(v) => set("managerName", v)}
            />
            <Field
              label="Location"
              value={form.address}
              onChange={(v) => set("address", v)}
            />
          </div>
        </div>
      </div>

      <div
        className="mt-7 pt-5 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--border-hairline)" }}
      >
        <div className="text-[12px] min-h-[18px]">
          {error && (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: "#dc2626" }}
            >
              <AlertCircle size={13} /> {error}
            </span>
          )}
          {saved && !error && (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: "#15803d" }}
            >
              <Check size={13} /> Profile saved
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setForm({
                fullName: initial.fullName,
                phone: initial.phone ?? "",
                companyName: initial.companyName ?? "",
                department: initial.department ?? "",
                managerName: initial.managerName ?? "",
                address: initial.address ?? "",
              });
              setError(null);
              setSaved(false);
            }}
            className="btn btn-secondary"
          >
            Reset
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="shrink-0 self-start">
      <div className="relative">
        <div
          className="h-[112px] w-[112px] rounded-full flex items-center justify-center text-[32px] font-semibold"
          style={{
            background: "rgba(113,75,103,0.18)",
            color: "var(--accent-text)",
          }}
        >
          {initials(name)}
        </div>
        <button
          type="button"
          aria-label="Change photo (coming soon)"
          title="Photo upload coming soon"
          className="absolute bottom-1 right-1 h-8 w-8 rounded-full flex items-center justify-center border"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-1)",
            color: "var(--fg-muted)",
          }}
          disabled
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

function BigField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent outline-none text-[22px] font-semibold py-1"
        style={{
          color: "var(--fg-display)",
          borderBottom: "1px solid var(--border-strong)",
        }}
      />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent outline-none text-[14px] py-1"
        style={{
          color: "var(--fg)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="block">
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
      </div>
      <div
        className={`mt-1 w-full text-[14px] py-1 ${mono ? "font-mono" : ""}`}
        style={{
          color: "var(--fg-muted)",
          borderBottom: "1px dashed var(--border-hairline)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
