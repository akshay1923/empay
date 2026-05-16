"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { cn } from "@/lib/utils";

const ROLE_TAGLINE: Record<Role, string> = {
  ADMIN: "Workspace, attendance, payroll",
  HR_OFFICER: "Employees, attendance, leaves",
  PAYROLL_OFFICER: "Attendance, salary, payslips",
  EMPLOYEE: "Your attendance, leaves, payslips",
};

export function FloatingAssistant({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  return (
    <div className="fixed bottom-5 right-5 z-50 no-print">
      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            "mb-3 w-[calc(100vw-40px)] max-w-[420px] overflow-hidden rounded-lg border outline-none"
          )}
          style={{
            background: "var(--bg)",
            borderColor: "var(--border-hairline)",
            boxShadow: "var(--shadow-3)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{
                  background: "var(--bg-soft)",
                  color: "var(--accent)",
                }}
              >
                <Bot size={16} />
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">
                  EmPay Assistant
                </div>
                <div
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {ROLE_TAGLINE[role]}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost p-1.5"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          <AssistantChat compact role={role} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full transition-colors focus:outline-none"
        style={{
          background: open ? "var(--bg-soft)" : "var(--accent)",
          color: open ? "var(--fg)" : "var(--fg-onaccent)",
          border: "1px solid var(--border-hairline)",
          boxShadow: "var(--shadow-2)",
        }}
        title={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X size={18} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
