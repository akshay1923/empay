"use client";

import { useEffect } from "react";

type Line = { label: string; monthly: number; yearly: number };

type Employee = {
  fullName: string;
  designation: string;
  joinDate: string;
  effectiveFrom: string;
};

export function SalaryStatementPrintView({
  companyName,
  year,
  employee,
  earnings,
  deductions,
  net,
  hasStructure,
}: {
  companyName: string;
  year: number;
  employee: Employee;
  earnings: Line[];
  deductions: Line[];
  net: { monthly: number; yearly: number };
  hasStructure: boolean;
}) {
  useEffect(() => {
    if (!hasStructure) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [hasStructure]);

  return (
    <div className="report-print-root">
      <style>{styles}</style>

      <div className="sheet">
        <div className="company-row">
          <div className="company-box">{companyName}</div>
        </div>

        <h1 className="title">Salary Statement Report</h1>
        <div className="subtitle">For the year {year}</div>

        {!hasStructure ? (
          <div className="empty">
            No salary structure on record for this employee. Set one up
            from the employee detail page first.
          </div>
        ) : (
          <>
            <div className="employee-grid">
              <div>
                <div className="emp-label">Employee Name</div>
                <div className="emp-value">{employee.fullName}</div>
                <div className="emp-label mt">Designation</div>
                <div className="emp-value">{employee.designation}</div>
              </div>
              <div>
                <div className="emp-label">Date Of Joining</div>
                <div className="emp-value">{employee.joinDate}</div>
                <div className="emp-label mt">Salary Effective From</div>
                <div className="emp-value">{employee.effectiveFrom}</div>
              </div>
            </div>

            <table className="components">
              <thead>
                <tr>
                  <th className="left">Salary Components</th>
                  <th className="right">Monthly Amount</th>
                  <th className="right">Yearly Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="section-row">
                  <td colSpan={3}>Earnings</td>
                </tr>
                {earnings.map((l) => (
                  <tr key={l.label}>
                    <td className="left indent">{l.label}</td>
                    <td className="right">{formatINR(l.monthly)}</td>
                    <td className="right">{formatINR(l.yearly)}</td>
                  </tr>
                ))}

                <tr className="section-row">
                  <td colSpan={3}>Deduction</td>
                </tr>
                {deductions.map((l) => (
                  <tr key={l.label}>
                    <td className="left indent">{l.label}</td>
                    <td className="right">- {formatINR(l.monthly)}</td>
                    <td className="right">- {formatINR(l.yearly)}</td>
                  </tr>
                ))}

                <tr className="net-row">
                  <td className="left">Net Salary</td>
                  <td className="right">{formatINR(net.monthly)}</td>
                  <td className="right">{formatINR(net.yearly)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
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

const styles = `
.report-print-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #f5f3ee;
  overflow: auto;
  padding: 24px;
  color: #111;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.report-print-root .sheet {
  background: #ffffff;
  max-width: 880px;
  margin: 0 auto;
  border: 1px solid #e3dfd6;
  border-radius: 12px;
  padding: 28px 36px 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.report-print-root .company-row {
  border-bottom: 1px solid #d8c0d0;
  padding-bottom: 14px;
  margin-bottom: 18px;
}
.report-print-root .company-box {
  display: inline-block;
  font-size: 14px;
  color: #555;
}
.report-print-root .title {
  font-size: 22px;
  font-weight: 600;
  color: #714B67;
  margin: 0 0 4px 0;
}
.report-print-root .subtitle {
  font-size: 12px;
  color: #999;
  margin-bottom: 22px;
}

.report-print-root .empty {
  padding: 40px 0;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.report-print-root .employee-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding-bottom: 18px;
  margin-bottom: 8px;
  border-bottom: 1px solid #ece7e2;
}
.report-print-root .emp-label {
  font-size: 12px;
  color: #714B67;
  font-weight: 500;
}
.report-print-root .emp-label.mt { margin-top: 10px; }
.report-print-root .emp-value {
  font-size: 14px;
  color: #111;
  margin-top: 2px;
}

.report-print-root table.components {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.report-print-root table.components th {
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #714B67;
  padding: 12px 14px;
  border-bottom: 1px solid #ece7e2;
}
.report-print-root table.components th.right { text-align: right; }
.report-print-root table.components td {
  font-size: 13px;
  padding: 9px 14px;
  border-bottom: 1px solid #f4efe9;
}
.report-print-root table.components td.left { text-align: left; }
.report-print-root table.components td.right { text-align: right; }
.report-print-root table.components td.indent { padding-left: 26px; }

.report-print-root .section-row td {
  font-weight: 600;
  color: #714B67;
  background: #fbf7f4;
  padding-top: 12px;
  padding-bottom: 8px;
  font-size: 14px;
}

.report-print-root .net-row td {
  font-weight: 600;
  color: #017E84;
  font-size: 14px;
  border-top: 2px solid #017E84;
  padding-top: 14px;
  padding-bottom: 14px;
  background: #f6fbfb;
}

@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #ffffff !important; }
  body > * { visibility: hidden; }
  .report-print-root, .report-print-root * { visibility: visible; }
  .report-print-root {
    position: static;
    padding: 0;
    background: #ffffff;
  }
  .report-print-root .sheet {
    border: none;
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }
}
`;
