"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { updatePrivateInfo } from "@/app/actions/admin-private";

export type PrivateInfoInitial = {
  dob: string | null;
  address: string | null;
  nationality: string | null;
  personalEmail: string | null;
  gender: string | null;
  maritalStatus: string | null;
  joinDate: string | null;
  accountNumber: string | null;
  bankName: string | null;
  ifscCode: string | null;
  panNumber: string | null;
  uanNumber: string | null;
  employeeCode: string | null;
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

export function PrivateInfoTab({
  initial,
  canEditOperationalFields = true,
}: {
  initial: PrivateInfoInitial;
  canEditOperationalFields?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    dob: initial.dob ?? "",
    address: initial.address ?? "",
    nationality: initial.nationality ?? "",
    personalEmail: initial.personalEmail ?? "",
    gender: initial.gender ?? "",
    maritalStatus: initial.maritalStatus ?? "",
    joinDate: initial.joinDate ?? "",
    accountNumber: initial.accountNumber ?? "",
    bankName: initial.bankName ?? "",
    ifscCode: initial.ifscCode ?? "",
    panNumber: initial.panNumber ?? "",
    uanNumber: initial.uanNumber ?? "",
    employeeCode: initial.employeeCode ?? "",
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
      const res = await updatePrivateInfo(form);
      if (!res.success) return setError(res.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title="Personal">
        <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} />
        <Field label="Residing Address" value={form.address} onChange={(v) => set("address", v)} />
        <Field label="Nationality" value={form.nationality} onChange={(v) => set("nationality", v)} placeholder="Indian" />
        <Field label="Personal Email" type="email" value={form.personalEmail} onChange={(v) => set("personalEmail", v)} />
        <Select label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} />
        <Select label="Marital Status" value={form.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={MARITAL_OPTIONS} />
        {canEditOperationalFields && (
          <>
            <Field label="Date of Joining" type="date" value={form.joinDate} onChange={(v) => set("joinDate", v)} />
            <Field label="Emp Code" value={form.employeeCode} onChange={(v) => set("employeeCode", v)} placeholder="EMP001" />
          </>
        )}
      </Section>

      <Section title="Bank & statutory">
        <Field label="Account Number" value={form.accountNumber} onChange={(v) => set("accountNumber", v)} />
        <Field label="Bank Name" value={form.bankName} onChange={(v) => set("bankName", v)} />
        <Field label="IFSC Code" value={form.ifscCode} onChange={(v) => set("ifscCode", v)} placeholder="HDFC0001234" />
        <Field label="PAN No" value={form.panNumber} onChange={(v) => set("panNumber", v)} placeholder="ABCDE1234F" />
        <Field label="UAN No" value={form.uanNumber} onChange={(v) => set("uanNumber", v)} />
      </Section>

      <SaveBar pending={pending} error={error} saved={saved} />
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div
        className="text-[12px] uppercase tracking-wide pb-1.5"
        style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border-hairline)" }}
      >
        {title}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent outline-none text-[14px] py-1"
        style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-hairline)" }}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fg-faint)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent outline-none text-[14px] py-1"
        style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-hairline)" }}
      >
        <option value=""></option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveBar({ pending, error, saved }: { pending: boolean; error: string | null; saved: boolean }) {
  return (
    <div
      className="pt-4 flex items-center justify-between gap-3"
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
            <Check size={13} /> Saved
          </span>
        )}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
