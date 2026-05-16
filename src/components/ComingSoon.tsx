import Link from "next/link";
import { Sparkles } from "lucide-react";

export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-7">
      <div>
        <div className="text-eyebrow mb-1">{eyebrow}</div>
        <h1 className="h-display-m">{title}</h1>
        <p className="text-[14px] mt-2 max-w-[640px]" style={{ color: "var(--fg-muted)" }}>
          {description}
        </p>
      </div>

      <div
        className="card p-10 text-center max-w-[640px]"
        style={{ boxShadow: "var(--shadow-3)" }}
      >
        <div
          className="h-10 w-10 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "rgba(113,75,103,0.10)", color: "var(--accent)" }}
        >
          <Sparkles size={18} />
        </div>
        <div className="text-[16px] font-medium mb-1">Coming in the next pass</div>
        <div className="text-[13px] mb-5" style={{ color: "var(--fg-muted)" }}>
          The employee shell is complete. Admin / HR / Payroll views land in the
          next build round — schema and permissions are already wired.
        </div>
        <Link href="/employee/dashboard" className="btn btn-primary">
          Open employee workspace
        </Link>
      </div>
    </div>
  );
}
