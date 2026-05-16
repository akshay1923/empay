"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plane, Pencil, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import { deleteEmployee } from "@/app/actions/employees";
import type { EmployeeListItem } from "./types";

const STATUS_LABEL: Record<EmployeeListItem["todayStatus"], string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LEAVE: "On leave",
  NONE: "Not marked",
};
const STATUS_COLOR: Record<EmployeeListItem["todayStatus"], string> = {
  PRESENT: "#16a34a",
  ABSENT: "#eab308",
  LEAVE: "#0ea5e9",
  NONE: "#9ca3af",
};

export function EmployeeDetailDialog({
  employee,
  canDelete = true,
  onClose,
  onEdit,
}: {
  employee: EmployeeListItem | null;
  canDelete?: boolean;
  onClose: () => void;
  onEdit: (employee: EmployeeListItem) => void;
}) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleClose = (o: boolean) => {
    if (!o) {
      onClose();
      setConfirmingDelete(false);
      setError(null);
    }
  };

  const onDelete = () => {
    if (!employee) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteEmployee(employee.id);
      if (!res.success) return setError(res.error);
      handleClose(false);
      router.refresh();
    });
  };

  return (
    <Dialog.Root open={!!employee} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,92vw)] rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          {employee && (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-[14px] font-medium"
                    style={{
                      background: "rgba(113,75,103,0.12)",
                      color: "var(--accent-text)",
                    }}
                  >
                    {initials(employee.fullName)}
                  </div>
                  <div>
                    <Dialog.Title className="text-[16px] font-semibold">
                      {employee.fullName}
                    </Dialog.Title>
                    <Dialog.Description
                      className="text-[12px]"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {employee.designation || "—"}
                      {employee.department ? ` · ${employee.department}` : ""}
                    </Dialog.Description>
                  </div>
                </div>
                <Dialog.Close asChild>
                  <button className="btn btn-ghost p-1.5" aria-label="Close">
                    <X size={16} />
                  </button>
                </Dialog.Close>
              </div>

              <div
                className="flex items-center gap-2 text-[12px] mb-5"
                style={{ color: "var(--fg-muted)" }}
              >
                Status today:
                {employee.todayStatus === "LEAVE" ? (
                  <Plane size={14} style={{ color: STATUS_COLOR.LEAVE }} />
                ) : (
                  <span
                    className="h-2 w-2 rounded-full inline-block"
                    style={{ background: STATUS_COLOR[employee.todayStatus] }}
                  />
                )}
                <span style={{ color: "var(--fg)" }}>
                  {STATUS_LABEL[employee.todayStatus]}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px]">
                <Field label="Login ID" value={employee.loginId} mono />
                <Field label="Email" value={employee.email} />
                <Field label="Phone" value={employee.phone} />
                <Field label="Department" value={employee.department} />
                <Field label="Designation" value={employee.designation} />
                <Field label="Joined" value={formatDate(employee.joinDate)} />
              </dl>

              {confirmingDelete && canDelete ? (
                <div
                  className="mt-6 rounded-md p-4 border"
                  style={{
                    background: "rgba(220,38,38,0.06)",
                    borderColor: "rgba(220,38,38,0.25)",
                  }}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle size={16} style={{ color: "#dc2626" }} className="mt-0.5" />
                    <div className="text-[13px]" style={{ color: "#7f1d1d" }}>
                      <div className="font-medium mb-1">
                        Permanently delete {employee.fullName}?
                      </div>
                      <div className="text-[12px]" style={{ color: "#991b1b" }}>
                        This is irreversible. Their account, salary structure, attendance
                        history, leave requests, leave allocations, and payslips will all
                        be deleted. Leave records they approved for other employees stay
                        intact (the approver field is cleared).
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div
                      className="flex items-center gap-2 text-[12px] mb-3 p-2 rounded-md"
                      style={{ background: "rgba(220,38,38,0.10)", color: "#dc2626" }}
                    >
                      <AlertCircle size={13} /> {error}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="btn btn-secondary"
                      disabled={pending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={pending}
                      className="btn"
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                      }}
                    >
                      <Trash2 size={14} />
                      {pending ? "Deleting…" : "Delete permanently"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="mt-6 pt-4 flex items-center justify-end gap-2"
                  style={{ borderTop: "1px solid var(--border-hairline)" }}
                >
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="btn btn-ghost"
                      style={{ color: "#dc2626" }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(employee)}
                    className="btn btn-primary"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
        {label}
      </dt>
      <dd className={mono ? "font-mono" : ""}>{value || "—"}</dd>
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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
