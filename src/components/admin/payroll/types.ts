import type { PayrollStatus, PayslipStatus } from "@prisma/client";

export type PayRunSummary = {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  totalGross: number; // paise
  totalNet: number; // paise
  totalDeductions: number; // paise
  totalEmployerCost: number; // paise
  payslipCount: number;
};

export type PayslipRow = {
  id: string;
  userId: string;
  fullName: string;
  loginId: string | null;
  status: PayslipStatus;
  ctcAnnual: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
  employerPf: number;
  totalWorkingDays: number;
  daysPresent: number;
  daysOnLeave: number;
  daysAbsent: number;
  daysPayable: number;
};

export type Warning = { kind: "no-bank" | "no-manager"; count: number };

export type EmployeeOption = {
  id: string;
  fullName: string;
  loginId: string | null;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type DashboardData = {
  warnings: Warning[];
  payruns: PayRunSummary[];
  employerCostByMonth: ChartPoint[];
  employerCostByYear: ChartPoint[];
  employeeCountByMonth: ChartPoint[];
  employeeCountByYear: ChartPoint[];
};
