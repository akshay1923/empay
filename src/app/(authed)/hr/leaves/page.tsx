import { format } from "date-fns";
import { LeaveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TimeoffView } from "@/components/admin/timeoff/TimeoffView";
import type {
  AllocationRow,
  EmployeeOption,
  LeaveRequestRow,
  LeaveSummary,
} from "@/components/admin/timeoff/types";

export const dynamic = "force-dynamic";

const HR_BASE_PATH = "/hr/leaves";

const LEAVE_LABEL: Record<LeaveType, string> = {
  CASUAL: "Casual leave",
  SICK: "Sick leave",
  EARNED: "Earned leave",
  UNPAID: "Unpaid leave",
};

export default async function HrLeavesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || new Date().getFullYear();

  const [requests, allocations, employees, takenByUserType] = await Promise.all([
    prisma.leaveRequest.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: {
        user: { select: { fullName: true, loginId: true } },
      },
    }),
    prisma.leaveAllocation.findMany({
      where: { year },
      include: { user: { select: { fullName: true, loginId: true } } },
      orderBy: [{ user: { fullName: "asc" } }, { leaveType: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      select: { id: true, fullName: true, loginId: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.leaveRequest.groupBy({
      by: ["userId", "leaveType"],
      where: {
        status: "APPROVED",
        startDate: { gte: new Date(year, 0, 1) },
        endDate: { lt: new Date(year + 1, 0, 1) },
      },
      _sum: { totalDays: true },
    }),
  ]);

  const requestRows: LeaveRequestRow[] = requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    fullName: r.user.fullName,
    loginId: r.user.loginId,
    startDate: format(r.startDate, "yyyy-MM-dd"),
    endDate: format(r.endDate, "yyyy-MM-dd"),
    totalDays: r.totalDays,
    reason: r.reason,
    leaveType: r.leaveType,
    status: r.status,
    receiptUrl: r.receiptUrl,
    receiptName: r.receiptName,
  }));

  const usedKey = (uid: string, t: LeaveType) => `${uid}::${t}`;
  const usedMap = new Map<string, number>();
  for (const t of takenByUserType) {
    usedMap.set(usedKey(t.userId, t.leaveType), t._sum.totalDays ?? 0);
  }

  const allocationRows: AllocationRow[] = allocations.map((a) => {
    const used = usedMap.get(usedKey(a.userId, a.leaveType)) ?? 0;
    return {
      id: a.id,
      userId: a.userId,
      fullName: a.user.fullName,
      loginId: a.user.loginId,
      leaveType: a.leaveType,
      year: a.year,
      totalDays: a.totalDays,
      usedDays: used,
      availableDays: Math.max(0, a.totalDays - used),
    };
  });

  const summaryByType: Record<LeaveType, { allocated: number; available: number }> = {
    CASUAL: { allocated: 0, available: 0 },
    SICK: { allocated: 0, available: 0 },
    EARNED: { allocated: 0, available: 0 },
    UNPAID: { allocated: 0, available: 0 },
  };
  for (const a of allocationRows) {
    summaryByType[a.leaveType].allocated += a.totalDays;
    summaryByType[a.leaveType].available += a.availableDays;
  }
  const summaries: LeaveSummary[] = (
    ["CASUAL", "SICK", "EARNED"] as LeaveType[]
  ).map((t) => ({
    leaveType: t,
    label: LEAVE_LABEL[t],
    totalAllocated: summaryByType[t].allocated,
    totalAvailable: summaryByType[t].available,
  }));

  const employeeOptions: EmployeeOption[] = employees;

  // HR lands on the allocation tab by default — that's the part of leaves
  // they actually own. Requests stay visible but read-only.
  const tab = sp.tab === "requests" ? "requests" : "allocation";

  return (
    <TimeoffView
      tab={tab}
      year={year}
      requests={requestRows}
      allocations={allocationRows}
      summaries={summaries}
      employees={employeeOptions}
      basePath={HR_BASE_PATH}
      canApprove={false}
      canCreateRequest={false}
    />
  );
}
