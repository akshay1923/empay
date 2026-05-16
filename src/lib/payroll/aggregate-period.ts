import { eachDayOfInterval, format, isSunday } from "date-fns";
import { prisma } from "@/lib/prisma";

export type PeriodStats = {
  totalWorkingDays: number;
  daysPresent: number;
  halfDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  daysAbsent: number;
};

type DayStatus =
  | "OFF"
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE";

/**
 * Aggregate one user's attendance + approved leaves into payroll-ready stats
 * for a calendar month. Sundays are considered off (not counted as working days).
 *
 * Precedence per day:
 *   approved leave (paid/unpaid) > attendance row > "absent (unmarked)"
 */
export async function aggregateAttendanceForPeriod(
  userId: string,
  month: number,
  year: number
): Promise<PeriodStats> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of month
  const endInclusive = new Date(end);
  endInclusive.setUTCHours(23, 59, 59, 999);

  const allDays = eachDayOfInterval({ start, end });
  const totalWorkingDays = allDays.filter((d) => !isSunday(d)).length;

  const [attendance, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, date: { gte: start, lte: endInclusive } },
      select: { date: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: endInclusive },
        endDate: { gte: start },
      },
      select: { startDate: true, endDate: true, leaveType: true },
    }),
  ]);

  const statusByDate = new Map<string, DayStatus>();
  for (const d of allDays) {
    if (isSunday(d)) statusByDate.set(format(d, "yyyy-MM-dd"), "OFF");
  }

  for (const a of attendance) {
    const k = format(a.date, "yyyy-MM-dd");
    if (statusByDate.get(k) === "OFF") continue;
    if (a.status === "PRESENT") statusByDate.set(k, "PRESENT");
    else if (a.status === "HALF_DAY") statusByDate.set(k, "HALF_DAY");
    else if (a.status === "ABSENT") statusByDate.set(k, "ABSENT");
  }

  // Approved leaves override attendance for that range.
  for (const lr of leaves) {
    const lrStart = lr.startDate < start ? start : lr.startDate;
    const lrEnd = lr.endDate > end ? end : lr.endDate;
    for (const d of eachDayOfInterval({ start: lrStart, end: lrEnd })) {
      if (isSunday(d)) continue;
      const k = format(d, "yyyy-MM-dd");
      statusByDate.set(
        k,
        lr.leaveType === "UNPAID" ? "UNPAID_LEAVE" : "PAID_LEAVE"
      );
    }
  }

  let daysPresent = 0;
  let halfDays = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let daysAbsent = 0;

  for (const d of allDays) {
    if (isSunday(d)) continue;
    const s = statusByDate.get(format(d, "yyyy-MM-dd")) ?? "ABSENT";
    if (s === "PRESENT") daysPresent++;
    else if (s === "HALF_DAY") halfDays++;
    else if (s === "PAID_LEAVE") paidLeaves++;
    else if (s === "UNPAID_LEAVE") unpaidLeaves++;
    else if (s === "ABSENT") daysAbsent++;
  }

  return {
    totalWorkingDays,
    daysPresent,
    halfDays,
    paidLeaves,
    unpaidLeaves,
    daysAbsent,
  };
}
