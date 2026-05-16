"use client";

import { useEffect } from "react";

type Slip = {
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  employerPf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
  totalWorkingDays: number;
  daysPresent: number;
  daysOnLeave: number;
  daysAbsent: number;
  daysPayable: number;
};

type Employee = {
  fullName: string;
  employeeCode: string | null;
  loginId: string | null;
  department: string | null;
  designation: string | null;
  address: string | null;
  panNumber: string | null;
  uanNumber: string | null;
  accountNumber: string | null;
  joinDate: string | null;
};

type PayRun = {
  month: number;
  year: number;
  periodStartDDMMYYYY: string;
  periodEndDDMMYYYY: string;
  payDateDDMMYYYY: string;
  monthLabel: string;
};

export function PayslipPrintView({
  slip,
  employee,
  payRun,
  companyName,
}: {
  slip: Slip;
  employee: Employee;
  payRun: PayRun;
  companyName: string;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  const unpaidDays = Math.max(
    0,
    slip.totalWorkingDays - slip.daysPayable
  );
  const paidLeaveDays = Math.max(
    0,
    slip.daysPayable - slip.daysPresent
  );

  return (
    <div className="payslip-print-root">
      <style>{styles}</style>

      <div className="sheet">
        <div className="logo-row">
          <div className="logo-box">{companyName}</div>
        </div>

        <h1 className="title">
          Salary slip for month of {payRun.monthLabel}
        </h1>

        <div className="info-card">
          <div className="info-col">
            <Info label="Employee name" value={employee.fullName} />
            <Info
              label="Employee Code"
              value={employee.employeeCode ?? employee.loginId ?? "—"}
            />
            <Info label="Department" value={employee.department ?? "—"} />
            <Info label="Location" value={employee.address ?? "—"} />
            <Info
              label="Date of joining"
              value={employee.joinDate ?? "—"}
            />
          </div>
          <div className="info-col">
            <Info label="PAN" value={maskPan(employee.panNumber)} />
            <Info label="UAN" value={employee.uanNumber ?? "—"} />
            <Info
              label="Bank A/c NO."
              value={employee.accountNumber ?? "—"}
            />
            <Info
              label="Pay period"
              value={`${payRun.periodStartDDMMYYYY} to ${payRun.periodEndDDMMYYYY}`}
            />
            <Info label="Pay date" value={payRun.payDateDDMMYYYY} />
          </div>
        </div>

        <table className="days-table">
          <thead>
            <tr>
              <th className="left">Worked Days</th>
              <th className="right">Number of Days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="left">Attendance</td>
              <td className="right">{fmtDays(slip.daysPresent)} Days</td>
            </tr>
            {paidLeaveDays > 0 && (
              <tr>
                <td className="left">Paid leaves</td>
                <td className="right">{fmtDays(paidLeaveDays)} Days</td>
              </tr>
            )}
            {unpaidDays > 0 && (
              <tr>
                <td className="left muted">Unpaid / Absent</td>
                <td className="right muted">{fmtDays(unpaidDays)} Days</td>
              </tr>
            )}
            <tr className="total-row">
              <td className="left">Total payable</td>
              <td className="right">{fmtDays(slip.daysPayable)} Days</td>
            </tr>
          </tbody>
        </table>

        <table className="amounts-table">
          <thead>
            <tr>
              <th className="left">Earnings</th>
              <th className="right">Amounts</th>
              <th className="left">Deductions</th>
              <th className="right">Amounts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="left">Basic Salary</td>
              <td className="right">{formatINR(slip.basic)}</td>
              <td className="left">PF Employee</td>
              <td className="right">- {formatINR(slip.employeePf)}</td>
            </tr>
            <tr>
              <td className="left">House Rent Allowance</td>
              <td className="right">{formatINR(slip.hra)}</td>
              <td className="left">PF Employer</td>
              <td className="right">- {formatINR(slip.employerPf)}</td>
            </tr>
            <tr>
              <td className="left">Allowances</td>
              <td className="right">{formatINR(slip.specialAllowance)}</td>
              <td className="left">Professional Tax</td>
              <td className="right">- {formatINR(slip.professionalTax)}</td>
            </tr>
            <tr>
              <td className="left muted-note" colSpan={2}>
                Standard + Performance + LTA + Fixed
              </td>
              <td className="left">TDS Deduction</td>
              <td className="right">- {formatINR(0)}</td>
            </tr>
            <tr className="gross-row">
              <td className="left">Gross</td>
              <td className="right">{formatINR(slip.grossEarned)}</td>
              <td className="left">Total Deductions</td>
              <td className="right">- {formatINR(slip.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <div className="footer-row">
          <div className="footer-label">
            <strong>Total Net Payable</strong>{" "}
            <span className="muted">(Gross Earning - Total Deductions)</span>
          </div>
          <div className="footer-amount">
            <div className="amount-value">{formatINR(slip.netPay)}</div>
            <div className="amount-words">{rupeesInWords(slip.netPay)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-sep">:</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function maskPan(pan: string | null): string {
  if (!pan) return "—";
  if (pan.length < 6) return pan;
  return pan.slice(0, 4) + "x".repeat(Math.max(0, pan.length - 5)) + pan.slice(-1);
}

function fmtDays(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function formatINR(paise: number): string {
  return (
    "₹ " +
    (paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function rupeesInWords(paise: number): string {
  const rupees = Math.round(paise / 100);
  if (rupees === 0) return "Zero Rupees only";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const sub = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + sub(n % 100) : "")
    );
  };
  let n = rupees;
  let out = "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) out += sub(crore) + " Crore ";
  if (lakh) out += sub(lakh) + " Lakh ";
  if (thousand) out += sub(thousand) + " Thousand ";
  if (n) out += sub(n);
  return out.trim() + " Rupees only";
}

const styles = `
.payslip-print-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #f5f3ee;
  overflow: auto;
  padding: 24px;
  color: #111;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.payslip-print-root .sheet {
  background: #ffffff;
  max-width: 880px;
  margin: 0 auto;
  border: 1px solid #e3dfd6;
  border-radius: 12px;
  padding: 28px 32px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.payslip-print-root .logo-row {
  border-bottom: 1px solid #017E84;
  padding-bottom: 16px;
  margin-bottom: 16px;
}
.payslip-print-root .logo-box {
  display: inline-block;
  border: 1px solid #c9c3b8;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 14px;
  color: #555;
  background: #fafaf7;
}
.payslip-print-root .title {
  font-size: 22px;
  font-weight: 600;
  color: #017E84;
  margin: 0 0 18px 0;
}
.payslip-print-root .info-card {
  border: 1px solid #017E84;
  border-radius: 12px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 18px;
}
.payslip-print-root .info-col { display: flex; flex-direction: column; gap: 8px; }
.payslip-print-root .info-row {
  display: grid;
  grid-template-columns: 130px 12px 1fr;
  gap: 6px;
  font-size: 13px;
  color: #714B67;
}
.payslip-print-root .info-label { font-weight: 500; }
.payslip-print-root .info-sep { color: #714B67; }
.payslip-print-root .info-value { color: #111; }

.payslip-print-root table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.payslip-print-root th { font-size: 14px; font-weight: 600; padding: 12px 14px; }
.payslip-print-root td { font-size: 13px; padding: 10px 14px; }
.payslip-print-root th.left, .payslip-print-root td.left { text-align: left; }
.payslip-print-root th.right, .payslip-print-root td.right { text-align: right; }

.payslip-print-root .days-table thead th {
  background: #e9d6e3;
  color: #4a2f44;
  border: 1px solid #d8c0d0;
  border-radius: 0;
}
.payslip-print-root .days-table thead tr th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
.payslip-print-root .days-table thead tr th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
.payslip-print-root .days-table tbody td { color: #714B67; border-bottom: 1px solid #ece7e2; }
.payslip-print-root .days-table tbody tr:last-child td { border-bottom: 0; }
.payslip-print-root .days-table .total-row td { color: #017E84; font-weight: 600; }
.payslip-print-root .days-table .muted { color: #999; }

.payslip-print-root .amounts-table thead th {
  background: #e9d6e3;
  color: #4a2f44;
  border: 1px solid #d8c0d0;
}
.payslip-print-root .amounts-table thead tr th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
.payslip-print-root .amounts-table thead tr th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
.payslip-print-root .amounts-table tbody td { border-bottom: 1px solid #f1ede7; }
.payslip-print-root .amounts-table tbody tr:last-child td { border-bottom: 0; }
.payslip-print-root .amounts-table .gross-row td { font-weight: 600; background: #fbf8f1; }
.payslip-print-root .muted-note { font-size: 11px; color: #999; padding-top: 0; padding-bottom: 8px; }

.payslip-print-root .footer-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  align-items: stretch;
}
.payslip-print-root .footer-label {
  background: #e9d6e3;
  border-radius: 10px;
  padding: 18px 20px;
  font-size: 16px;
  color: #4a2f44;
}
.payslip-print-root .footer-label strong { font-weight: 600; }
.payslip-print-root .footer-label .muted { color: #6b4961; font-size: 12px; margin-left: 6px; }
.payslip-print-root .footer-amount {
  background: #b8e1e1;
  color: #014e52;
  border-radius: 10px;
  padding: 14px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.payslip-print-root .amount-value { font-size: 18px; font-weight: 600; }
.payslip-print-root .amount-words { font-size: 11px; margin-top: 4px; }

@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #ffffff !important; }
  body > * { visibility: hidden; }
  .payslip-print-root, .payslip-print-root * { visibility: visible; }
  .payslip-print-root {
    position: static;
    padding: 0;
    background: #ffffff;
  }
  .payslip-print-root .sheet {
    border: none;
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }
}
`;
