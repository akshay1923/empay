"use server";

import { z } from "zod";
import { startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

const markSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY"]),
  notes: z.string().optional(),
});

export async function markAttendance(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const data = markSchema.parse(input);
    const today = startOfDay(new Date());
    today.setUTCHours(0, 0, 0, 0);

    const conflict = await prisma.leaveRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });
    if (conflict) {
      return {
        success: false as const,
        error: "You have an approved leave today. Cannot mark attendance.",
      };
    }

    await prisma.attendance.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      update: { status: data.status as AttendanceStatus, notes: data.notes },
      create: {
        userId: session.user.id,
        date: today,
        status: data.status as AttendanceStatus,
        notes: data.notes,
      },
    });

    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/attendance");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
