/**
 * Pure payroll calculation. All amounts are paise (integers).
 *
 * Model (matches the user's "Salary Info" tab):
 *   monthly_wage  = ctcAnnual / 12
 *   basic         = monthly_wage × basicPercent           (default 50%)
 *   hra           = basic × hraPercent                    (default 50% of basic)
 *   special_full  = monthly_wage − basic − hra            (residual; collapses
 *                                                          standard / performance / LTA /
 *                                                          fixed allowances)
 *
 *   ratio         = (days_present + half_days*0.5 + paid_leaves) / total_working_days
 *
 *   earned_basic  = full_basic   × ratio
 *   earned_hra    = full_hra     × ratio
 *   earned_special= special_full × ratio
 *   gross_earned  = earned_basic + earned_hra + earned_special
 *
 *   pf_eligible_basic = min(earned_basic, ₹15,000) — statutory PF ceiling
 *   employee_pf       = pf_eligible_basic × pfEmployeePercent
 *   employer_pf       = pf_eligible_basic × pfEmployerPercent  // informational
 *   professional_tax  = flat (paise) — Maharashtra default ₹200
 *
 *   total_deductions  = employee_pf + professional_tax
 *   net_pay           = gross_earned − total_deductions
 */

const PF_BASIC_CEILING_PAISE = 15_000_00; // ₹15,000

export type PayrollInput = {
  ctcAnnual: number; // paise
  basicPercent: number;
  hraPercent: number;
  pfEmployeePercent: number;
  pfEmployerPercent: number;
  professionalTax: number; // paise/month
  totalWorkingDays: number;
  daysPresent: number;
  halfDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
};

export type PayrollOutput = {
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
  employerPf: number;
  daysPayable: number;
  perDayRate: number;
};

export function calculatePayroll(input: PayrollInput): PayrollOutput {
  const monthlyWage = Math.round(input.ctcAnnual / 12);

  const fullBasic = Math.round(monthlyWage * input.basicPercent);
  const fullHra = Math.round(fullBasic * input.hraPercent);
  const fullSpecial = Math.max(0, monthlyWage - fullBasic - fullHra);

  const daysPayable =
    input.daysPresent + input.halfDays * 0.5 + input.paidLeaves;
  const ratio =
    input.totalWorkingDays === 0 ? 0 : daysPayable / input.totalWorkingDays;

  const basic = Math.round(fullBasic * ratio);
  const hra = Math.round(fullHra * ratio);
  const specialAllowance = Math.round(fullSpecial * ratio);
  const grossEarned = basic + hra + specialAllowance;

  const pfEligibleBasic = Math.min(basic, PF_BASIC_CEILING_PAISE);
  const employeePf = Math.round(pfEligibleBasic * input.pfEmployeePercent);
  const employerPf = Math.round(pfEligibleBasic * input.pfEmployerPercent);

  // Professional tax is flat — same regardless of attendance.
  const professionalTax = input.professionalTax;

  const totalDeductions = employeePf + professionalTax;
  const netPay = Math.max(0, grossEarned - totalDeductions);

  return {
    basic,
    hra,
    specialAllowance,
    grossEarned,
    employeePf,
    professionalTax,
    totalDeductions,
    netPay,
    employerPf,
    daysPayable,
    perDayRate:
      input.totalWorkingDays === 0
        ? 0
        : Math.round(monthlyWage / input.totalWorkingDays),
  };
}
