import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildEcrFile,
  buildEcrRow,
  formatEcrRow,
  ecrFileName,
} from "./ecr";

const rupees = (r: number): number => Math.round(r * 100);

test("standard high-basic row pins EPF wages at ₹15k and EPS at ₹1,250", () => {
  const row = buildEcrRow({
    uan: "100123456789",
    fullName: "Anika Sharma",
    basicPaise: rupees(50_000), // basic well above ceiling
    grossEarnedPaise: rupees(1_00_000),
    employeePfPaise: rupees(1_800), // 12% of capped 15k
    employerPfPaise: rupees(1_800),
    ncpDays: 0,
  });
  assert.equal(row.epfWages, 15_000, "EPF wages capped at statutory ceiling");
  assert.equal(row.epsWages, 15_000);
  assert.equal(row.edliWages, 15_000);
  assert.equal(row.employeeEpf, 1_800);
  assert.equal(row.employerEps, 1_250, "EPS hits the ₹1,250 cap");
  assert.equal(row.employerEpfDiff, 550, "Employer EPF = 1800 − 1250 EPS");
  assert.equal(
    row.employeeEpf + row.employerEps + row.employerEpfDiff,
    1_800 + 1_800,
    "columns 7+8+9 reconcile to total PF on the payslip"
  );
});

test("low-basic row tracks actual basic, EPS proportional", () => {
  const row = buildEcrRow({
    uan: "100123456789",
    fullName: "Junior Hire",
    basicPaise: rupees(5_000),
    grossEarnedPaise: rupees(10_000),
    employeePfPaise: rupees(600),
    employerPfPaise: rupees(600),
    ncpDays: 0,
  });
  assert.equal(row.epfWages, 5_000, "below ceiling — actual basic");
  assert.equal(row.employerEps, Math.round(5_000 * 0.0833), "EPS = 8.33%");
  // Diff is computed by subtraction so the row reconciles even when
  // independent rounding would drift.
  assert.equal(row.employerEpfDiff, 600 - row.employerEps);
});

test("name is uppercased, sanitized, and length-capped", () => {
  const row = buildEcrRow({
    uan: "100123456789",
    fullName: "Rohit O'Brien-Khanna",
    basicPaise: rupees(20_000),
    grossEarnedPaise: rupees(20_000),
    employeePfPaise: rupees(1_800),
    employerPfPaise: rupees(1_800),
    ncpDays: 0,
  });
  assert.equal(
    row.name,
    "ROHIT OBRIENKHANNA",
    "punctuation stripped, uppercased"
  );
});

test("NCP days passed through, fractional values floor to integer", () => {
  const row = buildEcrRow({
    uan: "100123456789",
    fullName: "Test",
    basicPaise: rupees(15_000),
    grossEarnedPaise: rupees(15_000),
    employeePfPaise: rupees(1_800),
    employerPfPaise: rupees(1_800),
    ncpDays: 3.5, // half-days don't count to NCP, but float-safe
  });
  assert.equal(row.ncpDays, 3);
});

test("formatEcrRow produces 11 fields separated by '#~#'", () => {
  const row = buildEcrRow({
    uan: "100123456789",
    fullName: "A",
    basicPaise: rupees(15_000),
    grossEarnedPaise: rupees(15_000),
    employeePfPaise: rupees(1_800),
    employerPfPaise: rupees(1_800),
    ncpDays: 0,
  });
  const line = formatEcrRow(row);
  const parts = line.split("#~#");
  assert.equal(parts.length, 11, "11 fields per ECR row");
  // First field is the UAN, last is refunds = 0
  assert.equal(parts[0], "100123456789");
  assert.equal(parts[10], "0");
});

test("buildEcrFile skips invalid UANs with a clear reason", () => {
  const result = buildEcrFile([
    {
      uan: "100123456789",
      fullName: "Valid",
      basicPaise: rupees(15_000),
      grossEarnedPaise: rupees(15_000),
      employeePfPaise: rupees(1_800),
      employerPfPaise: rupees(1_800),
      ncpDays: 0,
    },
    {
      uan: null,
      fullName: "No Uan",
      basicPaise: rupees(15_000),
      grossEarnedPaise: rupees(15_000),
      employeePfPaise: rupees(1_800),
      employerPfPaise: rupees(1_800),
      ncpDays: 0,
    },
    {
      uan: "ABC123",
      fullName: "Bad Format",
      basicPaise: rupees(15_000),
      grossEarnedPaise: rupees(15_000),
      employeePfPaise: rupees(1_800),
      employerPfPaise: rupees(1_800),
      ncpDays: 0,
    },
  ]);
  assert.equal(result.rowCount, 1, "only the valid UAN row makes it in");
  assert.equal(result.skipped.length, 2);
  assert.match(result.skipped[0]!.reason, /No UAN/);
  assert.match(result.skipped[1]!.reason, /must be exactly 12 digits/);
});

test("buildEcrFile body has one line per member, trailing newline", () => {
  const result = buildEcrFile([
    {
      uan: "100123456789",
      fullName: "Emp One",
      basicPaise: rupees(15_000),
      grossEarnedPaise: rupees(15_000),
      employeePfPaise: rupees(1_800),
      employerPfPaise: rupees(1_800),
      ncpDays: 0,
    },
    {
      uan: "100123456790",
      fullName: "Emp Two",
      basicPaise: rupees(15_000),
      grossEarnedPaise: rupees(15_000),
      employeePfPaise: rupees(1_800),
      employerPfPaise: rupees(1_800),
      ncpDays: 0,
    },
  ]);
  const lines = result.fileBody.trimEnd().split("\n");
  assert.equal(lines.length, 2);
  assert.ok(result.fileBody.endsWith("\n"), "file ends with a newline");
});

test("buildEcrFile totals reconcile (challan = sum of cols 7+8+9 across rows)", () => {
  const rows = [15_000, 12_000, 30_000].map((rs) => ({
    uan: "100000000000",
    fullName: "X",
    basicPaise: rupees(rs),
    grossEarnedPaise: rupees(rs * 2),
    employeePfPaise: rupees(Math.min(rs, 15_000) * 0.12),
    employerPfPaise: rupees(Math.min(rs, 15_000) * 0.12),
    ncpDays: 0,
  }));
  // All rows have unique UANs to actually pass through:
  rows.forEach((r, i) => {
    r.uan = `10000000000${i}`;
  });
  const result = buildEcrFile(rows);
  assert.equal(
    result.totals.challanTotal,
    result.totals.employeeEpf +
      result.totals.employerEps +
      result.totals.employerEpfDiff,
    "challan total is the sum of cols 7+8+9"
  );
});

test("empty input — empty file body, no exceptions", () => {
  const result = buildEcrFile([]);
  assert.equal(result.fileBody, "");
  assert.equal(result.rowCount, 0);
  assert.equal(result.skipped.length, 0);
});

test("ecrFileName uses zero-padded month", () => {
  assert.equal(ecrFileName(4, 2026), "ECR_2026-04.txt");
  assert.equal(ecrFileName(12, 2026), "ECR_2026-12.txt");
});
