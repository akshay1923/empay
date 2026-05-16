import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PayrollView } from "@/components/admin/payroll/PayrollView";
import { decryptPayslipMoney } from "@/lib/crypto/payroll";
import type {
  ChartPoint,
  DashboardData,
  PayRunSummary,
  PayslipRow,
} from "@/components/admin/payroll/types";

export const dynamic = "force-dynamic";

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; payRunId?: string }>;
}) {
  const sp = await searchParams;
  const tab: "dashboard" | "payrun" =
    sp.tab === "payrun" ? "payrun" : "dashboard";

  const [
    employees,
    payrunsRaw,
    activeNow,
    monthlyHistory,
    yearlyHistory,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        loginId: true,
        accountNumber: true,
        managerName: true,
      },
    }),
    prisma.payRun.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { _count: { select: { payslips: true } } },
    }),
    prisma.user.count({
      where: { role: "EMPLOYEE", isActive: true },
    }),
    prisma.payRun.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
      select: {
        month: true,
        year: true,
        totalEmployerCost: true,
        _count: { select: { payslips: true } },
      },
    }),
    prisma.payRun.groupBy({
      by: ["year"],
      _sum: { totalEmployerCost: true },
      orderBy: { year: "asc" },
    }),
  ]);

  const noBank = employees.filter(
    (e) => !e.accountNumber || e.accountNumber.trim() === ""
  ).length;
  const noManager = employees.filter(
    (e) => !e.managerName || e.managerName.trim() === ""
  ).length;
  const warnings = [
    { kind: "no-bank" as const, count: noBank },
    { kind: "no-manager" as const, count: noManager },
  ].filter((w) => w.count > 0);

  const payruns: PayRunSummary[] = payrunsRaw.map((p) => ({
    id: p.id,
    month: p.month,
    year: p.year,
    status: p.status,
    totalGross: p.totalGross,
    totalNet: p.totalNet,
    totalDeductions: p.totalDeductions,
    totalEmployerCost: p.totalEmployerCost,
    payslipCount: p._count.payslips,
  }));

  // Show last 6 months for the monthly chart, last 5 years for the annual chart.
  const monthlyTail = monthlyHistory.slice(-6);
  const employerCostByMonth: ChartPoint[] = monthlyTail.map((p) => ({
    label: format(new Date(p.year, p.month - 1, 1), "MMM yyyy"),
    value: p.totalEmployerCost,
  }));
  const employeeCountByMonth: ChartPoint[] = monthlyTail.map((p) => ({
    label: format(new Date(p.year, p.month - 1, 1), "MMM yyyy"),
    value: p._count.payslips,
  }));

  const employerCostByYear: ChartPoint[] = yearlyHistory.slice(-5).map((y) => ({
    label: String(y.year),
    value: y._sum.totalEmployerCost ?? 0,
  }));
  // Employee count "by year" — use the active-now count repeated for display;
  // a real year-end snapshot would need historical headcount which we don't track yet.
  const employeeCountByYear: ChartPoint[] = yearlyHistory.slice(-5).map((y) => ({
    label: String(y.year),
    value: activeNow,
  }));

  // If no historical data yet, seed the charts with a single "this month" bar
  // so the empty state still looks like a chart.
  if (employerCostByMonth.length === 0) {
    const now = new Date();
    employerCostByMonth.push({
      label: format(now, "MMM yyyy"),
      value: 0,
    });
    employeeCountByMonth.push({
      label: format(now, "MMM yyyy"),
      value: activeNow,
    });
  }
  if (employerCostByYear.length === 0) {
    employerCostByYear.push({
      label: String(new Date().getFullYear()),
      value: 0,
    });
    employeeCountByYear.push({
      label: String(new Date().getFullYear()),
      value: activeNow,
    });
  }

  const dashboard: DashboardData = {
    warnings,
    payruns: payruns.slice(0, 5),
    employerCostByMonth,
    employerCostByYear,
    employeeCountByMonth,
    employeeCountByYear,
  };

  // Selected payrun (latest by default).
  const selectedId = sp.payRunId ?? payruns[0]?.id ?? null;
  const selected = selectedId
    ? payruns.find((p) => p.id === selectedId) ?? null
    : null;

  let payslipRows: PayslipRow[] = [];
  if (selected) {
    const slipsRaw = await prisma.payslip.findMany({
      where: { payRunId: selected.id },
      include: { user: { select: { fullName: true, loginId: true } } },
      orderBy: { user: { fullName: "asc" } },
    });
    const slips = slipsRaw.map((s) => decryptPayslipMoney(s));
    payslipRows = slips.map((s) => ({
      id: s.id,
      userId: s.userId,
      fullName: s.user.fullName,
      loginId: s.user.loginId,
      status: s.status,
      ctcAnnual: s.ctcAnnual,
      basic: s.basic,
      hra: s.hra,
      specialAllowance: s.specialAllowance,
      grossEarned: s.grossEarned,
      employeePf: s.employeePf,
      professionalTax: s.professionalTax,
      totalDeductions: s.totalDeductions,
      netPay: s.netPay,
      employerPf: s.employerPf,
      totalWorkingDays: s.totalWorkingDays,
      daysPresent: s.daysPresent,
      daysOnLeave: s.daysOnLeave,
      daysAbsent: s.daysAbsent,
      daysPayable: s.daysPayable,
    }));
  }

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    loginId: e.loginId,
  }));

  return (
    <PayrollView
      tab={tab}
      dashboard={dashboard}
      payruns={payruns}
      selected={selected}
      payslips={payslipRows}
      employees={employeeOptions}
    />
  );
}
