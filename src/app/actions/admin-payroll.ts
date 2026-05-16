"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { aggregateAttendanceForPeriod } from "@/lib/payroll/aggregate-period";
import { calculatePayroll } from "@/lib/payroll/calculate";
import {
  decryptInt,
  encryptPayslipMoney,
} from "@/lib/crypto/payroll";

const runSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  replace: z.boolean().optional(),
});

type PendingPayslip = {
  userId: string;
  ctcAnnual: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
  employerPf: number;
  totalWorkingDays: number;
  daysPresent: number;
  daysOnLeave: number;
  daysAbsent: number;
  daysPayable: number;
};

type SimulationWarning = {
  userId: string;
  name: string;
  severity: "warn";
  reason: string;
};

type SimulationResult = {
  pending: (PendingPayslip & { name: string })[];
  skipped: { userId: string; name: string; reason: string }[];
  warnings: SimulationWarning[];
  totals: {
    gross: number;
    net: number;
    deductions: number;
    employerCost: number;
  };
  existing: { id: string; status: "DRAFT" | "PROCESSED" | "PAID" } | null;
};

/**
 * Compute a payroll period without writing to the DB. Used by both `runPayroll`
 * (which then commits) and `dryRunPayroll` (which returns the preview).
 */
async function simulatePayrollPeriod(
  month: number,
  year: number
): Promise<SimulationResult> {
  const existing = await prisma.payRun.findUnique({
    where: { month_year: { month, year } },
    select: { id: true, status: true },
  });

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    include: {
      salaryStructures: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });

  const pending: (PendingPayslip & { name: string })[] = [];
  const skipped: { userId: string; name: string; reason: string }[] = [];
  const warnings: SimulationWarning[] = [];
  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;
  let totalEmployerCost = 0;

  for (const emp of employees) {
    const struct = emp.salaryStructures[0];
    const ctcAnnual = struct ? decryptInt(struct.ctcAnnual) : 0;
    if (!struct || ctcAnnual <= 0) {
      skipped.push({
        userId: emp.id,
        name: emp.fullName,
        reason: "No active salary structure",
      });
      continue;
    }

    const att = await aggregateAttendanceForPeriod(emp.id, month, year);
    const out = calculatePayroll({
      ctcAnnual,
      basicPercent: struct.basicPercent,
      hraPercent: struct.hraPercent,
      pfEmployeePercent: struct.pfEmployeePercent,
      pfEmployerPercent: struct.pfEmployerPercent,
      professionalTax: struct.professionalTax,
      totalWorkingDays: att.totalWorkingDays,
      daysPresent: att.daysPresent,
      halfDays: att.halfDays,
      paidLeaves: att.paidLeaves,
      unpaidLeaves: att.unpaidLeaves,
    });

    pending.push({
      userId: emp.id,
      name: emp.fullName,
      ctcAnnual,
      basic: out.basic,
      hra: out.hra,
      specialAllowance: out.specialAllowance,
      grossEarned: out.grossEarned,
      employeePf: out.employeePf,
      professionalTax: out.professionalTax,
      totalDeductions: out.totalDeductions,
      netPay: out.netPay,
      employerPf: out.employerPf,
      totalWorkingDays: att.totalWorkingDays,
      daysPresent: att.daysPresent + att.halfDays * 0.5,
      daysOnLeave: att.paidLeaves + att.unpaidLeaves,
      daysAbsent: att.daysAbsent,
      daysPayable: out.daysPayable,
    });

    // Soft warnings — payroll still computes, but a human should glance at these.
    if (att.totalWorkingDays > 0 && att.daysAbsent === att.totalWorkingDays) {
      warnings.push({
        userId: emp.id,
        name: emp.fullName,
        severity: "warn",
        reason:
          "Marked absent every working day — attendance may not have been recorded",
      });
    } else if (out.daysPayable === 0) {
      warnings.push({
        userId: emp.id,
        name: emp.fullName,
        severity: "warn",
        reason: "Zero payable days (all unpaid leave or absent)",
      });
    } else if (out.netPay === 0) {
      warnings.push({
        userId: emp.id,
        name: emp.fullName,
        severity: "warn",
        reason: "Net pay is ₹0 — deductions exceed earned wage",
      });
    }

    totalGross += out.grossEarned;
    totalNet += out.netPay;
    totalDeductions += out.totalDeductions;
    totalEmployerCost += out.grossEarned + out.employerPf;
  }

  return {
    pending,
    skipped,
    warnings,
    totals: {
      gross: totalGross,
      net: totalNet,
      deductions: totalDeductions,
      employerCost: totalEmployerCost,
    },
    existing,
  };
}

export async function dryRunPayroll(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }
  try {
    const { month, year } = runSchema.parse(input);
    const sim = await simulatePayrollPeriod(month, year);
    return {
      success: true as const,
      month,
      year,
      monthLabel: monthLabel(month),
      ...sim,
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function runPayroll(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const { month, year, replace } = runSchema.parse(input);

    const sim = await simulatePayrollPeriod(month, year);
    const existing = sim.existing;
    if (existing && !replace) {
      return {
        success: false as const,
        error: `A payrun for ${monthLabel(month)} ${year} already exists. Open it from the Dashboard or re-run to replace.`,
        existingId: existing.id,
      };
    }
    if (existing && existing.status === "PAID") {
      return {
        success: false as const,
        error: `Payrun for ${monthLabel(month)} ${year} is already validated. Validated payruns cannot be replaced.`,
      };
    }

    const { pending, skipped, totals } = sim;
    const totalGross = totals.gross;
    const totalNet = totals.net;
    const totalDeductions = totals.deductions;
    const totalEmployerCost = totals.employerCost;

    if (pending.length === 0) {
      return {
        success: false as const,
        error:
          "No employees with an active salary structure to run payroll for.",
        skipped: skipped.map((s) => ({ name: s.name, reason: s.reason })),
      };
    }

    // Strip the `name` field before persisting — payslip rows don't carry it.
    // Money fields are encrypted at rest; see lib/crypto/payroll.ts.
    const pendingForDb = pending.map(({ name: _name, ...rest }) =>
      encryptPayslipMoney(rest)
    );

    const payRunId = await prisma.$transaction(async (tx) => {
      if (existing) {
        // Replace: drop the old payslips, then update totals.
        await tx.payslip.deleteMany({ where: { payRunId: existing.id } });
        await tx.payRun.update({
          where: { id: existing.id },
          data: {
            status: "DRAFT",
            totalGross,
            totalNet,
            totalDeductions,
            totalEmployerCost,
            processedAt: null,
            processedById: null,
          },
        });
        await tx.payslip.createMany({
          data: pendingForDb.map((p) => ({ ...p, payRunId: existing.id })),
        });
        return existing.id;
      }
      const created = await tx.payRun.create({
        data: {
          month,
          year,
          status: "DRAFT",
          totalGross,
          totalNet,
          totalDeductions,
          totalEmployerCost,
        },
      });
      await tx.payslip.createMany({
        data: pendingForDb.map((p) => ({ ...p, payRunId: created.id })),
      });
      return created.id;
    });

    revalidatePath("/admin/payroll");
    return {
      success: true as const,
      payRunId,
      generated: pending.length,
      skipped: skipped.map((s) => ({ name: s.name, reason: s.reason })),
      totals: {
        gross: totalGross,
        net: totalNet,
        deductions: totalDeductions,
        employerCost: totalEmployerCost,
      },
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

const validateSchema = z.object({ payRunId: z.string().min(1) });

export async function validatePayRun(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }
  try {
    const { payRunId } = validateSchema.parse(input);
    const pr = await prisma.payRun.findUnique({ where: { id: payRunId } });
    if (!pr) return { success: false as const, error: "Payrun not found" };
    if (pr.status === "PAID") {
      return { success: false as const, error: "Payrun is already validated" };
    }
    const now = new Date();
    await prisma.$transaction([
      prisma.payslip.updateMany({
        where: { payRunId, status: "DRAFT" },
        data: {
          status: "VALIDATED",
          validatedAt: now,
          validatedById: session.user.id,
        },
      }),
      prisma.payRun.update({
        where: { id: payRunId },
        data: {
          status: "PAID",
          processedAt: now,
          processedById: session.user.id,
        },
      }),
    ]);
    revalidatePath("/admin/payroll");
    return { success: true as const };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

const slipSchema = z.object({ payslipId: z.string().min(1) });

export async function validatePayslip(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }
  try {
    const { payslipId } = slipSchema.parse(input);
    const slip = await prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!slip) return { success: false as const, error: "Payslip not found" };
    if (slip.status === "VALIDATED") {
      return { success: false as const, error: "Payslip is already validated" };
    }
    if (slip.status === "CANCELLED") {
      return {
        success: false as const,
        error: "Cancelled payslips can't be validated",
      };
    }
    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: "VALIDATED",
        validatedAt: new Date(),
        validatedById: session.user.id,
        cancelledAt: null,
        cancelledById: null,
        cancellationReason: null,
      },
    });
    revalidatePath("/admin/payroll");
    revalidatePath(`/admin/payroll/payslips/${payslipId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

const cancelSchema = z.object({
  payslipId: z.string().min(1),
  reason: z.string().optional(),
});

export async function cancelPayslip(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }
  try {
    const { payslipId, reason } = cancelSchema.parse(input);
    const slip = await prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!slip) return { success: false as const, error: "Payslip not found" };
    if (slip.status === "CANCELLED") {
      return { success: false as const, error: "Payslip is already cancelled" };
    }
    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: session.user.id,
        cancellationReason: reason ?? null,
        validatedAt: null,
        validatedById: null,
      },
    });
    revalidatePath("/admin/payroll");
    revalidatePath(`/admin/payroll/payslips/${payslipId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

const createPayslipSchema = z.object({
  userId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export async function createPayslip(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const data = createPayslipSchema.parse(input);

    const employee = await prisma.user.findUnique({
      where: { id: data.userId },
      include: {
        salaryStructures: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });
    if (!employee || employee.role !== "EMPLOYEE") {
      return { success: false as const, error: "Employee not found" };
    }
    if (!employee.isActive) {
      return { success: false as const, error: "Employee is inactive" };
    }
    const struct = employee.salaryStructures[0];
    const ctcAnnual = struct ? decryptInt(struct.ctcAnnual) : 0;
    if (!struct || ctcAnnual <= 0) {
      return {
        success: false as const,
        error: "Employee has no active salary structure",
      };
    }

    const att = await aggregateAttendanceForPeriod(employee.id, data.month, data.year);
    const out = calculatePayroll({
      ctcAnnual,
      basicPercent: struct.basicPercent,
      hraPercent: struct.hraPercent,
      pfEmployeePercent: struct.pfEmployeePercent,
      pfEmployerPercent: struct.pfEmployerPercent,
      professionalTax: struct.professionalTax,
      totalWorkingDays: att.totalWorkingDays,
      daysPresent: att.daysPresent,
      halfDays: att.halfDays,
      paidLeaves: att.paidLeaves,
      unpaidLeaves: att.unpaidLeaves,
    });

    const employerCost = out.grossEarned + out.employerPf;
    // Money fields are encrypted at rest. See lib/crypto/payroll.ts.
    const payslipBody = encryptPayslipMoney({
      ctcAnnual,
      basic: out.basic,
      hra: out.hra,
      specialAllowance: out.specialAllowance,
      grossEarned: out.grossEarned,
      employeePf: out.employeePf,
      professionalTax: out.professionalTax,
      totalDeductions: out.totalDeductions,
      netPay: out.netPay,
      employerPf: out.employerPf,
      totalWorkingDays: att.totalWorkingDays,
      daysPresent: att.daysPresent + att.halfDays * 0.5,
      daysOnLeave: att.paidLeaves + att.unpaidLeaves,
      daysAbsent: att.daysAbsent,
      daysPayable: out.daysPayable,
    });

    try {
      const payslipId = await prisma.$transaction(async (tx) => {
        const existingRun = await tx.payRun.findUnique({
          where: { month_year: { month: data.month, year: data.year } },
        });

        if (!existingRun) {
          const created = await tx.payRun.create({
            data: {
              month: data.month,
              year: data.year,
              status: "DRAFT",
              totalGross: out.grossEarned,
              totalNet: out.netPay,
              totalDeductions: out.totalDeductions,
              totalEmployerCost: employerCost,
            },
          });
          const slip = await tx.payslip.create({
            data: { payRunId: created.id, userId: employee.id, ...payslipBody },
          });
          return slip.id;
        }

        if (existingRun.status === "PAID") {
          throw new Error(
            "Payrun for this month is already validated. Cannot add new payslips."
          );
        }

        const conflict = await tx.payslip.findUnique({
          where: {
            payRunId_userId: { payRunId: existingRun.id, userId: employee.id },
          },
        });
        if (conflict) {
          throw new Error(
            `${employee.fullName} already has a payslip in this payrun.`
          );
        }

        await tx.payRun.update({
          where: { id: existingRun.id },
          data: {
            totalGross: { increment: out.grossEarned },
            totalNet: { increment: out.netPay },
            totalDeductions: { increment: out.totalDeductions },
            totalEmployerCost: { increment: employerCost },
          },
        });
        const slip = await tx.payslip.create({
          data: { payRunId: existingRun.id, userId: employee.id, ...payslipBody },
        });
        return slip.id;
      });

      revalidatePath("/admin/payroll");
      return { success: true as const, payslipId };
    } catch (txErr) {
      return {
        success: false as const,
        error: txErr instanceof Error ? txErr.message : "Failed to create payslip",
      };
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false as const, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function deletePayRun(payRunId: string) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "payslip_generate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }
  try {
    const pr = await prisma.payRun.findUnique({ where: { id: payRunId } });
    if (!pr) return { success: false as const, error: "Payrun not found" };
    if (pr.status === "PAID") {
      return {
        success: false as const,
        error: "Validated payruns cannot be deleted",
      };
    }
    await prisma.payRun.delete({ where: { id: payRunId } });
    revalidatePath("/admin/payroll");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function monthLabel(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}
