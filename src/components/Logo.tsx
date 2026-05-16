import { cn } from "@/lib/utils";

export function Logo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      style={{ fontFamily: "var(--font-display)" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden
        style={{ display: "block" }}
      >
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="6"
          fill="var(--accent)"
        />
        <path
          d="M10 22 V10 h6 a4 4 0 0 1 0 8 H12.5"
          stroke="var(--fg-onaccent)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="22" cy="22" r="2" fill="var(--fg-onaccent)" />
      </svg>
      <span
        className="font-medium tracking-tight"
        style={{ fontSize: 16, color: "var(--fg)" }}
      >
        EmPay
      </span>
    </span>
  );
}
