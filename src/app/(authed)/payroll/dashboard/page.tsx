import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Wallet,
  ArrowRight,
  ScrollText,
  BarChart3,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PayrollOfficerDashboardPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [
    pendingLeaves,
    presentToday,
    headcount,
    onLeaveToday,
    latestPayRun,
    draftPayslips,
  ] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendance.count({
      where: { date: today, status: { in: ["PRESENT", "HALF_DAY"] } },
    }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
    prisma.payRun.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { _count: { select: { payslips: true } } },
    }),
    prisma.payslip.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">Payroll</div>
        <h1 className="h-display-m">Payroll dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={ClipboardCheck}
          label="Pending leave requests"
          value={pendingLeaves.toString()}
          accent="#a16207"
          href="/payroll/timeoff"
        />
        <Stat
          icon={CheckCircle2}
          label="Present today"
          value={`${presentToday} / ${headcount}`}
          accent="#15803d"
          href="/payroll/attendance"
        />
        <Stat
          icon={AlertTriangle}
          label="On leave today"
          value={onLeaveToday.toString()}
          accent="#0369a1"
          href="/payroll/timeoff"
        />
        <Stat
          icon={ScrollText}
          label="Draft payslips"
          value={draftPayslips.toString()}
          accent="#714B67"
          href="/payroll/payroll?tab=payrun"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
          <div
            className="text-[12px] uppercase tracking-wide pb-2 mb-3 flex items-center gap-2"
            style={{
              color: "var(--fg-muted)",
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <Wallet size={14} />
            Latest pay run
          </div>
          {!latestPayRun ? (
            <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
              No pay runs yet. Open the Payroll tab and run payroll to create
              one.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div
                    className="font-display"
                    style={{
                      fontSize: 22,
                      lineHeight: 1.1,
                      color: "var(--fg-display)",
                    }}
                  >
                    {format(
                      new Date(latestPayRun.year, latestPayRun.month - 1, 1),
                      "MMM yyyy"
                    )}
                  </div>
                  <div
                    className="text-[12px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {latestPayRun._count.payslips} payslip
                    {latestPayRun._count.payslips === 1 ? "" : "s"} ·{" "}
                    {latestPayRun.status.toLowerCase()}
                  </div>
                </div>
                <div className="text-right text-[13px] tabular-nums">
                  <div>
                    Net{" "}
                    <strong>{formatINR(latestPayRun.totalNet)}</strong>
                  </div>
                  <div style={{ color: "var(--fg-muted)" }}>
                    Cost {formatINR(latestPayRun.totalEmployerCost)}
                  </div>
                </div>
              </div>
              <Link
                href={`/payroll/payroll?tab=payrun&payRunId=${latestPayRun.id}`}
                className="inline-flex items-center gap-1 text-[12px] hover:underline"
                style={{ color: "var(--secondary)" }}
              >
                Open payrun <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        <div className="card p-5" style={{ boxShadow: "var(--shadow-1)" }}>
          <div
            className="text-[12px] uppercase tracking-wide pb-2 mb-3 flex items-center gap-2"
            style={{
              color: "var(--fg-muted)",
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <BarChart3 size={14} />
            Quick links
          </div>
          <ul className="space-y-2.5 text-[13px]">
            <Quick href="/payroll/timeoff" label="Approve / reject time-off requests" />
            <Quick href="/payroll/payroll" label="Run payroll & manage payslips" />
            <Quick href="/payroll/reports" label="Generate salary statement reports" />
            <Quick href="/payroll/attendance" label="Browse org-wide attendance" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  href,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card p-4 block transition-colors hover:bg-[var(--bg-hover)]"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-md"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon size={14} />
        </span>
        <span
          className="text-[11px] uppercase tracking-wide"
          style={{ color: "var(--fg-muted)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="font-display"
        style={{ fontSize: 26, lineHeight: 1.1, color: "var(--fg-display)" }}
      >
        {value}
      </div>
    </Link>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between hover:underline"
        style={{ color: "var(--secondary)" }}
      >
        <span>{label}</span>
        <ArrowRight size={12} />
      </Link>
    </li>
  );
}

function formatINR(paise: number): string {
  return (
    "₹ " +
    (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })
  );
}
