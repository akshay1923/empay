import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import { AttendanceGrid } from "@/components/admin/attendance/AttendanceGrid";
import {
  STANDARD_WORK_MINUTES,
  type CellStatus,
  type DayCol,
  type EmployeeRow,
} from "@/components/admin/attendance/types";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 31;

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseDateParam(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = parseISO(s);
  if (!isValid(d)) return fallback;
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function clampRange(from: Date, to: Date): { from: Date; to: Date } {
  let f = from;
  let t = to;
  if (t < f) [f, t] = [t, f];
  const span = differenceInCalendarDays(t, f);
  if (span > MAX_RANGE_DAYS - 1) {
    t = addDays(f, MAX_RANGE_DAYS - 1);
  }
  return { from: f, to: t };
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const today = todayUtc();
  const { from, to } = clampRange(
    parseDateParam(sp.from, today),
    parseDateParam(sp.to, today)
  );

  const days: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);

  const [employees, attendance, leaves] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, loginId: true, department: true },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        userId: true,
        date: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
  ]);

  const todayIso = format(today, "yyyy-MM-dd");

  const dayCols: DayCol[] = days.map((d) => {
    const iso = format(d, "yyyy-MM-dd");
    const dow = d.getUTCDay();
    return {
      iso,
      weekday: format(d, "EEE"),
      dayMonth: format(d, "d MMM"),
      isWeekend: dow === 0,
      isToday: iso === todayIso,
    };
  });

  type AttCell = {
    status: CellStatus;
    checkInAt: Date | null;
    checkOutAt: Date | null;
  };
  // index attendance: userId -> Map<isoDate, AttCell>
  const attMap = new Map<string, Map<string, AttCell>>();
  for (const a of attendance) {
    const iso = format(a.date, "yyyy-MM-dd");
    let m = attMap.get(a.userId);
    if (!m) {
      m = new Map();
      attMap.set(a.userId, m);
    }
    m.set(iso, {
      status: a.status as CellStatus,
      checkInAt: a.checkInAt,
      checkOutAt: a.checkOutAt,
    });
  }

  // index leaves: userId -> set of ISO dates covered
  const leaveMap = new Map<string, Set<string>>();
  for (const lr of leaves) {
    let s = leaveMap.get(lr.userId);
    if (!s) {
      s = new Set();
      leaveMap.set(lr.userId, s);
    }
    let d = lr.startDate < from ? from : new Date(lr.startDate);
    d.setUTCHours(0, 0, 0, 0);
    const end = lr.endDate > to ? to : new Date(lr.endDate);
    end.setUTCHours(0, 0, 0, 0);
    while (d <= end) {
      s.add(format(d, "yyyy-MM-dd"));
      d = addDays(d, 1);
    }
  }

  const isSingleDay = dayCols.length === 1;

  const rows: EmployeeRow[] = employees.map((e) => {
    const a = attMap.get(e.id);
    const l = leaveMap.get(e.id);
    let p = 0, ab = 0, lv = 0;
    const cells: CellStatus[] = dayCols.map((c) => {
      if (l?.has(c.iso)) {
        lv++;
        return "ON_LEAVE";
      }
      const cell = a?.get(c.iso);
      const s = cell?.status;
      if (s === "PRESENT") {
        p++;
        return "PRESENT";
      }
      if (s === "HALF_DAY") {
        p += 0.5;
        ab += 0.5;
        return "HALF_DAY";
      }
      if (s === "ABSENT") {
        ab++;
        return "ABSENT";
      }
      if (s === "ON_LEAVE") {
        lv++;
        return "ON_LEAVE";
      }
      if (s === "HOLIDAY") return "HOLIDAY";
      if (c.isWeekend) return "WEEKEND";
      return "NONE";
    });

    let day: EmployeeRow["day"] = undefined;
    if (isSingleDay) {
      const cell = a?.get(dayCols[0].iso);
      let workMinutes: number | null = null;
      let extraMinutes: number | null = null;
      if (cell?.checkInAt && cell.checkOutAt) {
        workMinutes = Math.max(
          0,
          Math.round(
            (cell.checkOutAt.getTime() - cell.checkInAt.getTime()) / 60000
          )
        );
        extraMinutes = workMinutes - STANDARD_WORK_MINUTES;
      }
      day = {
        status: cells[0],
        checkInAt: cell?.checkInAt ? cell.checkInAt.toISOString() : null,
        checkOutAt: cell?.checkOutAt ? cell.checkOutAt.toISOString() : null,
        workMinutes,
        extraMinutes,
      };
    }

    return {
      id: e.id,
      fullName: e.fullName,
      loginId: e.loginId,
      department: e.department,
      cells,
      totals: { present: p, absent: ab, leave: lv },
      day,
    };
  });

  return (
    <AttendanceGrid
      from={format(from, "yyyy-MM-dd")}
      to={format(to, "yyyy-MM-dd")}
      days={dayCols}
      rows={rows}
    />
  );
}
