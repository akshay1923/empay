"use server";

import { z } from "zod";
import { eachDayOfInterval, format, isSunday } from "date-fns";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaveStatus, LeaveType } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { sendLeaveDecisionEmail } from "@/lib/mailer";

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  CASUAL: "Casual leave",
  SICK: "Sick leave",
  EARNED: "Earned leave",
  UNPAID: "Unpaid leave",
};

function countLeaveDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isSunday(d)).length;
}

const decideSchema = z.object({
  leaveId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
});

export async function decideLeave(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "leave_approve", "update");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const data = decideSchema.parse(input);
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: data.leaveId },
      include: {
        user: { select: { email: true, fullName: true } },
      },
    });
    if (!leave) {
      return { success: false as const, error: "Leave request not found" };
    }
    if (leave.status !== "PENDING") {
      return {
        success: false as const,
        error: `Leave is already ${leave.status.toLowerCase()}`,
      };
    }

    if (data.decision === "REJECT") {
      await prisma.leaveRequest.update({
        where: { id: data.leaveId },
        data: {
          status: LeaveStatus.REJECTED,
          approvedById: session.user.id,
          approvedAt: new Date(),
          rejectionReason: data.reason ?? null,
        },
      });
      revalidatePath("/admin/timeoff");
      revalidatePath("/hr/leaves");
      // Send the email after the response flushes. `after()` keeps the
      // serverless lambda alive long enough on Vercel and is a no-op on
      // a long-lived Node server (just runs after the response).
      after(async () => {
        try {
          await sendLeaveDecisionEmail({
            to: leave.user.email,
            fullName: leave.user.fullName,
            decision: "REJECT",
            leaveTypeLabel: LEAVE_TYPE_LABEL[leave.leaveType],
            startDate: format(leave.startDate, "yyyy-MM-dd"),
            endDate: format(leave.endDate, "yyyy-MM-dd"),
            totalDays: leave.totalDays,
            reason: data.reason,
            approverName: session.user.name,
          });
        } catch (err) {
          console.error("[leave-email] reject notification failed:", err);
        }
      });
      return { success: true as const };
    }

    // APPROVE — balance check first (skip for UNPAID).
    if (leave.leaveType !== "UNPAID") {
      const year = leave.startDate.getFullYear();
      const allocation = await prisma.leaveAllocation.findUnique({
        where: {
          userId_leaveType_year: {
            userId: leave.userId,
            leaveType: leave.leaveType,
            year,
          },
        },
      });
      const taken = await prisma.leaveRequest.aggregate({
        where: {
          userId: leave.userId,
          leaveType: leave.leaveType,
          status: "APPROVED",
          startDate: { gte: new Date(year, 0, 1) },
          endDate: { lt: new Date(year + 1, 0, 1) },
        },
        _sum: { totalDays: true },
      });
      const available =
        (allocation?.totalDays ?? 0) - (taken._sum.totalDays ?? 0);
      if (available < leave.totalDays) {
        return {
          success: false as const,
          error: `Insufficient ${leave.leaveType} balance. Available ${available}, requested ${leave.totalDays}.`,
        };
      }
    }

    await prisma.leaveRequest.update({
      where: { id: data.leaveId },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });
    revalidatePath("/admin/timeoff");
    revalidatePath("/hr/leaves");
    after(async () => {
      try {
        await sendLeaveDecisionEmail({
          to: leave.user.email,
          fullName: leave.user.fullName,
          decision: "APPROVE",
          leaveTypeLabel: LEAVE_TYPE_LABEL[leave.leaveType],
          startDate: format(leave.startDate, "yyyy-MM-dd"),
          endDate: format(leave.endDate, "yyyy-MM-dd"),
          totalDays: leave.totalDays,
          approverName: session.user.name,
        });
      } catch (err) {
        console.error("[leave-email] approve notification failed:", err);
      }
    });
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

const onBehalfSchema = z
  .object({
    userId: z.string().min(1),
    leaveType: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(3, "Reason must be at least 3 characters"),
    autoApprove: z.boolean().optional(),
  })
  .refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export async function createLeaveOnBehalf(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "leave_request", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const data = onBehalfSchema.parse(input);
    const start = new Date(data.startDate + "T00:00:00.000Z");
    const end = new Date(data.endDate + "T00:00:00.000Z");

    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        userId: data.userId,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
      },
    });
    if (overlap) {
      return {
        success: false as const,
        error: "Employee already has a leave overlapping this period",
      };
    }

    const totalDays = countLeaveDays(start, end);
    if (totalDays === 0) {
      return {
        success: false as const,
        error: "Selected range covers only Sundays",
      };
    }

    await prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        leaveType: data.leaveType as LeaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason: data.reason,
        status: data.autoApprove
          ? LeaveStatus.APPROVED
          : LeaveStatus.PENDING,
        ...(data.autoApprove
          ? {
              approvedById: session.user.id,
              approvedAt: new Date(),
            }
          : {}),
      },
    });

    revalidatePath("/admin/timeoff");
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

const allocationSchema = z.object({
  userId: z.string().min(1),
  leaveType: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID"]),
  totalDays: z.number().nonnegative(),
  year: z.number().int().min(2000).max(2100),
});

export async function upsertLeaveAllocation(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "leave_balance_allocate", "create");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const data = allocationSchema.parse(input);
    await prisma.leaveAllocation.upsert({
      where: {
        userId_leaveType_year: {
          userId: data.userId,
          leaveType: data.leaveType as LeaveType,
          year: data.year,
        },
      },
      create: {
        userId: data.userId,
        leaveType: data.leaveType as LeaveType,
        year: data.year,
        totalDays: data.totalDays,
        allocatedById: session.user.id,
      },
      update: {
        totalDays: data.totalDays,
        allocatedById: session.user.id,
      },
    });

    revalidatePath("/admin/timeoff");
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
