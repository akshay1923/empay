import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePayroll } from "./calculate";

// All amounts are paise. Helpers to keep the test readable.
const rupees = (r: number): number => Math.round(r * 100);
const PF_CEILING = rupees(15_000);

const STANDARD = {
  basicPercent: 0.5,
  hraPercent: 0.4, // % of basic — matches docs/payroll-formulas.md (HRA = 40% of basic)
  pfEmployeePercent: 0.12,
  pfEmployerPercent: 0.12,
  professionalTax: rupees(200),
};

test("full month, full attendance — round numbers", () => {
  const out = calculatePayroll({
    ctcAnnual: rupees(12_00_000), // ₹12L
    ...STANDARD,
    totalWorkingDays: 25,
    daysPresent: 25,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });

  assert.equal(out.basic, rupees(50_000), "basic = 50% of monthly wage");
  assert.equal(out.hra, rupees(20_000), "hra = 40% of basic");
  assert.equal(
    out.specialAllowance,
    rupees(30_000),
    "special = monthly_wage - basic - hra"
  );
  assert.equal(out.grossEarned, rupees(1_00_000), "gross = monthly wage");
  assert.equal(
    out.employeePf,
    rupees(1_800),
    "PF capped at 12% of ₹15,000 basic"
  );
  assert.equal(out.employerPf, rupees(1_800));
  assert.equal(out.professionalTax, rupees(200));
  assert.equal(out.totalDeductions, rupees(2_000));
  assert.equal(out.netPay, rupees(98_000));
  assert.equal(out.daysPayable, 25);
});

test("half-month attendance prorates linearly", () => {
  const out = calculatePayroll({
    ctcAnnual: rupees(12_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 13,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });

  assert.equal(out.daysPayable, 13);
  assert.equal(out.basic, rupees(25_000), "basic prorated to 13/26");
  assert.equal(out.hra, rupees(10_000));
  assert.equal(out.specialAllowance, rupees(15_000));
  assert.equal(out.grossEarned, rupees(50_000));
});

test("paid leaves count toward payable days, unpaid don't", () => {
  // 22 present + 2 paid + 2 unpaid = 24 payable out of 26.
  const paidIncluded = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 22,
    halfDays: 0,
    paidLeaves: 2,
    unpaidLeaves: 2,
  });
  assert.equal(paidIncluded.daysPayable, 24);

  // Same day counts but unpaid swapped to absent — should match.
  const unpaidEqualsAbsent = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 22,
    halfDays: 0,
    paidLeaves: 2,
    unpaidLeaves: 0, // input.unpaidLeaves is informational; not used in payable math
  });
  assert.equal(unpaidEqualsAbsent.daysPayable, paidIncluded.daysPayable);
  assert.equal(unpaidEqualsAbsent.grossEarned, paidIncluded.grossEarned);
});

test("half-days count as 0.5 toward payable days", () => {
  const out = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 24,
    halfDays: 2, // 2 × 0.5 = 1
    paidLeaves: 0,
    unpaidLeaves: 0,
  });
  assert.equal(out.daysPayable, 25, "24 full + 2 half = 25 payable");
});

test("PF respects ₹15,000 statutory ceiling", () => {
  // High basic — earned basic well above the cap; PF stays pinned.
  const high = calculatePayroll({
    ctcAnnual: rupees(24_00_000),
    ...STANDARD,
    totalWorkingDays: 25,
    daysPresent: 25,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });
  assert.equal(high.basic, rupees(1_00_000));
  assert.equal(
    high.employeePf,
    Math.round(PF_CEILING * 0.12),
    "PF capped, not 12% of full basic"
  );

  // Low basic — earned basic below the cap; PF tracks actual basic.
  const low = calculatePayroll({
    ctcAnnual: rupees(1_20_000), // ₹10k/month, basic = ₹5k
    ...STANDARD,
    totalWorkingDays: 25,
    daysPresent: 25,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });
  assert.equal(low.basic, rupees(5_000));
  assert.equal(low.employeePf, Math.round(rupees(5_000) * 0.12));
});

test("zero days worked — payslip generates with zeros", () => {
  const out = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 0,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 26,
  });

  assert.equal(out.daysPayable, 0);
  assert.equal(out.basic, 0);
  assert.equal(out.hra, 0);
  assert.equal(out.specialAllowance, 0);
  assert.equal(out.grossEarned, 0);
  assert.equal(out.employeePf, 0, "no basic → no PF");
  // PT is flat (and tested below); netPay clamps at 0 even when PT > gross.
  assert.equal(out.netPay, 0);
});

test("totalWorkingDays = 0 doesn't divide-by-zero", () => {
  const out = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 0,
    daysPresent: 0,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });
  assert.equal(out.basic, 0);
  assert.equal(out.grossEarned, 0);
  assert.equal(out.perDayRate, 0);
});

test("professional tax is flat — independent of attendance", () => {
  const full = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 26,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });
  const half = calculatePayroll({
    ctcAnnual: rupees(6_00_000),
    ...STANDARD,
    totalWorkingDays: 26,
    daysPresent: 13,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 13,
  });
  assert.equal(full.professionalTax, half.professionalTax);
  assert.equal(full.professionalTax, rupees(200));
});

test("netPay = gross - (employeePf + PT); employerPf is informational", () => {
  const out = calculatePayroll({
    ctcAnnual: rupees(12_00_000),
    ...STANDARD,
    totalWorkingDays: 25,
    daysPresent: 25,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
  });
  assert.equal(out.totalDeductions, out.employeePf + out.professionalTax);
  assert.equal(out.netPay, out.grossEarned - out.totalDeductions);
  // Employer PF is a cost-to-company line item, NOT subtracted from net.
  assert.notEqual(
    out.netPay,
    out.grossEarned - out.totalDeductions - out.employerPf
  );
});
