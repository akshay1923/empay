import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PayslipPrintView } from "@/components/admin/payroll/PayslipPrintView";
import { decryptPayslipMoney } from "@/lib/crypto/payroll";

export const dynamic = "force-dynamic";

export default async function PayslipPrintPage({
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
          employeeCode: true,
          department: true,
          designation: true,
          address: true,
          panNumber: true,
          uanNumber: true,
          accountNumber: true,
          joinDate: true,
        },
      },
      payRun: { select: { month: true, year: true } },
    },
  });
  if (!raw) notFound();
  const slip = decryptPayslipMoney(raw);

  // Admin and Payroll Officer can view any payslip; everyone else only their own.
  const role = session.user.role;
  const canViewAny = role === "ADMIN" || role === "PAYROLL_OFFICER";
  if (!canViewAny && slip.userId !== session.user.id) {
    redirect("/unauthorized");
  }

  const periodStart = new Date(Date.UTC(slip.payRun.year, slip.payRun.month - 1, 1));
  const periodEnd = new Date(Date.UTC(slip.payRun.year, slip.payRun.month, 0));
  const payDate = new Date(periodEnd);
  payDate.setUTCDate(payDate.getUTCDate() + 3);

  return (
    <PayslipPrintView
      companyName="EmPay"
      slip={{
        basic: slip.basic,
        hra: slip.hra,
        specialAllowance: slip.specialAllowance,
        grossEarned: slip.grossEarned,
        employeePf: slip.employeePf,
        employerPf: slip.employerPf,
        professionalTax: slip.professionalTax,
        totalDeductions: slip.totalDeductions,
        netPay: slip.netPay,
        totalWorkingDays: slip.totalWorkingDays,
        daysPresent: slip.daysPresent,
        daysOnLeave: slip.daysOnLeave,
        daysAbsent: slip.daysAbsent,
        daysPayable: slip.daysPayable,
      }}
      employee={{
        fullName: slip.user.fullName,
        employeeCode: slip.user.employeeCode,
        loginId: slip.user.loginId,
        department: slip.user.department,
        designation: slip.user.designation,
        address: slip.user.address,
        panNumber: slip.user.panNumber,
        uanNumber: slip.user.uanNumber,
        accountNumber: slip.user.accountNumber,
        joinDate: slip.user.joinDate
          ? format(slip.user.joinDate, "d/M/yyyy")
          : null,
      }}
      payRun={{
        month: slip.payRun.month,
        year: slip.payRun.year,
        monthLabel: format(periodStart, "MMM yyyy"),
        periodStartDDMMYYYY: format(periodStart, "d/M/yyyy"),
        periodEndDDMMYYYY: format(periodEnd, "d/M/yyyy"),
        payDateDDMMYYYY: format(payDate, "d/M/yyyy"),
      }}
    />
  );
}
