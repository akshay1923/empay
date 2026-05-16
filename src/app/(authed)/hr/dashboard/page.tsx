import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  CheckCircle2,
  Plane,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HrDashboardPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [
    headcount,
    presentToday,
    onLeaveToday,
    pendingRequests,
    recentJoiners,
    noManagerCount,
    noBankCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.attendance.count({
      where: { date: today, status: { in: ["PRESENT", "HALF_DAY"] } },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true, joinDate: { not: null } },
      orderBy: { joinDate: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        loginId: true,
        designation: true,
        department: true,
        joinDate: true,
      },
    }),
    prisma.user.count({
      where: {
        role: "EMPLOYEE",
        isActive: true,
        OR: [{ managerName: null }, { managerName: "" }],
      },
    }),
    prisma.user.count({
      where: {
        role: "EMPLOYEE",
        isActive: true,
        OR: [{ accountNumber: null }, { accountNumber: "" }],
      },
    }),
  ]);

  const warnings = [
    { kind: "no-manager" as const, count: noManagerCount },
    { kind: "no-bank" as const, count: noBankCount },
  ].filter((w) => w.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-eyebrow mb-1">HR</div>
        <h1 className="h-display-m">HR dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={Users}
          label="Active employees"
          value={headcount.toString()}
          accent="#714B67"
          href="/hr/employees"
        />
        <Stat
          icon={CheckCircle2}
          label="Present today"
          value={`${presentToday} / ${headcount}`}
          accent="#15803d"
          href="/hr/attendance"
        />
        <Stat
          icon={Plane}
          label="On leave today"
          value={onLeaveToday.toString()}
          accent="#0369a1"
          href="/hr/leaves"
        />
        <Stat
          icon={AlertTriangle}
          label="Pending leave requests"
          value={pendingRequests.toString()}
          accent="#a16207"
          href="/hr/leaves?tab=requests"
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
            <Users size={14} />
            Recent joiners
          </div>
          {recentJoiners.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
              No employees have a join date on record.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recentJoiners.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between text-[13px]"
                >
                  <div>
                    <div className="font-medium">{e.fullName}</div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--fg-faint)" }}
                    >
                      {e.designation ?? "—"}
                      {e.department ? ` · ${e.department}` : ""}
                      {e.loginId ? ` · ${e.loginId}` : ""}
                    </div>
                  </div>
                  <div
                    className="text-[12px] tabular-nums"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {e.joinDate ? format(e.joinDate, "d MMM yyyy") : "—"}
                  </div>
                </li>
              ))}
            </ul>
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
            <AlertTriangle size={14} />
            Profile warnings
          </div>
          {warnings.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
              All employee profiles are complete — bank details and manager
              assigned for everyone.
            </div>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w) => (
                <li
                  key={w.kind}
                  className="text-[13px]"
                  style={{ color: "var(--secondary)" }}
                >
                  {w.kind === "no-manager"
                    ? `${w.count} ${w.count === 1 ? "employee" : "employees"} without a manager`
                    : `${w.count} ${w.count === 1 ? "employee" : "employees"} without a bank account`}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1 mt-4 text-[12px] hover:underline"
            style={{ color: "var(--secondary)" }}
          >
            Open employee directory <ArrowRight size={12} />
          </Link>
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
  icon: typeof Users;
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
