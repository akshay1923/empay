"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNewPw] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await changePassword({ currentPassword, newPassword, confirmPassword });
      if (res.success) {
        setMsg({ kind: "ok", text: "Password updated." });
        setCurrent("");
        setNewPw("");
        setConfirm("");
      } else {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-[420px]">
      <div>
        <label className="label">Current password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className="input"
        />
      </div>
      <div>
        <label className="label">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPw(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="input"
        />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="input"
        />
      </div>
      {msg && (
        <div
          className="text-[13px] px-3 py-2 rounded-2"
          style={{
            background: msg.kind === "ok" ? "var(--color-bg-green)" : "var(--bg-tinted-red)",
            color: msg.kind === "ok" ? "var(--color-green)" : "var(--accent-text)",
            boxShadow:
              msg.kind === "ok"
                ? "none"
                : "inset 0 0 0 1px var(--accent-soft)",
          }}
        >
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
