import Link from "next/link";
import { startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from "date-fns";
import { ArrowRight, Calendar, FileText, Plane } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MarkAttendanceCard } from "@/components/employee/MarkAttendanceCard";
import { formatINR } from "@/lib/utils";
import { decryptPayslipMoney } from "@/lib/crypto/payroll";

export default async function EmployeeDashboardPage() {
  const session = await auth();
  if (!session) return null;
  const userId = session.user.id;

  const today = startOfDay(new Date());
  today.setUTCHours(0, 0, 0, 0);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const year = today.getFullYear();

  const [todayAttendance, approvedLeaveToday, monthAttendance, balances, latestPayslipsRaw] =
    await Promise.all([
      prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      prisma.leaveRequest.findFirst({
        where: {
          userId,
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      prisma.attendance.findMany({
        where: { userId, date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.leaveAllocation.findMany({ where: { userId, year } }),
      prisma.payslip.findMany({
        where: { userId },
        include: { payRun: true },
        orderBy: [{ payRun: { year: "desc" } }, { payRun: { month: "desc" } }],
        take: 3,
      }),
    ]);
  const latestPayslips = latestPayslipsRaw.map((p) => decryptPayslipMoney(p));

  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
    (d) => !isSunday(d)
  ).length;
  const presentCount = monthAttendance.filter((a) => a.status === "PRESENT").length;
  const halfDayCount = monthAttendance.filter((a) => a.status === "HALF_DAY").length;
  const monthDaysWorked = presentCount + halfDayCount * 0.5;

  // Leave balance with usage
  const taken = await prisma.leaveRequest.groupBy({
    by: ["leaveType"],
    where: {
      userId,
      status: "APPROVED",
      startDate: { gte: new Date(`${year}-01-01`) },
      endDate: { lte: new Date(`${year}-12-31`) },
    },
    _sum: { totalDays: true },
  });
  const balance = balances.map((b) => {
    const used = taken.find((t) => t.leaveType === b.leaveType)?._sum.totalDays ?? 0;
    return { ...b, used, available: b.totalDays - used };
  });
  const casual = balance.find((b) => b.leaveType === "CASUAL") ?? {
    totalDays: 12,
    used: 0,
    available: 12,
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="text-eyebrow mb-1">Welcome back</div>
        <h1 className="h-display-m">Hi {session.user.name.split(" ")[0]}.</h1>
        <p className="text-[15px] mt-2" style={{ color: "var(--fg-muted)" }}>
          Mark today&apos;s attendance, request time off, or check your latest
          payslip — all from here.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <MarkAttendanceCard
          initialStatus={todayAttendance?.status === "PRESENT" || todayAttendance?.status === "ABSENT" || todayAttendance?.status === "HALF_DAY"
            ? todayAttendance.status
            : null}
          hasApprovedLeaveToday={Boolean(approvedLeaveToday)}
        />

        <div className="card p-6">
          <div className="text-eyebrow mb-1">This month</div>
          <h3 className="h-section mb-5">{format(today, "long")}</h3>

          <Stat label="Days worked" value={`${monthDaysWorked} / ${workingDays}`} />
          <Stat label="Present" value={String(presentCount)} />
          <Stat label="Half-days" value={String(halfDayCount)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 col-span-1 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-eyebrow mb-1">Leave balance</div>
              <h3 className="h-section">Casual leave — {year}</h3>
            </div>
            <Link href="/employee/attendance" className="btn btn-secondary">
              <Plane size={14} />
              Apply for leave
            </Link>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div
                className="font-display"
                style={{
                  fontSize: 50,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--fg-display)",
                  fontWeight: 500,
                }}
              >
                {casual.available}
              </div>
              <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
                of {casual.totalDays} days available
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
                Used {casual.used} days
              </div>
            </div>
          </div>
          <ProgressBar value={casual.used} max={casual.totalDays} />
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="h-section">Latest payslips</h3>
            <Link
              href="/employee/payslips"
              className="text-[13px] flex items-center gap-1"
              style={{ color: "var(--secondary)" }}
            >
              See all <ArrowRight size={12} />
            </Link>
          </div>

          {latestPayslips.length === 0 ? (
            <div
              className="rounded-3 px-4 py-6 text-center"
              style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
            >
              <FileText size={20} className="mx-auto mb-2 opacity-60" />
              <div className="text-[13px]">No payslips yet</div>
              <div className="text-[12px] mt-1">
                Your first payslip will land here once payroll runs.
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {latestPayslips.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-medium">
                      {monthLabel(p.payRun.month)} {p.payRun.year}
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                      Net pay
                    </div>
                  </div>
                  <div className="font-medium text-[14px]">{formatINR(p.netPay)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          href="/employee/attendance"
          icon={<Calendar size={16} />}
          title="Attendance calendar"
          subtitle="View the full month at a glance"
        />
        <QuickAction
          href="/employee/attendance"
          icon={<Plane size={16} />}
          title="Apply for leave"
          subtitle="Drag dates on your attendance calendar"
        />
        <QuickAction
          href="/employee/payslips"
          icon={<FileText size={16} />}
          title="My payslips"
          subtitle="Download a PDF for any month"
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0"
      style={{ borderColor: "var(--border-hairline)" }}
    >
      <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span className="text-[14px] font-medium">{value}</span>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className="h-2 w-full rounded-pill overflow-hidden"
      style={{ background: "var(--bg-soft)" }}
    >
      <div
        className="h-full rounded-pill"
        style={{
          width: `${pct}%`,
          background: "var(--accent)",
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="card p-5 flex items-start gap-3 transition hover:shadow-2"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div
        className="h-8 w-8 rounded-3 flex items-center justify-center"
        style={{ background: "rgba(113,75,103,0.10)", color: "var(--accent)" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[14px] font-medium">{title}</div>
        <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          {subtitle}
        </div>
      </div>
    </Link>
  );
}

function format(d: Date, _: "long") {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function monthLabel(m: number) {
  return new Date(2025, m - 1, 1).toLocaleDateString("en-IN", { month: "long" });
}
