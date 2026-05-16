import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PayslipDetail } from "@/components/admin/payroll/PayslipDetail";
import { decryptPayslipMoney } from "@/lib/crypto/payroll";

export const dynamic = "force-dynamic";

const ROLE_BASE_PATH = {
  ADMIN: "/admin/payroll",
  PAYROLL_OFFICER: "/payroll/payroll",
} as const;

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const raw = await prisma.payslip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          fullName: true,
          loginId: true,
          email: true,
          department: true,
          designation: true,
        },
      },
      payRun: { select: { id: true, month: true, year: true } },
    },
  });
  if (!raw) notFound();
  const slip = decryptPayslipMoney(raw);

  const role = session.user.role;
  // Detail / validate / cancel are admin and payroll-officer surfaces.
  // Employees view payslips on /employee/payslips and only the printable
  // version, gated separately by /payslips/[id]/print.
  if (role !== "ADMIN" && role !== "PAYROLL_OFFICER") {
    redirect("/unauthorized");
  }

  const basePath = ROLE_BASE_PATH[role];

  const periodStart = new Date(Date.UTC(slip.payRun.year, slip.payRun.month - 1, 1));
  const periodEnd = new Date(Date.UTC(slip.payRun.year, slip.payRun.month, 0));

  return (
    <PayslipDetail
      basePath={basePath}
      slip={{
        id: slip.id,
        status: slip.status,
        validatedAt: slip.validatedAt ? slip.validatedAt.toISOString() : null,
        cancelledAt: slip.cancelledAt ? slip.cancelledAt.toISOString() : null,
        cancellationReason: slip.cancellationReason,
        ctcAnnual: slip.ctcAnnual,
        basic: slip.basic,
        hra: slip.hra,
        specialAllowance: slip.specialAllowance,
        grossEarned: slip.grossEarned,
        employeePf: slip.employeePf,
        professionalTax: slip.professionalTax,
        totalDeductions: slip.totalDeductions,
        netPay: slip.netPay,
        employerPf: slip.employerPf,
        totalWorkingDays: slip.totalWorkingDays,
        daysPresent: slip.daysPresent,
        daysOnLeave: slip.daysOnLeave,
        daysAbsent: slip.daysAbsent,
        daysPayable: slip.daysPayable,
      }}
      employee={slip.user}
      payRun={{
        id: slip.payRun.id,
        month: slip.payRun.month,
        year: slip.payRun.year,
        label: format(periodStart, "MMM yyyy"),
        periodLabel: `${format(periodStart, "d MMM")} – ${format(periodEnd, "d MMM yyyy")}`,
      }}
    />
  );
}
