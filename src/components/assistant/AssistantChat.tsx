"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatProps = {
  compact?: boolean;
  role?: Role;
};

const STARTERS_BY_ROLE: Record<Role, string[]> = {
  EMPLOYEE: [
    "How many leaves do I have left this year?",
    "What's my attendance summary this month?",
    "Show my latest payslip net pay.",
  ],
  HR_OFFICER: [
    "How many employees are present today?",
    "How many leave requests are pending?",
    "Who joined most recently?",
  ],
  PAYROLL_OFFICER: [
    "What is the total employer cost this month?",
    "List salary structures we have configured.",
    "How many payslips are still in DRAFT?",
  ],
  ADMIN: [
    "Give me a quick org snapshot.",
    "How many employees are missing bank details?",
    "What's our pending leave request count?",
  ],
};

export function AssistantChat({ compact = false, role = "EMPLOYEE" }: AssistantChatProps) {
  const greeting = useMemo(() => {
    switch (role) {
      case "ADMIN":
        return "Hi, I'm your EmPay copilot. Ask about employees, attendance, leaves, payroll — anything in the workspace.";
      case "HR_OFFICER":
        return "Hi, I can help with employee data, attendance, and leave requests. (Payroll details are out of scope for HR.)";
      case "PAYROLL_OFFICER":
        return "Hi, I can help with attendance, leaves, salary structures, and payslip totals.";
      case "EMPLOYEE":
      default:
        return "Hi, I can help with your own attendance, leaves, and payslips. I can't share other employees' details.";
    }
  }, [role]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const starters = STARTERS_BY_ROLE[role] ?? STARTERS_BY_ROLE.EMPLOYEE;

  const requestMessages = useMemo(
    () =>
      messages.filter(
        (message) => message.role !== "assistant" || message !== messages[0]
      ),
    [messages]
  );

  async function askAssistant(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...requestMessages,
            { role: "user", content: trimmed },
          ].slice(-12),
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Assistant request failed");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "I could not find an answer for that yet.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant could not answer right now.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAssistant(input);
  }

  return (
    <div className="card overflow-hidden">
      <div
        className={cn(
          "overflow-y-auto p-5 space-y-4",
          compact ? "h-[360px]" : "min-h-[480px] max-h-[62vh]"
        )}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[78%] rounded-4 px-4 py-3 leading-relaxed whitespace-pre-wrap",
                compact ? "text-[13px]" : "text-[14px]",
                message.role === "user" ? "rounded-br-1" : "rounded-bl-1"
              )}
              style={{
                background:
                  message.role === "user" ? "var(--accent)" : "var(--bg-soft)",
                color:
                  message.role === "user" ? "var(--fg-onaccent)" : "var(--fg)",
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-4 rounded-bl-1 px-4 py-3 text-[14px] flex items-center gap-2"
              style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
            >
              <Loader2 size={15} className="animate-spin" />
              Thinking
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "px-5 py-3 hairline flex flex-wrap gap-2",
          compact && "hidden sm:flex"
        )}
      >
        {starters.map((starter) => (
          <button
            key={starter}
            type="button"
            className={cn("btn btn-secondary", compact && "text-[12px] px-2")}
            disabled={isLoading}
            onClick={() => void askAssistant(starter)}
          >
            <Sparkles size={14} />
            {starter}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="p-5 hairline">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            className="input min-h-[44px] h-[44px] py-3 resize-none"
            value={input}
            rows={1}
            placeholder="Ask about your attendance, leaves, payslips..."
            disabled={isLoading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary h-[44px] px-4 shrink-0"
            disabled={isLoading || !input.trim()}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
