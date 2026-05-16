import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { decryptPayslipMoney } from "@/lib/crypto/payroll";
import { aggregateAttendanceForPeriod } from "@/lib/payroll/aggregate-period";
import { buildEcrFile, ecrFileName, type EcrInputRow } from "@/lib/payroll/ecr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ payRunId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payRunId } = await params;

  const payRun = await prisma.payRun.findUnique({
    where: { id: payRunId },
    include: {
      payslips: {
        where: { status: { not: "CANCELLED" } },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              uanNumber: true,
            },
          },
        },
        orderBy: { user: { fullName: "asc" } },
      },
    },
  });
  if (!payRun) {
    return NextResponse.json({ error: "Payrun not found" }, { status: 404 });
  }

  // Re-aggregate attendance per employee so we get the unpaid-leave count
  // separately — Payslip collapses paid+unpaid into one Float, but ECR
  // needs unpaid + absent for NCP days.
  const inputs: EcrInputRow[] = await Promise.all(
    payRun.payslips.map(async (slip) => {
      const decrypted = decryptPayslipMoney(slip);
      const att = await aggregateAttendanceForPeriod(
        slip.user.id,
        payRun.month,
        payRun.year
      );
      const ncpDays = att.unpaidLeaves + att.daysAbsent;
      return {
        uan: slip.user.uanNumber,
        fullName: slip.user.fullName,
        basicPaise: decrypted.basic,
        grossEarnedPaise: decrypted.grossEarned,
        employeePfPaise: decrypted.employeePf,
        employerPfPaise: decrypted.employerPf,
        ncpDays,
      };
    })
  );

  const result = buildEcrFile(inputs);
  const filename = ecrFileName(payRun.month, payRun.year);

  // Surface skipped employees in a header so the UI can show a toast if
  // any rows were dropped (no UAN, bad format). The actual download is
  // still the file body.
  const skippedHeader = result.skipped
    .map((s) => `${s.fullName}: ${s.reason}`)
    .join("; ");

  return new NextResponse(result.fileBody, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-ECR-Row-Count": String(result.rowCount),
      "X-ECR-Skipped-Count": String(result.skipped.length),
      ...(skippedHeader ? { "X-ECR-Skipped": skippedHeader } : {}),
    },
  });
}
