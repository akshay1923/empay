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

function countLeaveDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isSunday(d)).length;
}

const applySchema = z
  .object({
    leaveType: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID"]),
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
    const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave || leave.userId !== session.user.id) {
      return { success: false as const, error: "Not found" };
    }
    if (leave.status !== "PENDING") {
      return { success: false as const, error: "Only pending leaves can be cancelled" };
    }
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status: LeaveStatus.CANCELLED },
    });
    revalidatePath("/employee/attendance");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
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
