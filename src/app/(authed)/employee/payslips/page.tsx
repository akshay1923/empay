import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { decryptPayslipMoney } from "@/lib/crypto/payroll";
import { FileText, Download } from "lucide-react";

export default async function PayslipsPage() {
  const session = await auth();
  if (!session) return null;

  const rows = await prisma.payslip.findMany({
    where: { userId: session.user.id },
    include: { payRun: true },
    orderBy: [{ payRun: { year: "desc" } }, { payRun: { month: "desc" } }],
  });
  const payslips = rows.map((r) => decryptPayslipMoney(r));

  return (
    <div className="space-y-7">
      <div>
        <div className="text-eyebrow mb-1">Payroll</div>
        <h1 className="h-display-m">Payslips</h1>
        <p className="text-[14px] mt-2" style={{ color: "var(--fg-muted)" }}>
          A monthly record of what you earned, what was deducted, and what
          landed in your account — generated from your attendance and approved
          leaves.
        </p>
      </div>

      {payslips.length === 0 ? (
        <div className="card p-10 text-center">
          <div
            className="h-10 w-10 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}
          >
            <FileText size={18} />
          </div>
          <div className="text-[14px] font-medium mb-1">No payslips yet</div>
          <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
            Once Payroll runs for a month that includes you, your payslip will
            appear here.
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "var(--bg-soft)" }}>
                  <Th>Month</Th>
                  <Th align="right">Days</Th>
                  <Th align="right">Gross</Th>
                  <Th align="right">Deductions</Th>
                  <Th align="right">Net pay</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border-hairline)" }}>
                    <td className="px-6 py-3.5">
                      <div className="font-medium">
                        {monthLabel(p.payRun.month)} {p.payRun.year}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                        Generated {p.generatedAt.toLocaleDateString("en-IN")}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums">
                      {p.daysPayable} / {p.totalWorkingDays}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums">
                      {formatINR(p.grossEarned)}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums" style={{ color: "var(--fg-muted)" }}>
                      −{formatINR(p.totalDeductions)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium tabular-nums">
                      {formatINR(p.netPay)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <a
                        href={`/payslips/${p.id}/print`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        title="Open the printable payslip and save as PDF"
                      >
                        <Download size={13} />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className="px-6 py-3 text-[11px] uppercase font-medium"
      style={{
        color: "var(--fg-muted)",
        textAlign: align,
        letterSpacing: "0.06em",
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function monthLabel(m: number) {
  return new Date(2025, m - 1, 1).toLocaleDateString("en-IN", { month: "long" });
}
