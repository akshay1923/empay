"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"]),
});

export async function updateUserRole(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    requirePermission(session.user.role, "user", "update");
  } catch {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const data = updateRoleSchema.parse(input);

    if (data.userId === session.user.id) {
      return {
        success: false as const,
        error: "You can't change your own role. Ask another admin to do it.",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return { success: false as const, error: "User not found" };
    }
    if (target.role === data.role) {
      return { success: false as const, error: "Role is already set to that value" };
    }

    // Don't leave the workspace without an admin.
    if (target.role === "ADMIN" && data.role !== "ADMIN") {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN", isActive: true, id: { not: target.id } },
      });
      if (otherAdmins === 0) {
        return {
          success: false as const,
          error: "This is the last active admin. Promote another user to admin first.",
        };
      }
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role as Role },
    });

    revalidatePath("/admin/settings");
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
