"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { grantCompOffIfWeekendWork } from "@/lib/compoff";

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The Attendance row's `date` column is a Date keyed at UTC midnight, so
// "today" depends on which clock you ask. The client knows the employee's
// wall-clock day (a developer in PT checking in at 11pm should land on
// today's row, not tomorrow's UTC row), so we let the browser tell us.
// Fall back to UTC when the caller doesn't pass a local date.
function resolveLocalDate(localDate: string | undefined): Date {
  if (localDate && LOCAL_DATE.test(localDate)) {
    return new Date(localDate + "T00:00:00.000Z");
  }
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function checkIn(localDate?: string) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const date = resolveLocalDate(localDate);
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });

  if (existing?.checkInAt) {
    return { success: false as const, error: "Already checked in today" };
  }

  await prisma.attendance.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { status: "PRESENT", checkInAt: now },
    create: {
      userId: session.user.id,
      date,
      status: "PRESENT",
      checkInAt: now,
    },
  });

  // Same trigger as the explicit "mark attendance" flow — a Sunday/holiday
  // check-in earns a comp-off credit.
  await grantCompOffIfWeekendWork(prisma, session.user.id, date, "PRESENT");

  revalidatePath("/", "layout");
  return { success: true as const };
}

export async function checkOut(localDate?: string) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const date = resolveLocalDate(localDate);
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });

  if (!existing?.checkInAt) {
    return { success: false as const, error: "Check in first" };
  }
  if (existing.checkOutAt) {
    return { success: false as const, error: "Already checked out today" };
  }

  await prisma.attendance.update({
    where: { userId_date: { userId: session.user.id, date } },
    data: { checkOutAt: now },
  });

  revalidatePath("/", "layout");
  return { success: true as const };
}
