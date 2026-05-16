"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Save, AlertCircle, Check } from "lucide-react";
import type { Role } from "@prisma/client";
import { updateUserRole } from "@/app/actions/admin-users";

export type UserRow = {
  id: string;
  fullName: string;
  loginId: string | null;
  email: string;
  role: Role;
  isActive: boolean;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "HR_OFFICER", label: "HR Officer" },
  { value: "PAYROLL_OFFICER", label: "Payroll Officer" },
  { value: "EMPLOYEE", label: "Employee" },
];

const ROLE_BADGE: Record<Role, { bg: string; fg: string; label: string }> = {
  ADMIN: { bg: "rgba(113,75,103,0.16)", fg: "#714B67", label: "Admin" },
  HR_OFFICER: { bg: "rgba(14,165,233,0.15)", fg: "#0369a1", label: "HR Officer" },
  PAYROLL_OFFICER: {
    bg: "rgba(22,163,74,0.15)",
    fg: "#15803d",
    label: "Payroll Officer",
  },
  EMPLOYEE: { bg: "var(--bg-soft)", fg: "var(--fg-muted)", label: "Employee" },
};

export function UsersPanel({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  return (
    <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="text-[12px] uppercase tracking-wide pb-2 mb-4 flex items-center justify-between gap-2"
        style={{
          color: "var(--fg-muted)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <span className="flex items-center gap-2">
          <Users size={14} />
          Users &amp; roles
        </span>
        <span className="normal-case tracking-normal text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {users.length} {users.length === 1 ? "user" : "users"}
        </span>
      </div>

      <p className="text-[13px] mb-4" style={{ color: "var(--fg-muted)" }}>
        Promote or demote users between Admin, HR Officer, Payroll Officer, and
        Employee. You can&apos;t change your own role.
      </p>

      {users.length === 0 ? (
        <div
          className="rounded-md p-8 text-center text-[13px]"
          style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
        >
          No users yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-soft)" }}>
                <Th>Name</Th>
                <Th>Login ID</Th>
                <Th>Email</Th>
                <Th>Current role</Th>
                <Th align="right">Change to</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRowView
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRowView({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Role>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = draft !== user.role;
  const badge = ROLE_BADGE[user.role];

  const onSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateUserRole({ userId: user.id, role: draft });
      if (!res.success) {
        setError(res.error);
        setDraft(user.role);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <tr
      className="border-t"
      style={{ borderColor: "var(--border-hairline)" }}
    >
      <td className="px-3 py-2.5">
        <div className="font-medium">
          {user.fullName}
          {isSelf && (
            <span
              className="ml-2 text-[11px] font-normal"
              style={{ color: "var(--fg-faint)" }}
            >
              (you)
            </span>
          )}
        </div>
        {!user.isActive && (
          <div className="text-[11px]" style={{ color: "#dc2626" }}>
            Inactive
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 font-mono text-[12px]">
        {user.loginId ?? "—"}
      </td>
      <td className="px-3 py-2.5" style={{ color: "var(--fg-muted)" }}>
        {user.email}
      </td>
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {error && (
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "#dc2626" }}
              title={error}
            >
              <AlertCircle size={12} /> {error}
            </span>
          )}
          {saved && !error && !dirty && (
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "#15803d" }}
            >
              <Check size={12} /> Saved
            </span>
          )}
          <select
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value as Role);
              setSaved(false);
              setError(null);
            }}
            disabled={isSelf || pending}
            className="input h-8 text-[12px] w-[140px]"
            title={
              isSelf ? "You can't change your own role" : "Select a new role"
            }
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || isSelf || pending}
            className="btn btn-primary text-[12px]"
          >
            <Save size={13} />
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="text-[11px] font-medium px-3 py-2"
      style={{
        color: "var(--fg-muted)",
        borderBottom: "1px solid var(--border-hairline)",
        textAlign: align,
      }}
    >
      {children}
    </th>
  );
}
