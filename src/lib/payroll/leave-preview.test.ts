import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLeaveImpact, type SalaryInputs } from "./leave-preview";
import type { PeriodStats } from "./aggregate-period";

const rupees = (r: number): number => Math.round(r * 100);

const SALARY: SalaryInputs = {
  ctcAnnual: rupees(6_00_000), // ₹6L → ₹50k/month
  basicPercent: 0.5,
  hraPercent: 0.5,
  pfEmployeePercent: 0.12,
  pfEmployerPercent: 0.12,
  professionalTax: rupees(200),
};

const FULL_ATTENDANCE: PeriodStats = {
  totalWorkingDays: 24,
  daysPresent: 24,
  halfDays: 0,
  paidLeaves: 0,
  unpaidLeaves: 0,
  daysAbsent: 0,
};

test("paid leave: pulls from present days but keeps gross/net flat", () => {
  // 3-day paid leave on a fully attended month should not move payroll —
  // paid leaves count toward payable days the same as present.
  const { before, after } = computeLeaveImpact(SALARY, FULL_ATTENDANCE, {
    kind: "paid",
    daysInMonth: 3,
  });
  assert.equal(before.daysPayable, 24);
  assert.equal(after.daysPayable, 24, "paid leave: payable days unchanged");
  assert.equal(before.grossEarned, after.grossEarned, "gross unchanged");
  assert.equal(before.netPay, after.netPay, "net unchanged");
});

test("unpaid leave: drops days payable and net pay proportionally", () => {
  const { before, after } = computeLeaveImpact(SALARY, FULL_ATTENDANCE, {
    kind: "unpaid",
    daysInMonth: 3,
  });
  assert.equal(before.daysPayable, 24);
  assert.equal(after.daysPayable, 21, "lost 3 days of pay");
  assert.ok(after.grossEarned < before.grossEarned, "gross drops");
  assert.ok(after.netPay < before.netPay, "net drops");
  // The drop should be roughly 3/24 of monthly wage (₹50k) = ₹6,250.
  assert.equal(before.grossEarned - after.grossEarned, rupees(6_250));
});

test("unpaid leave: prefers to fill absent days first", () => {
  // 5 absent days already, leave covers 3 of them. Effective payroll
  // shouldn't change vs the "before" — the days were already not payable.
  const stats: PeriodStats = {
    totalWorkingDays: 24,
    daysPresent: 19,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
    daysAbsent: 5,
  };
  const { before, after } = computeLeaveImpact(SALARY, stats, {
    kind: "unpaid",
    daysInMonth: 3,
  });
  assert.equal(after.daysPayable, before.daysPayable);
  assert.equal(after.grossEarned, before.grossEarned);
  assert.equal(after.netPay, before.netPay);
});

test("paid leave: turning absent days into paid leave restores pay", () => {
  // 3 days already absent, employee retroactively applies as paid leave.
  const stats: PeriodStats = {
    totalWorkingDays: 24,
    daysPresent: 21,
    halfDays: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
    daysAbsent: 3,
  };
  const { before, after } = computeLeaveImpact(SALARY, stats, {
    kind: "paid",
    daysInMonth: 3,
  });
  assert.equal(before.daysPayable, 21);
  assert.equal(after.daysPayable, 24, "paid leave covers the 3 absent days");
  assert.ok(after.grossEarned > before.grossEarned, "gross recovers");
  assert.ok(after.netPay > before.netPay, "net recovers");
});

test("zero days has no effect", () => {
  const { before, after } = computeLeaveImpact(SALARY, FULL_ATTENDANCE, {
    kind: "unpaid",
    daysInMonth: 0,
  });
  assert.deepEqual(before, after);
});

test("clamps when requested days exceed total working days", () => {
  // Asking for more unpaid days than the month has shouldn't break math —
  // worst case is everything goes unpaid.
  const { before, after } = computeLeaveImpact(SALARY, FULL_ATTENDANCE, {
    kind: "unpaid",
    daysInMonth: 100,
  });
  assert.equal(before.daysPayable, 24);
  assert.equal(after.daysPayable, 0);
  assert.equal(after.grossEarned, 0);
  assert.equal(after.netPay, 0);
});
