/**
 * Electronic Challan-cum-Return (ECR 2.0) formatter.
 *
 * Spec: EPFO Unified Portal — pipe-style file with `#~#` between fields,
 * one row per member, integer rupees throughout. See docs/ecr-format.md
 * for the full mentor walkthrough.
 *
 * This module is pure: it takes already-decrypted payslip data plus per-row
 * NCP days (re-aggregated from attendance), and returns the file body. The
 * route handler at /api/ecr/[payRunId] handles auth + DB + decryption.
 */
const PF_WAGE_CEILING_RUPEES = 15_000;
const EPS_RATE = 0.0833;
const EPS_CAP_RUPEES = 1_250; // 15,000 × 8.33% rounded up to whole rupee
const FIELD_SEP = "#~#";
const LINE_SEP = "\n";

export type EcrInputRow = {
  uan: string | null;
  fullName: string;
  // All values in PAISE; we round to rupees inside the formatter so the
  // caller never has to think about the integer-rupee constraint.
  basicPaise: number;
  grossEarnedPaise: number;
  employeePfPaise: number;
  employerPfPaise: number;
  ncpDays: number;
};

export type EcrSkipped = { fullName: string; reason: string };

export type EcrOutputRow = {
  uan: string;
  name: string;
  grossWages: number;
  epfWages: number;
  epsWages: number;
  edliWages: number;
  employeeEpf: number;
  employerEps: number;
  employerEpfDiff: number;
  ncpDays: number;
  refundOfAdvances: number;
};

const paiseToRupees = (paise: number): number => Math.round(paise / 100);

// EPFO ECR 2.0 only accepts ASCII A–Z, 0–9 and a few separators in the name
// field. Strip everything else and uppercase.
function sanitizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 .]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 85);
}

function isValidUan(uan: string | null): uan is string {
  if (!uan) return false;
  return /^\d{12}$/.test(uan.trim());
}

export function buildEcrRow(input: EcrInputRow): EcrOutputRow {
  // PF-eligible basic, capped at the statutory ceiling.
  const epfWages = Math.min(paiseToRupees(input.basicPaise), PF_WAGE_CEILING_RUPEES);
  const epsWages = epfWages;
  const edliWages = epfWages;

  const grossWages = paiseToRupees(input.grossEarnedPaise);
  const employeeEpf = paiseToRupees(input.employeePfPaise);
  const employerTotal = paiseToRupees(input.employerPfPaise);

  // EPS is statutory at 8.33% of EPS wages, capped at ₹1,250 (the cap is
  // 15,000 × 8.33% rounded up).
  const employerEps = Math.min(Math.round(epsWages * EPS_RATE), EPS_CAP_RUPEES);

  // Whatever's left of the employer's 12% goes to the EPF account (the
  // 3.67% portion). Use subtraction so column 7 + 8 + 9 reconciles to the
  // payslip's total contribution exactly, even with rounding edge cases.
  const employerEpfDiff = Math.max(0, employerTotal - employerEps);

  return {
    uan: (input.uan ?? "").trim(),
    name: sanitizeName(input.fullName),
    grossWages,
    epfWages,
    epsWages,
    edliWages,
    employeeEpf,
    employerEps,
    employerEpfDiff,
    ncpDays: Math.max(0, Math.floor(input.ncpDays)),
    refundOfAdvances: 0, // EmPay doesn't track PF advances yet
  };
}

export function formatEcrRow(row: EcrOutputRow): string {
  return [
    row.uan,
    row.name,
    row.grossWages,
    row.epfWages,
    row.epsWages,
    row.edliWages,
    row.employeeEpf,
    row.employerEps,
    row.employerEpfDiff,
    row.ncpDays,
    row.refundOfAdvances,
  ].join(FIELD_SEP);
}

export type EcrResult = {
  fileBody: string;
  rowCount: number;
  skipped: EcrSkipped[];
  totals: {
    grossWages: number;
    epfWages: number;
    employeeEpf: number;
    employerEps: number;
    employerEpfDiff: number;
    challanTotal: number; // employeeEpf + employerEps + employerEpfDiff
  };
};

/**
 * Build the full ECR file. Employees without a valid 12-digit UAN are
 * skipped with a reason — EPFO rejects rows with bad UANs, so we bail
 * before producing them.
 */
export function buildEcrFile(rows: EcrInputRow[]): EcrResult {
  const out: EcrOutputRow[] = [];
  const skipped: EcrSkipped[] = [];

  for (const r of rows) {
    if (!isValidUan(r.uan)) {
      skipped.push({
        fullName: r.fullName,
        reason: r.uan
          ? `Invalid UAN: "${r.uan}" (must be exactly 12 digits)`
          : "No UAN on file",
      });
      continue;
    }
    out.push(buildEcrRow(r));
  }

  const fileBody = out.map(formatEcrRow).join(LINE_SEP) + (out.length > 0 ? LINE_SEP : "");

  const totals = out.reduce(
    (acc, r) => ({
      grossWages: acc.grossWages + r.grossWages,
      epfWages: acc.epfWages + r.epfWages,
      employeeEpf: acc.employeeEpf + r.employeeEpf,
      employerEps: acc.employerEps + r.employerEps,
      employerEpfDiff: acc.employerEpfDiff + r.employerEpfDiff,
      challanTotal:
        acc.challanTotal + r.employeeEpf + r.employerEps + r.employerEpfDiff,
    }),
    {
      grossWages: 0,
      epfWages: 0,
      employeeEpf: 0,
      employerEps: 0,
      employerEpfDiff: 0,
      challanTotal: 0,
    }
  );

  return { fileBody, rowCount: out.length, skipped, totals };
}

export function ecrFileName(month: number, year: number): string {
  const mm = String(month).padStart(2, "0");
  return `ECR_${year}-${mm}.txt`;
}
