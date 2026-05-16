/** All money in this module is in paise (₹ × 100) to match the schema. */

export type SalaryPercents = {
  basicPercent: number;
  hraPercent: number;
  standardAllowancePercent: number;
  performanceBonusPercent: number;
  ltaPercent: number;
  pfEmployeePercent: number;
  pfEmployerPercent: number;
  professionalTax: number; // paise/month, flat
};

export type ComputedSalary = {
  monthWage: number;
  basic: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  // % of monthly wage shown in the right column of the form
  basicPctOfWage: number;
  hraPctOfBasic: number;
  standardPctOfBasic: number;
  performancePctOfBasic: number;
  ltaPctOfBasic: number;
  fixedPctOfBasic: number;
};

export function computeSalary(
  monthWage: number,
  p: SalaryPercents
): ComputedSalary {
  const basic = Math.round(monthWage * p.basicPercent);
  const hra = Math.round(basic * p.hraPercent);
  const standardAllowance = Math.round(basic * p.standardAllowancePercent);
  const performanceBonus = Math.round(basic * p.performanceBonusPercent);
  const lta = Math.round(basic * p.ltaPercent);
  const sumOthers =
    basic + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = Math.max(0, monthWage - sumOthers);

  const pfEmployee = Math.round(basic * p.pfEmployeePercent);
  const pfEmployer = Math.round(basic * p.pfEmployerPercent);

  const safeBasic = basic === 0 ? 1 : basic;

  return {
    monthWage,
    basic,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    pfEmployee,
    pfEmployer,
    professionalTax: p.professionalTax,
    basicPctOfWage: monthWage === 0 ? 0 : basic / monthWage,
    hraPctOfBasic: hra / safeBasic,
    standardPctOfBasic: standardAllowance / safeBasic,
    performancePctOfBasic: performanceBonus / safeBasic,
    ltaPctOfBasic: lta / safeBasic,
    fixedPctOfBasic: fixedAllowance / safeBasic,
  };
}

export const paiseToRupees = (p: number): number => p / 100;
export const rupeesToPaise = (r: number): number => Math.round(r * 100);

export const fmtINR = (rupees: number): string =>
  rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtPct = (frac: number): string =>
  (frac * 100).toFixed(2) + "%";
