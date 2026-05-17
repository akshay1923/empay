/**
 * Pure helpers backing `previewLeaveImpact` in src/app/actions/leave.ts.
 *
 * Kept side-effect-free so they can be unit tested without spinning up
 * Prisma/auth — the action handles the IO and feeds these the numbers.
 */
import { calculatePayroll, type PayrollOutput } from "./calculate";
import type { PeriodStats } from "./aggregate-period";

export type SalaryInputs = {
  ctcAnnual: number;
  basicPercent: number;
  hraPercent: number;
  pfEmployeePercent: number;
  pfEmployerPercent: number;
  professionalTax: number;
};

export type LeaveAddition = {
  /** "paid" if the leave will be a CASUAL/SICK/EARNED leave; "unpaid" otherwise. */
  kind: "paid" | "unpaid";
  /** How many working days inside the pay month the leave covers. Sundays excluded. */
  daysInMonth: number;
};

export type LeaveImpactPair = {
  before: PayrollOutput;
  after: PayrollOutput;
  /** Number of requested days that actually moved the math. */
  appliedDays: number;
};

/**
 * Re-bucket period stats with a prospective leave layered on top, then run
 * `calculatePayroll` both with and without it. Days in the requested range
 * "consume" buckets in priority order: absent first (because pure overdraft
 * absences are the most likely intent), then half-days, then full present.
 *
 * Approved leaves already in the period are left alone — overlap detection
 * at the form layer means a previewed leave never doubles up.
 */
export function computeLeaveImpact(
  salary: SalaryInputs,
  stats: PeriodStats,
  addition: LeaveAddition
): LeaveImpactPair {
  const before = calculatePayroll({
    ...salary,
    totalWorkingDays: stats.totalWorkingDays,
    daysPresent: stats.daysPresent,
    halfDays: stats.halfDays,
    paidLeaves: stats.paidLeaves,
    unpaidLeaves: stats.unpaidLeaves,
  });

  let remaining = Math.max(0, addition.daysInMonth);
  let daysPresent = stats.daysPresent;
  let halfDays = stats.halfDays;
  let paidLeaves = stats.paidLeaves;
  let unpaidLeaves = stats.unpaidLeaves;

  const fromAbsent = Math.min(remaining, stats.daysAbsent);
  remaining -= fromAbsent;
  const fromHalfDays = Math.min(remaining, halfDays);
  halfDays -= fromHalfDays;
  remaining -= fromHalfDays;
  const fromPresent = Math.min(remaining, daysPresent);
  daysPresent -= fromPresent;
  remaining -= fromPresent;

  const appliedDays = Math.max(0, addition.daysInMonth) - remaining;
  if (addition.kind === "paid") {
    paidLeaves += appliedDays;
  } else {
    unpaidLeaves += appliedDays;
  }

  const after = calculatePayroll({
    ...salary,
    totalWorkingDays: stats.totalWorkingDays,
    daysPresent,
    halfDays,
    paidLeaves,
    unpaidLeaves,
  });

  return { before, after, appliedDays };
}
