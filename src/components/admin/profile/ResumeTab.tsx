"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { updateResume } from "@/app/actions/admin-resume";

export function ResumeTab({
  initial,
}: {
  initial: { about: string | null; jobLove: string | null; hobbies: string | null };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    about: initial.about ?? "",
    jobLove: initial.jobLove ?? "",
    hobbies: initial.hobbies ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateResume(form);
      if (!res.success) return setError(res.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Block
        label="About"
        value={form.about}
        onChange={(v) => setForm({ ...form, about: v })}
        placeholder="A short bio — your background, what you focus on…"
      />
      <Block
        label="What I love about my job"
        value={form.jobLove}
        onChange={(v) => setForm({ ...form, jobLove: v })}
        placeholder="What energises you about your role?"
      />
      <Block
        label="My interests and hobbies"
        value={form.hobbies}
        onChange={(v) => setForm({ ...form, hobbies: v })}
        placeholder="Things you enjoy outside work."
      />
      <SaveBar pending={pending} error={error} saved={saved} />
    </form>
  );
}

function Block({
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
      <div className="text-[13px] font-medium mb-2">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        className="input w-full resize-y leading-[1.55] py-2"
        style={{ height: "auto", minHeight: 100 }}
      />
    </label>
  );
}

function SaveBar({
  pending,
  error,
  saved,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
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
