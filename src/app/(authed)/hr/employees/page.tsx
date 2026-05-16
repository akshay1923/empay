import { prisma } from "@/lib/prisma";
import { EmployeesView } from "@/components/admin/EmployeesView";
import type { EmployeeListItem, TodayStatus } from "@/components/admin/types";
import { decryptInt } from "@/lib/crypto/payroll";

export const dynamic = "force-dynamic";

export default async function HrEmployeesPage() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  const [employees, attendance, leaves, salaries, templates] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        loginId: true,
        fullName: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        joinDate: true,
      },
    }),
    prisma.attendance.findMany({
      where: { date },
      select: { userId: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { userId: true },
    }),
    prisma.salaryStructure.findMany({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
      select: { userId: true, ctcAnnual: true },
    }),
    prisma.salaryStructureTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const ctcByUser = new Map<string, number>();
  for (const s of salaries) {
    if (!ctcByUser.has(s.userId)) ctcByUser.set(s.userId, decryptInt(s.ctcAnnual));
  }

  const onLeave = new Set(leaves.map((l) => l.userId));
  const att = new Map(attendance.map((a) => [a.userId, a.status]));

  const items: EmployeeListItem[] = employees.map((e) => {
    let todayStatus: TodayStatus = "NONE";
    if (onLeave.has(e.id)) {
      todayStatus = "LEAVE";
    } else {
      const s = att.get(e.id);
      if (s === "PRESENT" || s === "HALF_DAY") todayStatus = "PRESENT";
      else if (s === "ABSENT") todayStatus = "ABSENT";
      else if (s === "ON_LEAVE") todayStatus = "LEAVE";
    }
    return {
      id: e.id,
      loginId: e.loginId,
      fullName: e.fullName,
      email: e.email,
      phone: e.phone,
      department: e.department,
      designation: e.designation,
      joinDate: e.joinDate ? e.joinDate.toISOString() : null,
      ctcAnnual: ctcByUser.get(e.id) ?? null,
      todayStatus,
    };
  });

  return (
    <EmployeesView
      employees={items}
      canDelete={false}
      salaryTemplates={templates}
    />
  );
}
