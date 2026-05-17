"use server";

import { z } from "zod";
import { eachDayOfInterval, isSunday } from "date-fns";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaveStatus, LeaveType } from "@prisma/client";
import { aggregateAttendanceForPeriod } from "@/lib/payroll/aggregate-period";
import { type PayrollOutput } from "@/lib/payroll/calculate";
import {
  computeLeaveImpact,
  type SalaryInputs,
} from "@/lib/payroll/leave-preview";
import { decryptInt } from "@/lib/crypto/payroll";
import { can } from "@/lib/auth/permissions";
import {
  listAvailableCredits,
  pickFifoCredits,
} from "@/lib/compoff";

function countLeaveDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isSunday(d)).length;
}

const applySchema = z
  .object({
    leaveType: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID", "COMP_OFF"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().min(3, "Reason must be at least 3 characters"),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

const ALLOWED_RECEIPT_EXT = ["jpg", "jpeg", "png", "pdf", "webp"];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB

export async function applyLeave(formData: FormData) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  try {
    const parsed = applySchema.parse({
      leaveType: formData.get("leaveType"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      reason: formData.get("reason"),
    });

    const receiptEntry = formData.get("receipt");
    const receipt =
      receiptEntry instanceof File && receiptEntry.size > 0
        ? receiptEntry
        : null;

    if (parsed.leaveType === "SICK" && !receipt) {
      return {
        success: false as const,
        error: "Medical receipt is required for sick leave",
      };
    }

    if (receipt) {
      if (receipt.size > MAX_RECEIPT_BYTES) {
        return {
          success: false as const,
          error: "Receipt must be under 5 MB",
        };
      }
      const ext = (receipt.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_RECEIPT_EXT.includes(ext)) {
        return {
          success: false as const,
          error: "Receipt must be a JPG, PNG, WEBP, or PDF",
        };
      }
    }

    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [
          { startDate: { lte: parsed.endDate } },
          { endDate: { gte: parsed.startDate } },
        ],
      },
    });
    if (overlap) {
      return {
        success: false as const,
        error: "You already have a leave in this period",
      };
    }

    const totalDays = countLeaveDays(parsed.startDate, parsed.endDate);
    if (totalDays === 0) {
      return {
        success: false as const,
        error: "Selected range covers only Sundays",
      };
    }

    // COMP_OFF: balance check goes against credits, not LeaveAllocation.
    // We pre-check at apply time so the user sees the shortfall early;
    // the authoritative consumption happens inside decideLeave's
    // transaction.
    if (parsed.leaveType === "COMP_OFF") {
      const credits = await listAvailableCredits(
        prisma,
        session.user.id,
        parsed.startDate
      );
      const pick = pickFifoCredits(credits, totalDays, parsed.startDate);
      if (!pick.ok) {
        const have = pick.available;
        return {
          success: false as const,
          error: `Insufficient comp-off credits. Need ${totalDays}, have ${have}. Short by ${pick.shortfall}.`,
        };
      }
    }

    let receiptUrl: string | null = null;
    let receiptName: string | null = null;
    if (receipt) {
      const ext = (receipt.name.split(".").pop() ?? "").toLowerCase();
      const filename = `${randomUUID()}.${ext}`;
      const dir = path.join(process.cwd(), "public", "uploads", "leaves");
      await fs.mkdir(dir, { recursive: true });
      const buffer = Buffer.from(await receipt.arrayBuffer());
      await fs.writeFile(path.join(dir, filename), buffer);
      receiptUrl = `/uploads/leaves/${filename}`;
      receiptName = receipt.name;
    }

    await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        leaveType: parsed.leaveType as LeaveType,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        totalDays,
        reason: parsed.reason,
        status: LeaveStatus.PENDING,
        receiptUrl,
        receiptName,
      },
    });

    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/timeoff");
    revalidatePath("/hr/leaves");
    return { success: true as const };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return {
        success: false as const,
        error: e.issues[0]?.message ?? "Invalid input",
      };
    }
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function cancelLeave(leaveId: string) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { compOffCredits: true },
    });
    if (!leave || leave.userId !== session.user.id) {
      return { success: false as const, error: "Not found" };
    }
    if (leave.status !== "PENDING" && leave.status !== "APPROVED") {
      return { success: false as const, error: "Only pending or approved leaves can be cancelled" };
    }

    // COMP_OFF cancellation: release linked credits, but only if they
    // haven't expired in the interim. An expired credit is a permanent
    // forfeit per the spec; surface that to the user.
    if (
      leave.leaveType === "COMP_OFF" &&
      leave.status === "APPROVED" &&
      leave.compOffCredits.length > 0
    ) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const expired = leave.compOffCredits.filter(
        (c) => c.expiresOn.getTime() < today.getTime()
      );
      if (expired.length > 0) {
        return {
          success: false as const,
          error:
            `Cannot cancel: ${expired.length} comp-off credit(s) backing this ` +
            `leave have expired and cannot be restored.`,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: leaveId },
        data: { status: LeaveStatus.CANCELLED },
      });
      if (leave.leaveType === "COMP_OFF" && leave.compOffCredits.length > 0) {
        await tx.compOffCredit.updateMany({
          where: { redeemedById: leave.id },
          data: {
            redeemedById: null,
            redeemedAt: null,
            redeemedFraction: 0,
          },
        });
      }
    });
    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Live payslip-impact preview for the leave-application form.
// ---------------------------------------------------------------------------

const previewSchema = z
  .object({
    userId: z.string().min(1).optional(),
    leaveType: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID", "COMP_OFF"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type PreviewMoney = {
  daysPayable: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarned: number;
  employeePf: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
};

export type PreviewBalance = {
  leaveType: LeaveType;
  year: number;
  allocated: number;
  used: number;
  available: number;
  projectedUsed: number;
  projectedAvailable: number;
};

export type LeaveImpactPreview =
  | { success: false; error: string }
  | {
      success: true;
      month: number;
      year: number;
      requestedTotalDays: number;
      requestedDaysInMonth: number;
      multiMonth: boolean;
      before: PreviewMoney;
      after: PreviewMoney;
      delta: {
        daysPayable: number;
        grossEarned: number;
        employeePf: number;
        netPay: number;
      };
      balance: PreviewBalance | null;
      exceedsBalance: boolean;
      unpaidFallback: {
        after: PreviewMoney;
        delta: {
          daysPayable: number;
          grossEarned: number;
          employeePf: number;
          netPay: number;
        };
      } | null;
    };

function toPreviewMoney(out: PayrollOutput): PreviewMoney {
  return {
    daysPayable: out.daysPayable,
    basic: out.basic,
    hra: out.hra,
    specialAllowance: out.specialAllowance,
    grossEarned: out.grossEarned,
    employeePf: out.employeePf,
    professionalTax: out.professionalTax,
    totalDeductions: out.totalDeductions,
    netPay: out.netPay,
  };
}

/**
 * Counts how many days inside [start, end] fall in `month`/`year` and are not
 * Sundays. This is the number of days the prospective leave would affect the
 * payroll *for that month*. Multi-month leaves are explicitly out of scope —
 * we just preview the impact on the start-month payslip.
 */
function countLeaveDaysInMonth(
  start: Date,
  end: Date,
  month: number,
  year: number
): number {
  let n = 0;
  for (const d of eachDayOfInterval({ start, end })) {
    if (isSunday(d)) continue;
    if (d.getUTCMonth() + 1 === month && d.getUTCFullYear() === year) {
      n++;
    }
  }
  return n;
}

export async function previewLeaveImpact(
  input: unknown
): Promise<LeaveImpactPreview> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  let parsed: z.infer<typeof previewSchema>;
  try {
    parsed = previewSchema.parse(input);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0]?.message ?? "Invalid input" };
    }
    return { success: false, error: "Invalid input" };
  }

  // Default the target to the calling user — for the on-behalf form, callers
  // pass an explicit userId and need leave_request:create on top.
  const targetUserId = parsed.userId ?? session.user.id;
  if (targetUserId !== session.user.id) {
    if (!can(session.user.role, "leave_request", "create")) {
      return { success: false, error: "Forbidden" };
    }
  }

  // Parse dates as UTC midnight so month boundary math matches the schema's
  // date-only columns and the rest of the codebase.
  const start = new Date(parsed.startDate + "T00:00:00.000Z");
  const end = new Date(parsed.endDate + "T00:00:00.000Z");

  const month = start.getUTCMonth() + 1;
  const year = start.getUTCFullYear();
  const multiMonth =
    end.getUTCMonth() + 1 !== month || end.getUTCFullYear() !== year;

  const requestedTotalDays = countLeaveDays(start, end);
  const requestedDaysInMonth = countLeaveDaysInMonth(start, end, month, year);

  // Active salary structure.
  const struct = await prisma.salaryStructure.findFirst({
    where: { userId: targetUserId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!struct) {
    return { success: false, error: "No active salary structure" };
  }
  let ctcAnnual: number;
  try {
    ctcAnnual = decryptInt(struct.ctcAnnual);
  } catch {
    return { success: false, error: "Could not read salary structure" };
  }

  // Current month's stats (already accounts for approved leaves + attendance).
  const att = await aggregateAttendanceForPeriod(targetUserId, month, year);

  const salary: SalaryInputs = {
    ctcAnnual,
    basicPercent: struct.basicPercent,
    hraPercent: struct.hraPercent,
    pfEmployeePercent: struct.pfEmployeePercent,
    pfEmployerPercent: struct.pfEmployerPercent,
    professionalTax: struct.professionalTax,
  };

  const { before, after } = computeLeaveImpact(salary, att, {
    kind: parsed.leaveType === "UNPAID" ? "unpaid" : "paid",
    daysInMonth: requestedDaysInMonth,
  });

  // Leave-balance projection (only meaningful for paid types).
  let balance: PreviewBalance | null = null;
  let exceedsBalance = false;
  if (parsed.leaveType === "COMP_OFF") {
    // Comp-off "allocation" is the sum of un-expired credits, "used" is the
    // sum of redeemed credits in the year. There is no LeaveAllocation row.
    const credits = await prisma.compOffCredit.findMany({
      where: { userId: targetUserId, revokedAt: null },
      select: {
        earnedFraction: true,
        expiresOn: true,
        redeemedFraction: true,
        redeemedById: true,
        earnedOn: true,
      },
    });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const available = credits
      .filter(
        (c) => c.redeemedById === null && c.expiresOn.getTime() >= today.getTime()
      )
      .reduce((s, c) => s + c.earnedFraction, 0);
    const used = credits.reduce((s, c) => s + (c.redeemedFraction ?? 0), 0);
    const allocated = available + used;
    const projectedUsed = used + requestedTotalDays;
    const projectedAvailable = available - requestedTotalDays;
    exceedsBalance = projectedAvailable < 0;
    balance = {
      leaveType: "COMP_OFF" as LeaveType,
      year,
      allocated,
      used,
      available,
      projectedUsed,
      projectedAvailable,
    };
  } else if (parsed.leaveType !== "UNPAID") {
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1));
    const [allocation, takenAgg] = await Promise.all([
      prisma.leaveAllocation.findUnique({
        where: {
          userId_leaveType_year: {
            userId: targetUserId,
            leaveType: parsed.leaveType as LeaveType,
            year,
          },
        },
      }),
      prisma.leaveRequest.aggregate({
        where: {
          userId: targetUserId,
          leaveType: parsed.leaveType as LeaveType,
          status: "APPROVED",
          startDate: { gte: startOfYear },
          endDate: { lt: startOfNextYear },
        },
        _sum: { totalDays: true },
      }),
    ]);
    const allocated = allocation?.totalDays ?? 0;
    const used = takenAgg._sum.totalDays ?? 0;
    const available = allocated - used;
    const projectedUsed = used + requestedTotalDays;
    const projectedAvailable = allocated - projectedUsed;
    exceedsBalance = projectedAvailable < 0;
    balance = {
      leaveType: parsed.leaveType as LeaveType,
      year,
      allocated,
      used,
      available,
      projectedUsed,
      projectedAvailable,
    };
  }

  // If a paid leave would exceed the available balance, compute the cost of
  // the same range as UNPAID so the card can suggest the fallback with a
  // real number rather than a hand-wave.
  let fallback: {
    after: PreviewMoney;
    delta: {
      daysPayable: number;
      grossEarned: number;
      employeePf: number;
      netPay: number;
    };
  } | null = null;
  // Comp-off is all-or-nothing: never offer the "go unpaid for the gap"
  // fallback. The UI surfaces a simple shortfall message instead.
  if (
    parsed.leaveType !== "UNPAID" &&
    parsed.leaveType !== "COMP_OFF" &&
    exceedsBalance
  ) {
    const { after: fallbackAfter } = computeLeaveImpact(salary, att, {
      kind: "unpaid",
      daysInMonth: requestedDaysInMonth,
    });
    fallback = {
      after: toPreviewMoney(fallbackAfter),
      delta: {
        daysPayable: fallbackAfter.daysPayable - before.daysPayable,
        grossEarned: fallbackAfter.grossEarned - before.grossEarned,
        employeePf: fallbackAfter.employeePf - before.employeePf,
        netPay: fallbackAfter.netPay - before.netPay,
      },
    };
  }

  return {
    success: true,
    month,
    year,
    requestedTotalDays,
    requestedDaysInMonth,
    multiMonth,
    before: toPreviewMoney(before),
    after: toPreviewMoney(after),
    delta: {
      daysPayable: after.daysPayable - before.daysPayable,
      grossEarned: after.grossEarned - before.grossEarned,
      employeePf: after.employeePf - before.employeePf,
      netPay: after.netPay - before.netPay,
    },
    balance,
    exceedsBalance,
    unpaidFallback: fallback,
  };
}

export async function getMyLeaveBalance(year: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const allocations = await prisma.leaveAllocation.findMany({
    where: { userId: session.user.id, year },
  });
  const taken = await prisma.leaveRequest.groupBy({
    by: ["leaveType"],
    where: {
      userId: session.user.id,
      status: "APPROVED",
      startDate: { gte: new Date(`${year}-01-01`) },
      endDate: { lte: new Date(`${year}-12-31`) },
    },
    _sum: { totalDays: true },
  });
  return allocations.map((a) => {
    const used = taken.find((t) => t.leaveType === a.leaveType)?._sum.totalDays ?? 0;
    return {
      leaveType: a.leaveType,
      allocated: a.totalDays,
      used,
      available: a.totalDays - used,
    };
  });
}

export type CompOffCreditSummary = {
  id: string;
  earnedOn: string;
  earnedFraction: number;
  expiresOn: string;
  daysToExpiry: number;
};

export type CompOffBalance = {
  available: number;
  totalEarned: number;
  totalRedeemed: number;
  credits: CompOffCreditSummary[];
};

/**
 * Aggregate comp-off credits for the dashboard tile: per-credit list, total
 * available (sum of un-redeemed, un-revoked, un-expired earnedFraction), and
 * lifetime totals for the small "earned / redeemed" sub-label.
 */
export async function getMyCompOffBalance(): Promise<CompOffBalance> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.compOffCredit.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { earnedOn: "asc" },
  });

  const live = rows.filter(
    (r) => r.redeemedById === null && r.expiresOn.getTime() >= today.getTime()
  );

  const available = live.reduce((s, r) => s + r.earnedFraction, 0);
  const totalEarned = rows.reduce((s, r) => s + r.earnedFraction, 0);
  const totalRedeemed = rows.reduce((s, r) => s + (r.redeemedFraction ?? 0), 0);

  const credits: CompOffCreditSummary[] = live.map((r) => ({
    id: r.id,
    earnedOn: r.earnedOn.toISOString().slice(0, 10),
    earnedFraction: r.earnedFraction,
    expiresOn: r.expiresOn.toISOString().slice(0, 10),
    daysToExpiry: Math.round(
      (r.expiresOn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return { available, totalEarned, totalRedeemed, credits };
}
