"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle, Plane, Check, Paperclip, FileText } from "lucide-react";
import { applyLeave } from "@/app/actions/leave";
import { LeaveImpactCard } from "@/components/leave/LeaveImpactCard";
import { useLeavePreview } from "@/components/leave/useLeavePreview";

const LEAVE_TYPES = [
  { value: "CASUAL", label: "Casual leave" },
  { value: "SICK", label: "Sick leave" },
  { value: "EARNED", label: "Earned leave" },
  { value: "UNPAID", label: "Unpaid leave" },
] as const;

type LeaveTypeValue = (typeof LEAVE_TYPES)[number]["value"];

export function ApplyLeaveDialog({
  range,
  onClose,
}: {
  range: { start: string; end: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const open = !!range;
  const [leaveType, setLeaveType] = useState<LeaveTypeValue>("CASUAL");
  const [reason, setReason] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLeaveType("CASUAL");
      setReason("");
      setReceiptFile(null);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  const requiresReceipt = leaveType === "SICK";

  const previewInput = useMemo(
    () =>
      range
        ? {
            leaveType,
            startDate: range.start,
            endDate: range.end,
          }
        : null,
    [range, leaveType]
  );
  const { preview, loading: previewLoading } = useLeavePreview(previewInput);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!range) return;
    if (requiresReceipt && !receiptFile) {
      setError("Medical receipt is required for sick leave");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("leaveType", leaveType);
    fd.set("startDate", range.start);
    fd.set("endDate", range.end);
    fd.set("reason", reason.trim());
    if (receiptFile) fd.set("receipt", receiptFile);
    startTransition(async () => {
      const res = await applyLeave(fd);
      if (!res.success) return setError(res.error);
      onClose();
      router.refresh();
    });
  };

  const startLabel = range ? formatDate(range.start) : "";
  const endLabel = range ? formatDate(range.end) : "";
  const sameDay = range && range.start === range.end;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,94vw)] rounded-lg border p-6 z-50"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold">
                Apply for leave
              </Dialog.Title>
              <Dialog.Description
                className="text-[12px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Submit a request for the dates you selected. Your manager will
                review it.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="btn btn-ghost p-1.5" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div
            className="rounded-md p-3 text-[13px] mb-4 inline-flex items-center gap-2"
            style={{ background: "var(--bg-soft)" }}
          >
            <Plane size={14} style={{ color: "var(--accent)" }} />
            {sameDay ? (
              <span>
                <strong>{startLabel}</strong>
              </span>
            ) : (
              <span>
                <strong>{startLabel}</strong> → <strong>{endLabel}</strong>
              </span>
            )}
            <span style={{ color: "var(--fg-muted)" }}>
              · Sundays excluded automatically
            </span>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span
                className="text-[11px] uppercase tracking-wide"
                style={{ color: "var(--fg-faint)" }}
              >
                Leave type <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <select
                required
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveTypeValue)}
                className="input mt-1 w-full"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <LeaveImpactCard
              preview={preview}
              loading={previewLoading}
              leaveType={leaveType}
            />

            <label className="block">
              <span
                className="text-[11px] uppercase tracking-wide"
                style={{ color: "var(--fg-faint)" }}
              >
                Reason <span style={{ color: "#dc2626" }}>*</span>
              </span>
              <textarea
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Tell your manager why you're taking these days off…"
                className="input mt-1 w-full resize-none"
              />
            </label>

            <div>
              <span
                className="text-[11px] uppercase tracking-wide block"
                style={{ color: "var(--fg-faint)" }}
              >
                Medical receipt
                {requiresReceipt && (
                  <span style={{ color: "#dc2626" }}> *</span>
                )}
                {!requiresReceipt && (
                  <span style={{ color: "var(--fg-faint)" }}>
                    {" "}
                    (optional)
                  </span>
                )}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) =>
                  setReceiptFile(e.target.files?.[0] ?? null)
                }
                className="hidden"
              />
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-secondary"
                >
                  <Paperclip size={14} />
                  {receiptFile ? "Replace file" : "Attach receipt"}
                </button>
                {receiptFile && (
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    <FileText size={13} />
                    {receiptFile.name}
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="text-[11px] underline"
                      style={{ color: "var(--fg-faint)" }}
                    >
                      remove
                    </button>
                  </span>
                )}
              </div>
              <div
                className="text-[11px] mt-1"
                style={{ color: "var(--fg-faint)" }}
              >
                {requiresReceipt
                  ? "Required for sick leave. JPG, PNG, WEBP, or PDF up to 5 MB."
                  : "JPG, PNG, WEBP, or PDF up to 5 MB."}
              </div>
            </div>

            {error && (
              <div
                className="rounded-md p-2 text-[12px] flex items-center gap-2"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  color: "#dc2626",
                }}
              >
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary"
              >
                <Check size={14} />
                {pending ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00.000Z").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
