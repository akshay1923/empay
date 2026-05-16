import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { SalaryStatementPrintView } from "@/components/admin/reports/SalaryStatementPrintView";
import { decryptInt } from "@/lib/crypto/payroll";

export const dynamic = "force-dynamic";

const PF_BASIC_CEILING_PAISE = 15_000_00;

export default async function SalaryStatementPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const userId = sp.userId;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
  if (!userId || Number.isNaN(year)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      designation: true,
      department: true,
      joinDate: true,
      salaryStructures: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });
  if (!user) notFound();

  const structure = user.salaryStructures[0] ?? null;
  const ctcAnnual = structure ? decryptInt(structure.ctcAnnual) : 0;

  const monthlyWage = structure ? Math.round(ctcAnnual / 12) : 0;
  const basic = structure
    ? Math.round(monthlyWage * structure.basicPercent)
    : 0;
  const hra = structure ? Math.round(basic * structure.hraPercent) : 0;
  const standardAllowance = structure
    ? Math.round(monthlyWage * structure.standardAllowancePercent)
    : 0;
  const performanceBonus = structure
    ? Math.round(monthlyWage * structure.performanceBonusPercent)
    : 0;
  const lta = structure ? Math.round(monthlyWage * structure.ltaPercent) : 0;
  const fixedAllowance = Math.max(
    0,
    monthlyWage - basic - hra - standardAllowance - performanceBonus - lta
  );
  const pfEmployee = structure
    ? Math.round(
        Math.min(basic, PF_BASIC_CEILING_PAISE) * structure.pfEmployeePercent
      )
    : 0;
  const professionalTax = structure?.professionalTax ?? 0;

  const earnings = [
    { label: "Basic", monthly: basic },
    { label: "House Rent Allowance", monthly: hra },
    { label: "Standard Allowance", monthly: standardAllowance },
    { label: "Performance Bonus", monthly: performanceBonus },
    { label: "Leave Travel Allowance", monthly: lta },
    { label: "Fixed Allowance", monthly: fixedAllowance },
  ];
  const deductions = [
    { label: "PF — Employee", monthly: pfEmployee },
    { label: "Professional Tax", monthly: professionalTax },
  ];

  const totalEarnMonthly = earnings.reduce((s, l) => s + l.monthly, 0);
  const totalDedMonthly = deductions.reduce((s, l) => s + l.monthly, 0);
  const netMonthly = totalEarnMonthly - totalDedMonthly;

  return (
    <SalaryStatementPrintView
      companyName="EmPay"
      year={year}
      employee={{
        fullName: user.fullName,
        designation: user.designation ?? user.department ?? "—",
        joinDate: user.joinDate ? format(user.joinDate, "d/M/yyyy") : "—",
        effectiveFrom: structure
          ? format(structure.effectiveFrom, "d/M/yyyy")
          : "—",
      }}
      earnings={earnings.map((l) => ({
        label: l.label,
        monthly: l.monthly,
        yearly: l.monthly * 12,
      }))}
      deductions={deductions.map((l) => ({
        label: l.label,
        monthly: l.monthly,
        yearly: l.monthly * 12,
      }))}
      net={{ monthly: netMonthly, yearly: netMonthly * 12 }}
      hasStructure={!!structure}
    />
  );
}
