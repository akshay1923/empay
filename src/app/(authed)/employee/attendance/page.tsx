import { startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isToday } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MarkAttendanceCard } from "@/components/employee/MarkAttendanceCard";
import { LeaveCalendar, type DayInfo } from "@/components/employee/LeaveCalendar";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const userId = session.user.id;

  const { month: monthParam, year: yearParam } = await searchParams;
  const now = new Date();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const year = yearParam ? Number(yearParam) : now.getFullYear();

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const today = startOfDay(now);
  today.setUTCHours(0, 0, 0, 0);

  const [records, leaves, todayAttendance, approvedLeaveToday] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
    }),
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
  ]);

  const statusByKey = new Map<string, DayInfo["status"]>();
  for (const r of records) {
    statusByKey.set(toKey(r.date), r.status as DayInfo["status"]);
  }
  for (const l of leaves) {
    for (const d of eachDayOfInterval({ start: l.startDate, end: l.endDate })) {
      if (d < monthStart || d > monthEnd) continue;
      if (isSunday(d)) continue;
      statusByKey.set(toKey(d), "ON_LEAVE");
    }
  }

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadEmpty = monthStart.getDay(); // 0 = Sun
  const days: DayInfo[] = monthDays.map((d) => ({
    iso: toKey(d),
    dayNumber: d.getDate(),
    isSunday: isSunday(d),
    isToday: isToday(d),
    status: statusByKey.get(toKey(d)) ?? null,
  }));

  const summary = {
    present: records.filter((r) => r.status === "PRESENT").length,
    halfDay: records.filter((r) => r.status === "HALF_DAY").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    onLeave: Array.from(statusByKey.values()).filter((s) => s === "ON_LEAVE").length,
  };

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-eyebrow mb-1">Attendance</div>
          <h1 className="h-display-m">
            {monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </h1>
        </div>
        <MonthSwitcher month={month} year={year} />
      </div>

      <MarkAttendanceCard
        initialStatus={
          todayAttendance?.status === "PRESENT" ||
          todayAttendance?.status === "HALF_DAY" ||
          todayAttendance?.status === "ABSENT"
            ? todayAttendance.status
            : null
        }
        hasApprovedLeaveToday={Boolean(approvedLeaveToday)}
      />

      <LeaveCalendar leadEmpty={leadEmpty} days={days} summary={summary} />
    </div>
  );
}

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function MonthSwitcher({ month, year }: { month: number; year: number }) {
  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  return (
    <div className="flex items-center gap-1">
      <a
        href={`?month=${prev.m}&year=${prev.y}`}
        className="btn btn-secondary"
      >
        ← Prev
      </a>
      <a
        href={`?month=${next.m}&year=${next.y}`}
        className="btn btn-secondary"
      >
        Next →
      </a>
    </div>
  );
}
